/**
 * Complete Database Seeding & Pipeline Runner for FinGuard Sentinel
 * 1. Generates synthetic data if absent
 * 2. Trains and serializes ML threat model
 * 3. Runs extraction, risk engine, and explainability on all ~1500 ads
 * 4. Runs coordinated campaign detector and evaluates against ground truth
 * 5. Generates triage alerts and seeds persistent store
 */

import fs from 'fs';
import { CONFIG } from '../src/config.js';
import { db } from '../src/database.js';
import { generateSyntheticDataset } from './generate_synthetic_data.js';
import { trainThreatModel } from './train_model.js';
import { preprocessText } from '../src/services/preprocess.js';
import { extractAllClues } from '../src/services/extractors.js';
import { evaluateRisk } from '../src/services/risk_engine.js';
import { detectCampaigns, evaluateCampaignsAgainstGroundTruth } from '../src/services/campaign_detector.js';
import { alertService } from '../src/services/alerts.js';
import { computeSHA256 } from '../src/services/evidence.js';

export async function seedDatabase() {
  console.log('================================================================');
  console.log('🚀 FINGUARD SENTINEL - DATA GENERATION & SEEDING PIPELINE');
  console.log('================================================================');

  // Step 1: Generate Synthetic Dataset
  let adsData;
  if (!fs.existsSync(CONFIG.SYNTHETIC_DATA_FILE)) {
    console.log('[Step 1/5] Generating fresh synthetic dataset...');
    adsData = generateSyntheticDataset(1500);
  } else {
    console.log('[Step 1/5] Loading existing synthetic dataset...');
    adsData = JSON.parse(fs.readFileSync(CONFIG.SYNTHETIC_DATA_FILE, 'utf8'));
  }

  // Step 2: Train Model
  console.log('\n[Step 2/5] Training TF-IDF Multi-label Threat Classifier...');
  const trainedClassifier = trainThreatModel();

  // Step 3: Extract Clues and Build Entity Map
  console.log('\n[Step 3/5] Extracting forensic clues across 1,500 posts...');
  const entityHistory = {};
  const processedAds = [];

  for (const ad of adsData) {
    const prep = preprocessText(ad.text);
    const clues = extractAllClues(prep.cleanedText, {}, 'post');

    // Also extract from OCR text if present
    if (ad.ocr_text) {
      const ocrClues = extractAllClues(ad.ocr_text, {}, 'image_ocr');
      for (const oc of ocrClues) {
        if (!clues.some(c => c.type === oc.type && c.normalized_value === oc.normalized_value)) {
          clues.push(oc);
        }
      }
    }

    // Update entity history
    for (const clue of clues) {
      const key = `${clue.type}:${clue.normalized_value}`;
      if (!entityHistory[key]) {
        entityHistory[key] = {
          type: clue.type,
          value: clue.normalized_value,
          masked_value: clue.masked_value,
          count: 0,
          platforms: new Set(),
          ad_ids: [],
          first_seen: ad.posted_at,
          last_seen: ad.posted_at
        };
      }
      entityHistory[key].count++;
      entityHistory[key].platforms.add(ad.platform);
      entityHistory[key].ad_ids.push(ad.id);
      if (new Date(ad.posted_at) < new Date(entityHistory[key].first_seen)) {
        entityHistory[key].first_seen = ad.posted_at;
      }
      if (new Date(ad.posted_at) > new Date(entityHistory[key].last_seen)) {
        entityHistory[key].last_seen = ad.posted_at;
      }
    }

    processedAds.push({
      ...ad,
      cleaned_text: prep.cleanedText,
      evasion_detected: prep.evasionDetected,
      evasions: prep.evasions,
      clues
    });
  }

  // Normalize entity history platforms set to array
  const formattedEntities = {};
  for (const [k, v] of Object.entries(entityHistory)) {
    formattedEntities[k] = {
      ...v,
      platforms: Array.from(v.platforms)
    };
  }

  // Step 4: Evaluate Risk for all Ads
  console.log('\n[Step 4/5] Evaluating explainable risk scores and factor breakdown...');
  for (const ad of processedAds) {
    const riskResult = evaluateRisk({
      text: ad.cleaned_text,
      platform: ad.platform,
      username: ad.username,
      profileAgeDays: 45,
      followers: ad.followers || 50,
      clues: ad.clues,
      ocrText: ad.ocr_text || '',
      entityHistory: formattedEntities,
      evasionDetected: ad.evasion_detected,
      evasions: ad.evasions
    });

    ad.risk_score = riskResult.risk_score;
    ad.risk_level = riskResult.risk_level;
    ad.categories = riskResult.categories;
    ad.ml_probability = riskResult.ml_probability;
    ad.ml_scores = riskResult.ml_scores;
    ad.factor_breakdown = riskResult.factor_breakdown;
    ad.summary = riskResult.summary;
    ad.content_hash = ad.content_hash || computeSHA256(`${ad.platform}|${ad.username}|${ad.text}`);
    ad.status = 'New';
  }

  // Step 5: Detect Coordinated Campaigns
  console.log('\n[Step 5/5] Detecting coordinated campaigns & syndication rings...');
  const { campaigns } = detectCampaigns(processedAds);

  // Evaluate against ground truth
  evaluateCampaignsAgainstGroundTruth(processedAds, campaigns);

  // Generate Alerts in memory
  const allAlerts = [];
  const alertThrottles = new Set();

  for (const ad of processedAds) {
    if (ad.risk_score >= 81) {
      const key = `CRITICAL:${ad.id}`;
      if (!alertThrottles.has(key)) {
        alertThrottles.add(key);
        allAlerts.push({
          id: `alt_${allAlerts.length + 1}_${ad.id}`,
          created_at: ad.posted_at || new Date().toISOString(),
          type: 'CRITICAL_RISK_DETECTED',
          severity: 'Critical',
          title: `CRITICAL THREAT: ${ad.categories?.[0] || 'Mule Account'} on ${ad.platform}`,
          message: `Ad ${ad.id} flagged with risk score ${ad.risk_score}/100. High-probability illicit commercial mule operation.`,
          ad_id: ad.id,
          campaign_id: ad.campaign_id || null,
          categories: ad.categories,
          platform: ad.platform,
          status: 'New',
          assigned_to: null,
          notes: []
        });
      }
    } else if (ad.risk_score >= 61) {
      const key = `HIGH:${ad.id}`;
      if (!alertThrottles.has(key)) {
        alertThrottles.add(key);
        allAlerts.push({
          id: `alt_${allAlerts.length + 1}_${ad.id}`,
          created_at: ad.posted_at || new Date().toISOString(),
          type: 'HIGH_RISK_DETECTED',
          severity: 'High',
          title: `HIGH RISK: Suspicious ${ad.categories?.[0] || 'Post'} on ${ad.platform}`,
          message: `Ad ${ad.id} flagged with risk score ${ad.risk_score}/100. Commercial financial crime markers present.`,
          ad_id: ad.id,
          campaign_id: ad.campaign_id || null,
          categories: ad.categories,
          platform: ad.platform,
          status: 'New',
          assigned_to: null,
          notes: []
        });
      }
    }

    if (ad.categories?.includes('STOLEN_CLONED_CARD')) {
      const key = `CARDING:${ad.id}`;
      if (!alertThrottles.has(key)) {
        alertThrottles.add(key);
        allAlerts.push({
          id: `alt_cvv_${allAlerts.length + 1}_${ad.id}`,
          created_at: ad.posted_at || new Date().toISOString(),
          type: 'CARDING_DUMP_DETECTED',
          severity: 'Critical',
          title: `CARDING ALERT: CVV / Card Dumps on ${ad.platform}`,
          message: `Stolen/cloned carding signals identified in ad ${ad.id}.`,
          ad_id: ad.id,
          campaign_id: ad.campaign_id || null,
          categories: ['STOLEN_CLONED_CARD'],
          platform: ad.platform,
          status: 'New',
          assigned_to: null,
          notes: []
        });
      }
    }
  }

  for (const camp of campaigns) {
    allAlerts.push({
      id: `alt_camp_${camp.id}`,
      created_at: camp.first_seen || new Date().toISOString(),
      type: 'COORDINATED_CAMPAIGN_DETECTED',
      severity: camp.risk_score >= 70 ? 'Critical' : 'High',
      title: `SYNDICATE DETECTED: ${camp.name}`,
      message: `Identified coordinated ring spanning ${camp.platform_count} platforms, ${camp.account_count} accounts, and ${camp.ad_count} advertisements.`,
      ad_id: camp.member_ad_ids?.[0] || null,
      campaign_id: camp.id,
      categories: camp.primary_categories || [],
      platform: camp.platforms?.join(', ') || 'Multi-platform',
      status: 'New',
      assigned_to: null,
      notes: []
    });
  }

  // Fast Bulk Database State Write
  db.state.entities = formattedEntities;
  db.state.campaigns = campaigns;
  db.state.ads = processedAds;
  db.state.alerts = allAlerts;
  db.save();

  // Add initial audit log
  db.logAudit({
    userId: 'system',
    username: 'system',
    role: 'Admin',
    action: 'INITIAL_SEED_COMPLETE',
    targetType: 'system',
    targetId: 'seed',
    details: `Seeded ${processedAds.length} ads, ${campaigns.length} campaigns, ${allAlerts.length} alerts, and ${Object.keys(formattedEntities).length} entities`
  });

  const criticalCount = processedAds.filter(a => a.risk_score >= 81).length;
  const highCount = processedAds.filter(a => a.risk_score >= 61 && a.risk_score < 81).length;
  const mediumCount = processedAds.filter(a => a.risk_score >= 31 && a.risk_score < 61).length;
  const lowCount = processedAds.filter(a => a.risk_score < 31).length;

  console.log('\n================================================================');
  console.log('✅ SEEDING AND ANALYSIS PIPELINE COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  console.log(`📊 Total Ads Scanned:       ${processedAds.length}`);
  console.log(`🚨 Critical Threats:       ${criticalCount}`);
  console.log(`⚠️  High Risk Ads:          ${highCount}`);
  console.log(`🟡 Medium Risk Ads:        ${mediumCount}`);
  console.log(`🟢 Low / Benign Ads:       ${lowCount}`);
  console.log(`🕸️  Coordinated Syndicates: ${campaigns.length} detected`);
  console.log(`🔔 Triage Alerts Created:  ${db.getAlerts({ limit: 1000 }).total}`);
  console.log(`🔍 Forensic Entities:      ${Object.keys(formattedEntities).length}`);
  console.log('================================================================\n');
}

if (process.argv[1].endsWith('seed_db.js')) {
  seedDatabase();
}
