/**
 * Evidence Generation & Chain of Custody Engine for FinGuard Sentinel
 * Formats tamper-evident forensic Evidence Cards with highlighted tokens,
 * SHA-256 integrity hash, clues table, entity history, and audit trails.
 */

import crypto from 'crypto';

export function computeSHA256(content) {
  return crypto.createHash('sha256').update(String(content || '')).digest('hex');
}

// Highlight suspicious terms and extracted clues inside text
export function highlightSuspiciousText(text = '', clues = [], factors = []) {
  if (!text) return '';

  let highlighted = text;

  // Highlight extracted clue values
  for (const clue of clues) {
    if (clue.value && clue.value.length > 3) {
      const escaped = clue.value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      highlighted = highlighted.replace(
        regex,
        `<mark class="clue-highlight clue-${clue.type}" title="${clue.type}: ${clue.masked_value}">$1</mark>`
      );
    }
  }

  // Highlight threat keywords
  const threatTerms = [
    'account for sale', 'rent', 'kiraya', 'bikau', 'full kit', 'passbook', 'cheque',
    'sim', 'atm', 'net banking', 'cvv', 'cvv2', 'dumps', 'fullz', 'cloned',
    'daily commission', 'earn daily', 'p2p', 'usdt', 'no kyc', 'turnover', 'limit'
  ];

  for (const term of threatTerms) {
    const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b(${escaped})\\b`, 'gi');
    highlighted = highlighted.replace(regex, `<mark class="threat-highlight">$1</mark>`);
  }

  return highlighted;
}

export function buildEvidenceCard(ad, { entityHistory = {}, currentUser = null } = {}) {
  const contentHash = ad.content_hash || computeSHA256(`${ad.platform}|${ad.username}|${ad.text}`);
  const highlightedHtml = highlightSuspiciousText(ad.text, ad.clues || [], ad.factor_breakdown || []);

  // Entity history details for attached clues
  const forensicEntityHistory = (ad.clues || []).map(clue => {
    const key = `${clue.type}:${clue.normalized_value}`;
    const hist = entityHistory[key] || {
      count: 1,
      platforms: [ad.platform],
      first_seen: ad.posted_at,
      last_seen: ad.posted_at
    };
    return {
      clue_type: clue.type,
      masked_value: clue.masked_value,
      normalized_value: clue.normalized_value,
      repetition_count: hist.count,
      platforms_seen: hist.platforms,
      first_seen: hist.first_seen,
      last_seen: hist.last_seen,
      is_syndicated: hist.count >= 2
    };
  });

  // Chain of custody record
  const chainOfCustody = ad.chain_of_custody || [
    {
      action: 'INGESTED_AND_ANALYZED',
      performed_by: 'FinGuard Core Engine v2.0',
      timestamp: ad.collected_at || new Date().toISOString(),
      details: `Generated SHA-256 evidence fingerprint ${contentHash.substring(0, 16)}...`
    }
  ];

  if (currentUser) {
    chainOfCustody.push({
      action: 'VIEWED_BY_INVESTIGATOR',
      performed_by: `${currentUser.name} (${currentUser.role})`,
      timestamp: new Date().toISOString(),
      details: 'Opened forensic evidence dossier for inspection'
    });
  }

  return {
    ad_id: ad.id,
    content_hash: contentHash,
    platform: ad.platform,
    username: ad.username,
    profile_url: ad.profile_url || `https://${ad.platform.toLowerCase()}.com/${ad.username}`,
    posted_at: ad.posted_at,
    collected_at: ad.collected_at || ad.posted_at,
    source_url: ad.source_url || `https://${ad.platform.toLowerCase()}.com/posts/${ad.id}`,
    city: ad.city || 'National / Multi-Region',
    language: ad.language || 'English / Hinglish',
    
    // Core Risk Metrics
    risk_score: ad.risk_score,
    risk_level: ad.risk_level,
    categories: ad.categories || [],
    ml_probability: ad.ml_probability,
    
    // Content & Highlighted Evidence
    original_text: ad.text,
    highlighted_text_html: highlightedHtml,
    image_paths: ad.image_paths || [],
    ocr_text: ad.ocr_text || '',
    phash: ad.phash || null,
    
    // Extracted Clues & Factor Breakdown
    clues: ad.clues || [],
    factor_breakdown: ad.factor_breakdown || [],
    entity_history: forensicEntityHistory,
    
    // Syndication & Campaign
    campaign_id: ad.campaign_id || null,
    campaign_name: ad.campaign_name || null,
    
    // Investigator Summary
    summary: ad.summary || 'Forensic analysis completed.',
    investigation_status: ad.status || 'New',
    analyst_notes: ad.analyst_notes || [],
    chain_of_custody: chainOfCustody,
    disclaimer: 'FinGuard Sentinel Prototype - Synthetic Data Only. Flags are indicators for investigation, not proof of guilt.'
  };
}
