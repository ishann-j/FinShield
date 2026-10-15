/**
 * CSV Exporter for FinGuard Sentinel
 * Formats cases, alerts, and campaigns for spreadsheet/bulk cyber cell export.
 */

import { stringify } from 'csv-stringify/sync';

export function exportAdsToCSV(ads = []) {
  const records = ads.map(ad => ({
    'Ad ID': ad.id,
    'Platform': ad.platform,
    'Username': ad.username,
    'Posted At': ad.posted_at,
    'City': ad.city || 'N/A',
    'Risk Score': ad.risk_score || 0,
    'Risk Level': ad.risk_level || 'Low',
    'Threat Categories': (ad.categories || []).join('; '),
    'Campaign ID': ad.campaign_id || 'None',
    'Content SHA256': ad.content_hash || '',
    'Extracted Entities': (ad.clues || []).map(c => `${c.type}:${c.masked_value}`).join(' | '),
    'Post Text': ad.text.replace(/[\r\n]+/g, ' ')
  }));

  return stringify(records, { header: true });
}

export function exportCampaignsToCSV(campaigns = []) {
  const records = campaigns.map(c => ({
    'Campaign ID': c.id,
    'Campaign Name': c.name,
    'Risk Score': c.risk_score,
    'Ad Count': c.ad_count,
    'Platform Count': c.platform_count,
    'Platforms': (c.platforms || []).join('; '),
    'Account Count': c.account_count,
    'Top Categories': (c.primary_categories || []).join('; '),
    'First Seen': c.first_seen,
    'Last Seen': c.last_seen,
    'Burst Detected': c.is_burst ? 'Yes' : 'No',
    'Shared Entities': (c.shared_entities || []).map(e => `${e.type}:${e.masked_value}`).join(' | ')
  }));

  return stringify(records, { header: true });
}
