/**
 * Gemini AI Route Handlers for FinShield Sentinel
 */

import express from 'express';
import { CONFIG } from '../config.js';
import { analyzeAdWithGemini, chatWithGemini, testAndSaveGeminiKey } from '../services/gemini.js';

export const geminiRouter = express.Router();

// GET /api/gemini/status
geminiRouter.get('/status', (req, res) => {
  res.json({
    configured: !!CONFIG.GEMINI_API_KEY,
    model: CONFIG.GEMINI_MODEL,
    message: CONFIG.GEMINI_API_KEY
      ? `Gemini AI live model active (${CONFIG.GEMINI_MODEL})`
      : 'Gemini AI running in smart heuristic simulation mode. Add GEMINI_API_KEY to .env to enable direct Google Cloud API.'
  });
});

// POST /api/gemini/set-key
geminiRouter.post('/set-key', async (req, res) => {
  try {
    const { apiKey, model = 'gemini-1.5-flash' } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'API key is required.' });
    }

    const result = await testAndSaveGeminiKey(apiKey, model);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Key validation failed.' });
  }
});

// POST /api/gemini/analyze
geminiRouter.post('/analyze', async (req, res) => {
  try {
    const { text = '', platform = 'Direct Submission', username = 'investigator_test', url = '' } = req.body;
    if (!text.trim() && !url.trim()) {
      return res.status(400).json({ error: 'Text or URL is required for analysis.' });
    }

    const analysis = await analyzeAdWithGemini(text, { platform, username, url });
    res.json({ ok: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gemini analysis failed' });
  }
});

// POST /api/gemini/chat
geminiRouter.post('/chat', async (req, res) => {
  try {
    const { message = '', history = [], role = 'Investigator' } = req.body;
    if (!message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const reply = await chatWithGemini(message, history, role);
    res.json({ ok: true, reply });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gemini chat error' });
  }
});
