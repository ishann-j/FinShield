/**
 * Statistics and KPI Overview Router for FinGuard Sentinel SOC
 */

import express from 'express';
import { db } from '../database.js';
import { authenticateToken } from './auth.js';

export const statsRouter = express.Router();

// GET /api/stats/overview
statsRouter.get('/overview', authenticateToken, (req, res) => {
  const allAds = db.getAds({ limit: 2000 }).ads;
  const campaigns = db.getCampaigns();
  const alerts = db.getAlerts({ limit: 1000 }).alerts;

  const totalScanned = allAds.length;
  const flagged = allAds.filter(a => (a.risk_score || 0) >= 31).length;
  const critical = allAds.filter(a => (a.risk_score || 0) >= 81).length;
  const high = allAds.filter(a => (a.risk_score || 0) >= 61 && (a.risk_score || 0) < 81).length;
  const medium = allAds.filter(a => (a.risk_score || 0) >= 31 && (a.risk_score || 0) < 61).length;
  const low = allAds.filter(a => (a.risk_score || 0) < 31).length;

  // Category distribution
  const categorySplit = {};
  allAds.forEach(a => {
    (a.categories || []).forEach(cat => {
      categorySplit[cat] = (categorySplit[cat] || 0) + 1;
    });
  });

  // Platform distribution
  const platformSplit = {};
  allAds.forEach(a => {
    const p = a.platform || 'Unknown';
    platformSplit[p] = (platformSplit[p] || 0) + 1;
  });

  // City distribution
  const citySplit = {};
  allAds.forEach(a => {
    const c = a.city || 'Unknown';
    citySplit[c] = (citySplit[c] || 0) + 1;
  });

  // Top Repeating Entities
  const entityCounts = {};
  allAds.forEach(a => {
    (a.clues || []).forEach(c => {
      if (['phone', 'upi', 'url', 'crypto_wallet'].includes(c.type)) {
        const key = `${c.type}:${c.masked_value || c.value}`;
        if (!entityCounts[key]) {
          entityCounts[key] = {
            type: c.type,
            value: c.masked_value || c.value,
            count: 0,
            platforms: new Set()
          };
        }
        entityCounts[key].count++;
        entityCounts[key].platforms.add(a.platform);
      }
    });
  });

  const topEntities = Object.values(entityCounts)
    .map(e => ({ ...e, platforms: Array.from(e.platforms) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Time trend (sample 10 intervals)
  const sortedByDate = [...allAds].sort((a, b) => new Date(a.posted_at) - new Date(b.posted_at));
  const trendPoints = [];
  const chunkSize = Math.max(1, Math.floor(sortedByDate.length / 8));
  for (let i = 0; i < sortedByDate.length; i += chunkSize) {
    const chunk = sortedByDate.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      trendPoints.push({
        date: new Date(chunk[0].posted_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        total: chunk.length,
        critical: chunk.filter(a => a.risk_score >= 81).length,
        high: chunk.filter(a => a.risk_score >= 61 && a.risk_score < 81).length
      });
    }
  }

  res.json({
    kpis: {
      total_scanned: totalScanned,
      flagged_ads: flagged,
      critical_threats: critical,
      active_campaigns: campaigns.length,
      unresolved_alerts: alerts.filter(al => al.status === 'New' || al.status === 'Investigating').length
    },
    risk_split: {
      Critical: critical,
      High: high,
      Medium: medium,
      Low: low
    },
    category_split: categorySplit,
    platform_split: platformSplit,
    city_split: Object.entries(citySplit)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    top_entities: topEntities,
    timeline_trend: trendPoints
  });
});
