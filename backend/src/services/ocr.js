/**
 * FinShield Sentinel — Multimodal Optical Character Recognition (OCR) Engine
 * High-precision text & entity extraction from suspect screenshots, posters, and receipts.
 * 
 * Engines:
 * 1. Google Gemini Multimodal Vision (Primary AI OCR with entity detection & multilingual comprehension)
 * 2. Tesseract.js (Secondary on-premise offline OCR fallback)
 */

import { createWorker } from 'tesseract.js';
import { CONFIG } from '../config.js';
import { callGeminiWithCascade } from './gemini.js';

// Entity regex helpers for offline/Tesseract OCR
function extractEntitiesFromText(text) {
  const phones = [...new Set(text.match(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g) || [])];
  const upis = [...new Set(text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g) || [])];
  const urls = [...new Set(text.match(/(?:https?:\/\/)?(?:t\.me|wa\.me|bit\.ly|tinyurl\.com)\/[a-zA-Z0-9_\-]+/gi) || [])];
  const banks = [...new Set(text.match(/\b(SBI|HDFC|ICICI|Axis|PNB|Kotak|Bank of Baroda|Canara|Paytm|Airtel Payments)\b/gi) || [])];
  const amounts = [...new Set(text.match(/(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d{2})?/gi) || [])];

  return { phones, upis, urls, banks, amounts };
}

/**
 * Scan image using Google Gemini Multimodal Vision AI
 */
export async function scanWithGeminiVision(imageBuffer, mimeType = 'image/png') {
  const apiKey = CONFIG.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const base64Data = imageBuffer.toString('base64');
  const validMime = mimeType.startsWith('image/') ? mimeType : 'image/png';

  const prompt = `You are FinShield Sentinel OCR Intelligence Engine.
Extract ALL visible text from this image with 100% precision verbatim.
Do not skip small text, timestamps, captions, phone numbers, UPI IDs, or links.
Support English, Hindi, and Indian script text accurately.

Respond ONLY with a valid, clean JSON object (no markdown, no backticks, no text outside JSON):
{
  "rawText": "Complete verbatim transcription of all text in the image",
  "detectedLanguage": "string (e.g. English, Hindi, Hinglish)",
  "confidence": number (between 0.0 and 1.0),
  "imageSummary": "1-2 sentences describing what the image depicts (e.g. WhatsApp chat screenshot, banking payment confirmation, Telegram mule recruitment poster)",
  "entities": {
    "phones": ["extracted phone numbers"],
    "upis": ["extracted UPI handles"],
    "urls": ["extracted links or usernames"],
    "banks": ["extracted bank names"],
    "amounts": ["extracted money amounts"]
  }
}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: validMime,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 0.9,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  };

  const { data, modelUsed } = await callGeminiWithCascade(payload, CONFIG.GEMINI_MODEL, apiKey);
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('Gemini Vision returned empty text response.');
  }

  let cleaned = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    const parsed = JSON.parse(cleaned);
    return {
      ok: true,
      engine: `Google Gemini Vision AI (${modelUsed})`,
      rawText: parsed.rawText || '',
      detectedLanguage: parsed.detectedLanguage || 'English',
      confidence: parsed.confidence || 0.98,
      imageSummary: parsed.imageSummary || 'Extracted via Google Gemini Vision AI',
      entities: parsed.entities || extractEntitiesFromText(parsed.rawText || ''),
      modelUsed
    };
  } catch (parseErr) {
    // If not JSON, use the raw text directly
    return {
      ok: true,
      engine: `Google Gemini Vision AI (${modelUsed})`,
      rawText: textResponse.trim(),
      detectedLanguage: 'Auto',
      confidence: 0.95,
      imageSummary: 'Extracted text via Google Gemini Vision',
      entities: extractEntitiesFromText(textResponse),
      modelUsed
    };
  }
}

/**
 * Scan image using Tesseract.js (Offline local fallback)
 */
export async function scanWithTesseract(imageBuffer) {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(imageBuffer);
    const extractedText = (ret.data?.text || '').trim();
    const confidence = (ret.data?.confidence || 75) / 100;

    await worker.terminate();

    return {
      ok: true,
      engine: 'Tesseract.js (Offline Engine)',
      rawText: extractedText,
      detectedLanguage: 'English',
      confidence: Math.round(confidence * 100) / 100,
      imageSummary: 'Scanned locally using on-device optical character recognition.',
      entities: extractEntitiesFromText(extractedText),
      modelUsed: 'tesseract-wasm'
    };
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch {}
    }
    throw new Error(`Tesseract OCR error: ${err.message}`);
  }
}

/**
 * Main unified OCR entrypoint with auto-fallback
 */
export async function performOcrScan(imageBuffer, mimeType = 'image/png', options = {}) {
  const mode = options.engine || 'auto'; // 'auto', 'gemini', 'tesseract'

  if (mode === 'tesseract') {
    return await scanWithTesseract(imageBuffer);
  }

  // Try Google Gemini Vision AI first
  if (CONFIG.GEMINI_API_KEY && mode !== 'tesseract_only') {
    try {
      console.log('[OCR] Processing image with Google Gemini Vision AI...');
      return await scanWithGeminiVision(imageBuffer, mimeType);
    } catch (geminiErr) {
      console.warn('[OCR] Gemini Vision note, falling back to Tesseract:', geminiErr.message);
    }
  }

  // Fallback to Tesseract.js
  console.log('[OCR] Running local Tesseract.js engine...');
  return await scanWithTesseract(imageBuffer);
}
