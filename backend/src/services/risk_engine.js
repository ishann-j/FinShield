/**
 * Hybrid Explainable Risk Engine for FinGuard Sentinel
 * Combines ML category probability + Configurable Rule Weights,
 * with full factor attribution breakdown and plain-language summary.
 */

import fs from 'fs';
import { CONFIG } from '../config.js';
import { classifier } from './classifier.js';
import { preprocessText } from './preprocess.js';
import { extractAllClues } from './extractors.js';

let keywordsConfig = null;

function getKeywordsConfig() {
  if (!keywordsConfig) {
    try {
      const raw = fs.readFileSync(CONFIG.KEYWORDS_FILE, 'utf8');
      keywordsConfig = JSON.parse(raw);
    } catch {
      keywordsConfig = {
        ruleWeights: {
          SALE_RENT_INTENT: 25,
          BANK_ACCOUNT_TERM: 15,
          KIT_SIM_BUNDLE: 20,
          NO_KYC_LIMIT_TURNOVER: 15,
          CVV_DUMP_FULLZ: 30,
          RECRUITMENT_COMMISSION: 20,
          REPEATING_ENTITY_5_PLUS: 20,
          SHORTENED_LOOKALIKE_URL: 10,
          IMAGE_OCR_HIT: 15,
          CRYPTO_USDT_CHANNEL: 15,
          BOT_NEW_ACCOUNT: 10,
          OBFUSCATION_EVASION: 10,
          BENIGN_SIGNAL: -35
        }
      };
    }
  }
  return keywordsConfig;
}

export function updateRuleWeights(newWeights) {
  const config = getKeywordsConfig();
  config.ruleWeights = { ...config.ruleWeights, ...newWeights };
  fs.writeFileSync(CONFIG.KEYWORDS_FILE, JSON.stringify(config, null, 2), 'utf8');
  keywordsConfig = config;
  return config.ruleWeights;
}

export function evaluateRisk({
  text = '',
  platform = '',
  username = '',
  profileAgeDays = 90,
  followers = 100,
  clues = [],
  ocrText = '',
  imageClues = [],
  entityHistory = {},
  evasionDetected = false,
  evasions = []
}) {
  const config = getKeywordsConfig();
  const W = config.ruleWeights;

  const combinedText = `${text} ${ocrText}`.toLowerCase();
  const factors = [];
  let ruleScore = 0;

  // 1. Sale / Rent intent (+25)
  const saleRentPattern = /\b(for\s*sale|rent|kiraya|bikau|available|ready\s*stock|selling|buy\s*now|fresh\s*ready|purchase)\b/i;
  if (saleRentPattern.test(combinedText)) {
    factors.push({
      factor: 'SALE_RENT_INTENT',
      points: W.SALE_RENT_INTENT,
      description: 'Explicit commercial sale, rent, or brokerage intent detected'
    });
    ruleScore += W.SALE_RENT_INTENT;
  }

  // 2. Bank account terms (+15)
  const accountPattern = /\b(bank\s*account|savings\s*account|current\s*account|corporate\s*account|khata|net\s*banking|passbook)\b/i;
  if (accountPattern.test(combinedText)) {
    factors.push({
      factor: 'BANK_ACCOUNT_TERM',
      points: W.BANK_ACCOUNT_TERM,
      description: 'Direct reference to retail, corporate, or mule bank accounts'
    });
    ruleScore += W.BANK_ACCOUNT_TERM;
  }

  // 3. Kit / SIM / Net-Banking Bundle (+20)
  const kitPattern = /\b(kit|full\s*kit|passbook.*cheque|cheque.*atm|sim.*atm|atm.*pin|registered\s*sim)\b/i;
  if (kitPattern.test(combinedText)) {
    factors.push({
      factor: 'KIT_SIM_BUNDLE',
      points: W.KIT_SIM_BUNDLE,
      description: 'Complete banking kit package (SIM, ATM, Passbook, Chequebook) offered'
    });
    ruleScore += W.KIT_SIM_BUNDLE;
  }

  // 4. No KYC / Limit / Turnover (+15)
  const noKycPattern = /\b(no\s*kyc|without\s*kyc|fake\s*kyc|limit|turnover|high\s*limit|50\s*lakh|1\s*cr|shell\s*firm|udyam|gst)\b/i;
  if (noKycPattern.test(combinedText)) {
    factors.push({
      factor: 'NO_KYC_LIMIT_TURNOVER',
      points: W.NO_KYC_LIMIT_TURNOVER,
      description: 'Evasion of KYC standards or high-turnover/limit laundering channel keywords'
    });
    ruleScore += W.NO_KYC_LIMIT_TURNOVER;
  }

  // 5. CVV / Dumps / Fullz / Live CC (+30)
  const cardingPattern = /\b(cvv|cvv2|fullz|dumps?|track\s*1|track\s*2|bin\s*list|live\s*cc|cc\s*checker|cloned\s*card|skimmed)\b/i;
  if (cardingPattern.test(combinedText) || clues.some(c => c.type === 'cvv')) {
    factors.push({
      factor: 'CVV_DUMP_FULLZ',
      points: W.CVV_DUMP_FULLZ,
      description: 'Carding signals, card dumps, CVV/CVV2 sale, or fullz database solicitation'
    });
    ruleScore += W.CVV_DUMP_FULLZ;
  }

  // 6. Recruitment / Daily Commission (+20)
  const recruitPattern = /\b(account\s*holders?\s*needed|earn\s*daily|daily\s*commission|give\s*your\s*account|5000.*daily|per\s*transaction)\b/i;
  if (recruitPattern.test(combinedText)) {
    factors.push({
      factor: 'RECRUITMENT_COMMISSION',
      points: W.RECRUITMENT_COMMISSION,
      description: 'Mule recruitment with daily commissions or profit-sharing propositions'
    });
    ruleScore += W.RECRUITMENT_COMMISSION;
  }

  // 7. Repeating Entity seen across 5+ ads (+20)
  let repeatingHit = false;
  for (const c of clues) {
    const key = `${c.type}:${c.normalized_value}`;
    if (entityHistory[key] && entityHistory[key].count >= 5) {
      repeatingHit = true;
      factors.push({
        factor: 'REPEATING_ENTITY_5_PLUS',
        points: W.REPEATING_ENTITY_5_PLUS,
        description: `Entity ${c.type} (${c.masked_value}) previously linked to ${entityHistory[key].count} coordinated advertisements`
      });
      ruleScore += W.REPEATING_ENTITY_5_PLUS;
      break;
    }
  }

  // 8. Shortened / Suspicious / Lookalike URL (+10)
  const suspiciousUrls = clues.filter(c => c.type === 'url' && (c.is_shortener || c.is_suspicious_tld || c.is_lookalike));
  if (suspiciousUrls.length > 0) {
    factors.push({
      factor: 'SHORTENED_LOOKALIKE_URL',
      points: W.SHORTENED_LOOKALIKE_URL,
      description: `Suspicious redirection link or lookalike domain found (${suspiciousUrls[0].domain})`
    });
    ruleScore += W.SHORTENED_LOOKALIKE_URL;
  }

  // 9. Card / Passbook Image or OCR Hit (+15)
  if (ocrText && ocrText.length > 10) {
    factors.push({
      factor: 'IMAGE_OCR_HIT',
      points: W.IMAGE_OCR_HIT,
      description: 'Suspicious text extracted directly from attached graphic / passbook image'
    });
    ruleScore += W.IMAGE_OCR_HIT;
  }

  // 10. Crypto / USDT P2P Channel (+15)
  const cryptoPattern = /\b(p2p|usdt|cash\s*to\s*crypto|layering|binance\s*p2p|crypto\s*mule)\b/i;
  if (cryptoPattern.test(combinedText) || clues.some(c => c.type === 'crypto_wallet')) {
    factors.push({
      factor: 'CRYPTO_USDT_CHANNEL',
      points: W.CRYPTO_USDT_CHANNEL,
      description: 'Crypto fund layering, P2P USDT cash-out channel, or crypto wallet address'
    });
    ruleScore += W.CRYPTO_USDT_CHANNEL;
  }

  // 11. Bot / Fresh Account (+10)
  if (profileAgeDays < 15 && followers < 25) {
    factors.push({
      factor: 'BOT_NEW_ACCOUNT',
      points: W.BOT_NEW_ACCOUNT,
      description: `Disposably created profile (${profileAgeDays} days old, ${followers} followers)`
    });
    ruleScore += W.BOT_NEW_ACCOUNT;
  }

  // 12. Obfuscation / Evasion Tricks (+10)
  if (evasionDetected || evasions.length > 0) {
    factors.push({
      factor: 'OBFUSCATION_EVASION',
      points: W.OBFUSCATION_EVASION,
      description: `Intentional evasion techniques detected: ${evasions.join(', ')}`
    });
    ruleScore += W.OBFUSCATION_EVASION;
  }

  // 13. Benign / Legitimate Context Signals (-35)
  const benignPattern = /\b(official\s*bank|apply\s*online|cyber\s*crime\s*advisory|never\s*share|rbi\s*awareness|beware\s*of|job\s*opening|clerk\s*recruitment|warning|used\s*cycle|used\s*mobile|second\s*hand\s*phone)\b/i;
  if (benignPattern.test(combinedText) && !cardingPattern.test(combinedText)) {
    factors.push({
      factor: 'BENIGN_SIGNAL',
      points: W.BENIGN_SIGNAL,
      description: 'Protective advisory, official bank recruitment, or genuine e-commerce context'
    });
    ruleScore += W.BENIGN_SIGNAL;
  }

  // Bound ruleScore
  ruleScore = Math.max(0, Math.min(100, ruleScore));

  // Run ML Classifier
  const mlResult = classifier.predict(text);
  const mlScore = Math.round(mlResult.suspicious_probability * 100);

  // Hybrid Blend: If classifier is trained, blend 55% rules + 45% ML. Otherwise rely on rule engine.
  let finalScore = ruleScore;
  if (classifier.isTrained) {
    finalScore = Math.round(ruleScore * 0.55 + mlScore * 0.45);
    // Don't suppress severe rule violations
    if (ruleScore >= 65 && finalScore < 60) {
      finalScore = Math.round(ruleScore * 0.85);
    }
  }

  // If heavy benign signal, clamp score
  if (factors.some(f => f.factor === 'BENIGN_SIGNAL')) {
    finalScore = Math.min(25, finalScore);
  }

  finalScore = Math.max(0, Math.min(100, finalScore));

  // Determine Risk Level
  let riskLevel = 'Low';
  if (finalScore >= 81) riskLevel = 'Critical';
  else if (finalScore >= 61) riskLevel = 'High';
  else if (finalScore >= 31) riskLevel = 'Medium';

  // Merge categories from ML and rule heuristics
  const detectedCategories = new Set(mlResult.categories);
  if (cardingPattern.test(combinedText)) detectedCategories.add('STOLEN_CLONED_CARD');
  if (saleRentPattern.test(combinedText) && accountPattern.test(combinedText)) detectedCategories.add('ACCOUNT_SALE_RENT');
  if (recruitPattern.test(combinedText)) detectedCategories.add('ACCOUNT_RECRUITMENT');
  if (cryptoPattern.test(combinedText)) detectedCategories.add('CRYPTO_LAUNDERING_LINKED');
  if (noKycPattern.test(combinedText)) detectedCategories.add('FAKE_KYC_SHELL_ACCOUNT');
  if (clues.some(c => c.type === 'card_number') && saleRentPattern.test(combinedText)) detectedCategories.add('CARD_SALE');

  if (finalScore < 30 && !detectedCategories.has('BENIGN') && detectedCategories.size === 0) {
    detectedCategories.add('BENIGN');
  } else if (finalScore >= 31) {
    detectedCategories.delete('BENIGN');
  }

  const finalCategories = Array.from(detectedCategories);

  // Plain-language summary
  let summary = '';
  if (riskLevel === 'Critical' || riskLevel === 'High') {
    summary = `High-probability illicit advertisement identified on ${platform || 'web platform'}. ` +
      `Detected promotion of ${finalCategories.join(', ')}. ` +
      `Matched ${factors.length} threat indicators with ${clues.length} extracted forensic clues. ` +
      `Immediate investigative review and bank nodal liaison recommended.`;
  } else if (riskLevel === 'Medium') {
    summary = `Moderate threat indicators detected. Post contains borderline financial keywords or unverified account references. Investigator verification suggested.`;
  } else {
    summary = `Low-risk or benign content. Appears consistent with legitimate commercial activity, official advisory, or genuine user post.`;
  }

  return {
    risk_score: finalScore,
    risk_level: riskLevel,
    categories: finalCategories.length > 0 ? finalCategories : ['BENIGN'],
    ml_probability: mlResult.suspicious_probability,
    ml_scores: mlResult.scores,
    factor_breakdown: factors,
    summary
  };
}
