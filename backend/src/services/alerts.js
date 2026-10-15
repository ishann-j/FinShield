/**
 * Alert Management & Notification Service for FinGuard Sentinel
 * Handles rule triggers (Critical/High, CVV dumps, new campaigns, bursts),
 * deduplication, throttling, and state transitions.
 */

import { db } from '../database.js';

class AlertService {
  constructor() {
    this.throttleMap = new Map(); // entityKey -> lastAlertTimestamp
    this.throttleDurationMs = 5 * 60 * 1000; // 5 min throttle per identical entity
  }

  processAdAlerts(ad) {
    const alertsToGenerate = [];

    // 1. Critical / High Risk Alert
    if (ad.risk_score >= 81) {
      alertsToGenerate.push({
        type: 'CRITICAL_RISK_DETECTED',
        severity: 'Critical',
        title: `CRITICAL THREAT: ${ad.categories?.[0] || 'High Risk Mule'} on ${ad.platform}`,
        message: `Ad ${ad.id} flagged with risk score ${ad.risk_score}/100. Commercial mule / fraud indicators present.`,
        ad_id: ad.id,
        campaign_id: ad.campaign_id || null,
        categories: ad.categories,
        platform: ad.platform
      });
    } else if (ad.risk_score >= 61) {
      alertsToGenerate.push({
        type: 'HIGH_RISK_DETECTED',
        severity: 'High',
        title: `HIGH RISK: Suspicious ${ad.categories?.[0] || 'Ad'} on ${ad.platform}`,
        message: `Ad ${ad.id} flagged with risk score ${ad.risk_score}/100. Requires investigator review.`,
        ad_id: ad.id,
        campaign_id: ad.campaign_id || null,
        categories: ad.categories,
        platform: ad.platform
      });
    }

    // 2. Carding / CVV Dump Alert
    if (ad.categories?.includes('STOLEN_CLONED_CARD')) {
      alertsToGenerate.push({
        type: 'CARDING_DUMP_DETECTED',
        severity: 'Critical',
        title: `CARDING ALERT: CVV / Card Dumps on ${ad.platform}`,
        message: `Stolen/cloned carding signals identified in ad ${ad.id}. Immediate escalation recommended.`,
        ad_id: ad.id,
        campaign_id: ad.campaign_id || null,
        categories: ['STOLEN_CLONED_CARD'],
        platform: ad.platform
      });
    }

    // Process and save with deduplication
    for (const item of alertsToGenerate) {
      const throttleKey = `${item.type}:${item.ad_id}`;
      const now = Date.now();
      const last = this.throttleMap.get(throttleKey);

      if (!last || now - last > this.throttleDurationMs) {
        this.throttleMap.set(throttleKey, now);

        const alertObj = {
          id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          created_at: new Date().toISOString(),
          status: 'New', // New, Acknowledged, Investigating, Escalated, Resolved, False Positive
          assigned_to: null,
          notes: [],
          ...item
        };

        db.addAlert(alertObj);
      }
    }
  }

  processCampaignAlert(campaign) {
    const alertObj = {
      id: `alt_camp_${campaign.id}`,
      created_at: new Date().toISOString(),
      type: 'COORDINATED_CAMPAIGN_DETECTED',
      severity: campaign.risk_score >= 70 ? 'Critical' : 'High',
      title: `SYNDICATE DETECTED: ${campaign.name}`,
      message: `Identified coordinated ring spanning ${campaign.platform_count} platforms, ${campaign.account_count} accounts, and ${campaign.ad_count} advertisements.`,
      ad_id: campaign.member_ad_ids?.[0] || null,
      campaign_id: campaign.id,
      categories: campaign.primary_categories || [],
      platform: campaign.platforms?.join(', ') || 'Multi-platform',
      status: 'New',
      assigned_to: null,
      notes: []
    };

    db.addAlert(alertObj);
  }

  updateAlertStatus(alertId, newStatus, user, note = '') {
    const alert = db.getAlertById(alertId);
    if (!alert) return null;

    const notes = alert.notes || [];
    if (note) {
      notes.push({
        author: user.name,
        role: user.role,
        timestamp: new Date().toISOString(),
        text: note
      });
    }

    const updated = db.updateAlert(alertId, {
      status: newStatus,
      assigned_to: user.name,
      updated_at: new Date().toISOString(),
      notes
    });

    db.logAudit({
      userId: user.id,
      username: user.username,
      role: user.role,
      action: 'UPDATE_ALERT_STATUS',
      targetType: 'alert',
      targetId: alertId,
      details: `Changed status to ${newStatus}. Note: ${note || 'None'}`
    });

    return updated;
  }
}

export const alertService = new AlertService();
