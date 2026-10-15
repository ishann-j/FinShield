/**
 * Instant Live Analysis Sandbox Router for FinGuard Sentinel
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { CONFIG } from '../config.js';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';
import { preprocessText } from '../services/preprocess.js';
import { extractAllClues, computeDHashFromBuffer } from '../services/extractors.js';
import { evaluateRisk } from '../services/risk_engine.js';
import { buildEvidenceCard, computeSHA256 } from '../services/evidence.js';
import fs from 'fs';
import { analyzeAdWithGemini } from '../services/gemini.js';
import { performOcrScan } from '../services/ocr.js';

const upload = multer({
  dest: CONFIG.UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const analyzeRouter = express.Router();

// POST /api/analyze
analyzeRouter.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { text = '', url = '', platform = 'Direct Submission', username = 'investigator_test' } = req.body;

  let combinedText = text;
  let ocrText = '';
  let phash = null;

  // If image was uploaded, run real OCR
  if (req.file) {
    try {
      const fileBuf = fs.readFileSync(req.file.path);
      phash = computeDHashFromBuffer(fileBuf);
      const ocrRes = await performOcrScan(fileBuf, req.file.mimetype);
      ocrText = ocrRes.rawText || '';
      if (ocrText) {
        combinedText = `${text} ${ocrText}`.trim();
        console.log(`[Analyze] Real OCR extracted ${ocrText.length} characters using ${ocrRes.engine}`);
      }
    } catch (ocrErr) {
      console.warn('[Analyze OCR warning]:', ocrErr.message);
    }
  }

  // Preprocessing
  const prep = preprocessText(combinedText);

  // Clue Extraction
  const clues = extractAllClues(prep.cleanedText, {}, 'sandbox');

  // Evaluate Risk
  const riskResult = evaluateRisk({
    text: prep.cleanedText,
    platform,
    username,
    profileAgeDays: 30,
    followers: 120,
    clues,
    ocrText,
    entityHistory: db.getAllEntities(),
    evasionDetected: prep.evasionDetected,
    evasions: prep.evasions
  });

  // Construct Transient Ad object
  const adId = `SANDBOX-${Date.now().toString().substring(7)}`;
  const contentHash = computeSHA256(`${platform}|${username}|${prep.cleanedText}`);

  const transientAd = {
    id: adId,
    platform,
    username,
    posted_at: new Date().toISOString(),
    text: prep.cleanedText,
    ocr_text: ocrText,
    phash,
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
    status: 'Sandbox Analysis'
  };

  const evidence = buildEvidenceCard(transientAd, {
    entityHistory: db.getAllEntities(),
    currentUser: req.user
  });

  // Call Gemini AI for deep threat reasoning
  try {
    const gemini = await analyzeAdWithGemini(prep.cleanedText, { platform, username, url });
    evidence.gemini = gemini;
  } catch (geminiErr) {
    console.warn('[Gemini] Analyze enrichment skipped:', geminiErr.message);
  }

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'RUN_SANDBOX_ANALYSIS',
    targetType: 'sandbox',
    targetId: adId,
    details: `Evaluated custom post: Risk Score ${riskResult.risk_score} (${riskResult.risk_level})`
  });

    res.json({
      analysis: {
        ...transientAd,
        evidence
      }
    });
  } catch (err) {
    console.error('[Analyze Error]', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});
