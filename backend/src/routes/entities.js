/**
 * Entity Search & Privacy Unmasking Router for FinGuard Sentinel
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken, requireRoles } from './auth.js';

export const entitiesRouter = express.Router();

// GET /api/entities/search
entitiesRouter.get('/search', authenticateToken, (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const cleanQuery = query.replace(/[\s\-\+]/g, '');
  const allAds = db.getAds({ limit: 1000 }).ads;
  const matchingAds = [];
  const foundClues = [];
  const platforms = new Set();
  const accounts = new Set();
  const campaigns = new Set();

  for (const ad of allAds) {
    let matched = false;
    // Check in username
    if (ad.username?.toLowerCase().includes(query)) {
      matched = true;
      accounts.add(ad.username);
    }

    // Check in clues
    for (const clue of ad.clues || []) {
      const clueValClean = (clue.normalized_value || clue.value || '').toLowerCase().replace(/[\s\-\+]/g, '');
      if (clueValClean.includes(cleanQuery) || clueValClean.includes(query)) {
        matched = true;
        foundClues.push(clue);
      }
    }

    // Check in raw text
    if (ad.text?.toLowerCase().includes(query)) {
      matched = true;
    }

    if (matched) {
      matchingAds.push(ad);
      platforms.add(ad.platform);
      accounts.add(ad.username);
      if (ad.campaign_id) campaigns.add(ad.campaign_id);
    }
  }

  const timestamps = matchingAds.map(a => new Date(a.posted_at).getTime()).sort();
  const firstSeen = timestamps.length ? new Date(timestamps[0]).toISOString() : null;
  const lastSeen = timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString() : null;

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'SEARCH_ENTITY',
    targetType: 'entity',
    targetId: query,
    details: `Search returned ${matchingAds.length} linked ads across ${platforms.size} platforms`
  });

  res.json({
    query,
    total_linked_ads: matchingAds.length,
    platforms: Array.from(platforms),
    accounts: Array.from(accounts),
    campaigns: Array.from(campaigns),
    first_seen: firstSeen,
    last_seen: lastSeen,
    is_syndicated: matchingAds.length >= 2,
    linked_ads: matchingAds.slice(0, 50)
  });
});

// POST /api/entities/unmask (Investigator role only with audit log)
entitiesRouter.post('/unmask', authenticateToken, requireRoles('Investigator', 'Admin', 'Officer'), (req, res) => {
  const { adId, clueType, normalizedValue, reason } = req.body;

  if (!adId || !clueType || !normalizedValue || !reason) {
    return res.status(400).json({ error: 'adId, clueType, normalizedValue, and justification reason are required' });
  }

  const ad = db.getAdById(adId);
  if (!ad) return res.status(404).json({ error: 'Advertisement not found' });

  const targetClue = (ad.clues || []).find(
    c => c.type === clueType && (c.normalized_value === normalizedValue || c.value === normalizedValue)
  );

  if (!targetClue) {
    return res.status(404).json({ error: 'Requested entity clue not found in advertisement' });
  }

  // Record strict audit log entry for privacy unmasking
  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'INVESTIGATOR_UNMASK_SENSITIVE_ENTITY',
    targetType: clueType,
    targetId: targetClue.masked_value,
    details: `Investigator ${req.user.name} (${req.user.badge}) unmasked sensitive value. Justification: "${reason}"`
  });

  res.json({
    success: true,
    unmasked_value: targetClue.raw_card || targetClue.value,
    type: targetClue.type,
    investigator: req.user.name,
    officer: req.user.name,
    unmasked_at: new Date().toISOString()
  });
});
