/**
 * Data Ingestion Router for FinGuard Sentinel
 * Manual post submission and bulk CSV intake.
 */

import express from 'express';
import multer from 'multer';
import { CONFIG } from '../config.js';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';
import { preprocessText } from '../services/preprocess.js';
import { extractAllClues, computeDHashFromBuffer } from '../services/extractors.js';
import { evaluateRisk } from '../services/risk_engine.js';
import { alertService } from '../services/alerts.js';
import { computeSHA256 } from '../services/evidence.js';
import fs from 'fs';
import { performOcrScan } from '../services/ocr.js';

const upload = multer({ dest: CONFIG.UPLOADS_DIR });
export const ingestRouter = express.Router();

// POST /api/ingest/manual
ingestRouter.post('/manual', authenticateToken, upload.single('image'), async (req, res) => {
  const {
    text = '',
    platform = 'Manual Upload',
    username = 'investigator_submitted',
    city = 'National',
    language = 'English',
    sourceUrl = ''
  } = req.body;

  if (!text.trim()) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const adId = `MAN-${Date.now().toString().substring(6)}`;
  const contentHash = computeSHA256(`${platform}|${username}|${text}`);

  let ocrText = '';
  let phash = null;
  if (req.file) {
    try {
      const fileBuf = fs.readFileSync(req.file.path);
      phash = computeDHashFromBuffer(fileBuf);
      const ocrRes = await performOcrScan(fileBuf, req.file.mimetype);
      ocrText = ocrRes.rawText || '';
      console.log(`[Ingest] Real OCR extracted ${ocrText.length} characters using ${ocrRes.engine}`);
    } catch (ocrErr) {
      console.warn('[Ingest OCR error]:', ocrErr.message);
    }
  }

  const prep = preprocessText(text);
  const clues = extractAllClues(prep.cleanedText, {}, 'manual');

  const riskResult = evaluateRisk({
    text: prep.cleanedText,
    platform,
    username,
    profileAgeDays: 60,
    followers: 50,
    clues,
    ocrText,
    entityHistory: db.getAllEntities(),
    evasionDetected: prep.evasionDetected,
    evasions: prep.evasions
  });

  const newAd = {
    id: adId,
    platform,
    username,
    followers: 50,
    text: prep.cleanedText,
    image_paths: req.file ? [req.file.path] : [],
    ocr_text: ocrText,
    phash,
    posted_at: new Date().toISOString(),
    city,
    language,
    source_url: sourceUrl || `https://${platform.toLowerCase()}.com/manual/${adId}`,
    collected_at: new Date().toISOString(),
    content_hash: contentHash,
    clues,
    risk_score: riskResult.risk_score,
    risk_level: riskResult.risk_level,
    categories: riskResult.categories,
    ml_probability: riskResult.ml_probability,
    factor_breakdown: riskResult.factor_breakdown,
    summary: riskResult.summary,
    evasion_detected: prep.evasionDetected,
    evasions: prep.evasions,
    status: 'New'
  };

  db.addAd(newAd);
  alertService.processAdAlerts(newAd);

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'INGEST_MANUAL_POST',
    targetType: 'ad',
    targetId: adId,
    details: `Ingested manual post: ${riskResult.risk_level} (${riskResult.risk_score} pts)`
  });

  res.json({ success: true, ad: newAd });
});
