/**
 * Reports and Export API Router for FinGuard Sentinel
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';
import { buildEvidenceCard } from '../services/evidence.js';
import { generateEvidencePDF } from '../services/pdf_report.js';
import { exportAdsToCSV, exportCampaignsToCSV } from '../services/csv_export.js';

export const reportsRouter = express.Router();

// GET /api/reports/ad/:id/pdf
reportsRouter.get('/ad/:id/pdf', authenticateToken, (req, res) => {
  const ad = db.getAdById(req.params.id);
  if (!ad) {
    return res.status(404).json({ error: 'Advertisement not found' });
  }

  const evidence = buildEvidenceCard(ad, {
    entityHistory: db.getAllEntities(),
    currentUser: req.user
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="FinGuard_Evidence_${ad.id}.pdf"`);

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'EXPORT_PDF_REPORT',
    targetType: 'ad',
    targetId: ad.id,
    details: `Exported official PDF case dossier for ${ad.id}`
  });

  generateEvidencePDF(evidence, res);
});

// GET /api/reports/ads/csv
reportsRouter.get('/ads/csv', authenticateToken, (req, res) => {
  const { campaignId, riskLevel } = req.query;
  const ads = db.getAds({ campaignId, riskLevel, limit: 1000 }).ads;
  const csv = exportAdsToCSV(ads);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="FinGuard_Suspect_Ads.csv"');

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'EXPORT_ADS_CSV',
    targetType: 'report',
    targetId: 'ads_csv',
    details: `Exported ${ads.length} ads to CSV`
  });

  res.send(csv);
});

// GET /api/reports/campaigns/csv
reportsRouter.get('/campaigns/csv', authenticateToken, (req, res) => {
  const campaigns = db.getCampaigns();
  const csv = exportCampaignsToCSV(campaigns);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="FinGuard_Syndicates.csv"');

  db.logAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    action: 'EXPORT_CAMPAIGNS_CSV',
    targetType: 'report',
    targetId: 'campaigns_csv',
    details: `Exported ${campaigns.length} campaigns to CSV`
  });

  res.send(csv);
});
