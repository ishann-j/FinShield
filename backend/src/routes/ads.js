/**
 * Ads & Evidence Inspection Router for FinGuard Sentinel
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';
import { buildEvidenceCard } from '../services/evidence.js';

export const adsRouter = express.Router();

// GET /api/ads
adsRouter.get('/', authenticateToken, (req, res) => {
  const { category, riskLevel, platform, search, campaignId, limit, offset, sort } = req.query;
  const result = db.getAds({
    category,
    riskLevel,
    platform,
    search,
    campaignId,
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0,
    sort: sort || 'newest'
  });
  res.json(result);
});

// GET /api/ads/:id
adsRouter.get('/:id', authenticateToken, (req, res) => {
  const ad = db.getAdById(req.params.id);
  if (!ad) {
    return res.status(404).json({ error: 'Advertisement not found' });
  }
  res.json({ ad });
});

// GET /api/ads/:id/evidence
adsRouter.get('/:id/evidence', authenticateToken, (req, res) => {
  const ad = db.getAdById(req.params.id);
  if (!ad) {
    return res.status(404).json({ error: 'Advertisement not found' });
  }

  const entities = db.getAllEntities();
  const evidenceCard = buildEvidenceCard(ad, {
    entityHistory: entities,
    currentUser: req.user
  });

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'VIEW_EVIDENCE_CARD',
    targetType: 'ad',
    targetId: ad.id,
    details: `Inspected evidence for ${ad.id} (Risk Score: ${ad.risk_score})`
  });

  res.json({ evidence: evidenceCard });
});

// POST /api/ads/:id/feedback
adsRouter.post('/:id/feedback', authenticateToken, (req, res) => {
  const { action, label, notes } = req.body; // action: 'CONFIRM' | 'FALSE_POSITIVE' | 'ESCALATE'
  const ad = db.getAdById(req.params.id);
  if (!ad) {
    return res.status(404).json({ error: 'Advertisement not found' });
  }

  const statusMap = {
    CONFIRM: 'Confirmed Suspicious',
    FALSE_POSITIVE: 'False Positive',
    ESCALATE: 'Escalated to Nodal'
  };

  const newStatus = statusMap[action] || 'Investigating';
  const updatedAd = db.updateAd(ad.id, {
    investigation_status: newStatus,
    investigator_feedback: {
      action,
      label: label || (action === 'FALSE_POSITIVE' ? 'BENIGN' : ad.categories?.[0] || 'SUSPICIOUS'),
      analyst: req.user.name,
      timestamp: new Date().toISOString()
    }
  });

  db.addFeedback({
    ad_id: ad.id,
    text: ad.text,
    predicted_categories: ad.categories,
    analyst_label: label || (action === 'FALSE_POSITIVE' ? 'BENIGN' : ad.categories?.[0]),
    action,
    analyst_id: req.user.id,
    analyst_name: req.user.name,
    notes: notes || ''
  });

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: `FEEDBACK_${action}`,
    targetType: 'ad',
    targetId: ad.id,
    details: `Triage action: ${action} (${newStatus}). Notes: ${notes || 'None'}`
  });

  res.json({ success: true, ad: updatedAd });
});

// POST /api/ads/:id/notes
adsRouter.post('/:id/notes', authenticateToken, (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: 'Note content is required' });

  const ad = db.getAdById(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Advertisement not found' });

  const notes = ad.analyst_notes || [];
  notes.push({
    author: req.user.name,
    role: req.user.role,
    timestamp: new Date().toISOString(),
    text: note
  });

  const updated = db.updateAd(ad.id, { analyst_notes: notes });

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'ADD_ANALYST_NOTE',
    targetType: 'ad',
    targetId: ad.id,
    details: `Appended note: ${note}`
  });

  res.json({ success: true, notes: updated.analyst_notes });
});
