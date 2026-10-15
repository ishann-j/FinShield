/**
 * OCR Scanning Routes for FinShield Sentinel
 */

import express from 'express';
import multer from 'multer';
import { CONFIG } from '../config.js';
import { performOcrScan } from '../services/ocr.js';

export const ocrRouter = express.Router();

const upload = multer({
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  storage: multer.memoryStorage()
});

// GET /api/ocr/status
ocrRouter.get('/status', (req, res) => {
  res.json({
    geminiVisionAvailable: !!CONFIG.GEMINI_API_KEY,
    tesseractAvailable: true,
    activeModel: CONFIG.GEMINI_MODEL,
    message: CONFIG.GEMINI_API_KEY
      ? `Primary: Google Gemini Multimodal Vision (${CONFIG.GEMINI_MODEL}) · Secondary: Tesseract.js (Offline)`
      : 'Primary: Tesseract.js (Offline) · Add GEMINI_API_KEY for Gemini Vision AI'
  });
});

// POST /api/ocr/scan (supports multipart file OR JSON base64)
ocrRouter.post('/scan', upload.single('image'), async (req, res) => {
  try {
    let buffer = null;
    let mimeType = 'image/png';
    const engine = req.body.engine || 'auto';

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype || 'image/png';
    } else if (req.body.imageBase64 || req.body.image) {
      let rawBase64 = req.body.imageBase64 || req.body.image;
      
      // Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
      if (rawBase64.startsWith('data:')) {
        const matches = rawBase64.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          rawBase64 = matches[2];
        }
      }
      buffer = Buffer.from(rawBase64, 'base64');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'No image provided. Upload a file or send base64 image data.' });
    }

    const result = await performOcrScan(buffer, mimeType, { engine });
    res.json({
      ...result,
      text: result.rawText // compatibility alias
    });
  } catch (err) {
    console.error('[OCR Error]', err);
    res.status(500).json({ error: err.message || 'OCR extraction failed' });
  }
});
