/**
 * Rules Configuration & Feedback Retraining Router for FinGuard Sentinel
 */

import express from 'express';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { db } from '../database.js';
import { authenticateToken, requireRoles } from './auth.js';
import { updateRuleWeights } from '../services/risk_engine.js';
import { classifier } from '../services/classifier.js';

export const rulesRouter = express.Router();

// GET /api/rules
rulesRouter.get('/', authenticateToken, (req, res) => {
  let keywordsData = {};
  try {
    keywordsData = JSON.parse(fs.readFileSync(CONFIG.KEYWORDS_FILE, 'utf8'));
  } catch (err) {
    keywordsData = {};
  }

  res.json({
    categories: keywordsData.categories || {},
    ruleWeights: keywordsData.ruleWeights || {},
    riskThresholds: keywordsData.riskThresholds || {},
    modelMetrics: classifier.metrics || {},
    feedbackCount: db.getFeedback().length
  });
});

// PUT /api/rules/weights (Admin only)
rulesRouter.put('/weights', authenticateToken, requireRoles('Admin'), (req, res) => {
  const { ruleWeights } = req.body;
  if (!ruleWeights || typeof ruleWeights !== 'object') {
    return res.status(400).json({ error: 'Valid ruleWeights object is required' });
  }

  const updated = updateRuleWeights(ruleWeights);

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'UPDATE_RULE_WEIGHTS',
    targetType: 'rules',
    targetId: 'weights',
    details: `Updated rule engine weights: ${JSON.stringify(ruleWeights)}`
  });

  res.json({ success: true, ruleWeights: updated });
});

// POST /api/rules/retrain (Admin only)
rulesRouter.post('/retrain', authenticateToken, requireRoles('Admin'), (req, res) => {
  const previousMetrics = { ...classifier.metrics };
  const allAds = db.getAds({ limit: 2000 }).ads;
  const feedbackList = db.getFeedback();

  // Combine initial ads with analyst feedback labels
  const corpus = allAds.map(a => a.text);
  const labels = allAds.map(a => {
    // Check if feedback exists for this ad
    const fb = feedbackList.find(f => f.ad_id === a.id);
    if (fb && fb.analyst_label) {
      return [fb.analyst_label];
    }
    return a.categories || ['BENIGN'];
  });

  classifier.train(corpus, labels);

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'RETRAIN_MODEL',
    targetType: 'model',
    targetId: 'classifier',
    details: `Retrained model incorporating ${feedbackList.length} feedback samples across ${corpus.length} documents`
  });

  res.json({
    success: true,
    previousMetrics,
    updatedMetrics: classifier.metrics,
    incorporatedFeedbackSamples: feedbackList.length
  });
});
