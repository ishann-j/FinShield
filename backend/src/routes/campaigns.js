/**
 * Campaigns API Router for FinGuard Sentinel
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';

export const campaignsRouter = express.Router();

// GET /api/campaigns
campaignsRouter.get('/', authenticateToken, (req, res) => {
  const campaigns = db.getCampaigns();
  res.json({ total: campaigns.length, campaigns });
});

// GET /api/campaigns/:id
campaignsRouter.get('/:id', authenticateToken, (req, res) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Fetch all ads belonging to this campaign
  const memberAds = db.getAds({ campaignId: campaign.id, limit: 200 }).ads;

  res.json({
    campaign,
    member_ads: memberAds
  });
});
