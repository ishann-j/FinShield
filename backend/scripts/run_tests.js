/**
 * Automated Unit & Integration Tests for FinGuard Sentinel
 * Tests extractors, preprocessing, risk engine, and campaign detection.
 */

import { preprocessText } from '../src/services/preprocess.js';
import {
  extractAllClues,
  passesLuhn,
  maskCardNumber,
  maskPAN,
  maskAadhaar
} from '../src/services/extractors.js';
import { evaluateRisk } from '../src/services/risk_engine.js';
import { detectCampaigns } from '../src/services/campaign_detector.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING FINGUARD SENTINEL AUTOMATED UNIT TESTS');
  console.log('====================================================\n');

  // --- Suite 1: Text Preprocessing & De-Evasion ---
  console.log('📦 Suite 1: Preprocessing & Evasion Detection');
  {
    const leetInput = 'Fresh b@nk acc0unt and curr3nt k.y.c ready';
    const res = preprocessText(leetInput);
    assert(res.evasionDetected === true, 'Detects leetspeak evasion');
    assert(res.cleanedText.includes('bank') && res.cleanedText.includes('account'), 'De-leetspeaks b@nk and acc0unt');

    const zeroWidth = 'Mule\u200B\u200CAccount\uFEFFSale';
    const res2 = preprocessText(zeroWidth);
    assert(res2.evasions.includes('zero_width_characters'), 'Detects zero-width obfuscation');
    assert(!res2.cleanedText.includes('\u200B'), 'Strips zero-width characters');

    const spaced = 'b a n k a c c o u n t for sale';
    const res3 = preprocessText(spaced);
    assert(res3.cleanedText.includes('bank') && res3.cleanedText.includes('account'), 'Collapses spaced characters');

    const numWords = 'call me at nine eight seven six five four three two one zero';
    const res4 = preprocessText(numWords);
    assert(res4.cleanedText.includes('9876543210'), 'Converts number words to numeric digits');
  }

  // --- Suite 2: Clue Extractors & Financial Validation ---
  console.log('\n📦 Suite 2: Clue Extractors & Financial Entity Validation');
  {
    // Luhn card algorithm test
    const validVisa = '4532015892341980';
    const invalidCard = '4532015892341983';
    assert(passesLuhn(validVisa) === true, 'Luhn check passes valid Visa card number');
    assert(passesLuhn(invalidCard) === false, 'Luhn check rejects corrupted/invalid card number');

    const maskedCard = maskCardNumber(validVisa);
    assert(maskedCard === '453201******1980', 'Card number masked to first 6 and last 4');

    // PAN & Aadhaar privacy masking
    assert(maskPAN('ABCDE1234F') === 'ABCDE****F', 'PAN masked correctly');
    assert(maskAadhaar('2345 6789 0123') === '**** **** 0123', 'Aadhaar masked correctly');

    // Multi-entity extractor in text
    const testPost = `
      Urgent bank account sale. HDFC A/C: 502000891234 IFSC: HDFC0000240
      Debit card: 4532015892341980 CVV: 789 Exp: 09/28
      Contact: +91 98201 44912 or wa.me/919820144912
      UPI: rahul.mule@okhdfcbank USDT TRC20: TN2w5M41Z9sPq3XyK67L89vRt1Qwerty7u
      Short link: https://bit.ly/mule-deal
    `;
    const clues = extractAllClues(testPost);

    assert(clues.some(c => c.type === 'phone' && c.normalized_value === '+919820144912'), 'Extracted Indian mobile number');
    assert(clues.some(c => c.type === 'whatsapp'), 'Extracted WhatsApp link');
    assert(clues.some(c => c.type === 'upi' && c.normalized_value === 'rahul.mule@okhdfcbank'), 'Extracted UPI ID');
    assert(clues.some(c => c.type === 'ifsc' && c.normalized_value === 'HDFC0000240'), 'Extracted IFSC code');
    assert(clues.some(c => c.type === 'card_number' && c.masked_value === '453201******1980'), 'Extracted and validated card number');
    assert(clues.some(c => c.type === 'cvv'), 'Extracted CVV code');
    assert(clues.some(c => c.type === 'crypto_wallet' && c.subtype === 'TRC20_USDT'), 'Extracted TRC20 USDT wallet');
    assert(clues.some(c => c.type === 'url' && c.is_shortener === true), 'Extracted shortener URL');
  }

  // --- Suite 3: Risk Engine & Factor Breakdown ---
  console.log('\n📦 Suite 3: Explainable Risk Engine');
  {
    const threatPost = 'HDFC bank account for sale full kit with passbook cheque atm sim registered. Immediate delivery.';
    const clues = extractAllClues(threatPost);
    const risk = evaluateRisk({
      text: threatPost,
      platform: 'Telegram',
      username: 'mule_vendor',
      profileAgeDays: 5,
      followers: 12,
      clues,
      ocrText: '',
      entityHistory: {},
      evasionDetected: false,
      evasions: []
    });

    assert(risk.risk_score >= 70, `Illicit kit sale evaluated with high/critical risk score (${risk.risk_score})`);
    assert(risk.factor_breakdown.some(f => f.factor === 'SALE_RENT_INTENT'), 'Attributed SALE_RENT_INTENT factor');
    assert(risk.factor_breakdown.some(f => f.factor === 'KIT_SIM_BUNDLE'), 'Attributed KIT_SIM_BUNDLE factor');
    assert(risk.categories.includes('ACCOUNT_SALE_RENT'), 'Categorized as ACCOUNT_SALE_RENT');

    // Benign post evaluation
    const benignPost = 'State Bank of India official cyber security advisory: Never share your OTP or ATM PIN with anyone.';
    const benignClues = extractAllClues(benignPost);
    const benignRisk = evaluateRisk({
      text: benignPost,
      platform: 'X',
      username: 'OfficialSBI',
      profileAgeDays: 1200,
      followers: 50000,
      clues: benignClues,
      ocrText: '',
      entityHistory: {},
      evasionDetected: false,
      evasions: []
    });

    assert(benignRisk.risk_score <= 30, `Official advisory scored low/benign (${benignRisk.risk_score})`);
    assert(benignRisk.categories.includes('BENIGN'), 'Categorized as BENIGN');
  }

  // --- Suite 4: Coordinated Campaign Detection ---
  console.log('\n📦 Suite 4: Coordinated Campaign Detector');
  {
    const sampleCluster = [
      {
        id: 'TEST-01',
        platform: 'Telegram',
        username: 'bot_alpha_1',
        risk_score: 85,
        posted_at: new Date().toISOString(),
        text: 'Account for sale contact +919811002233 upi: flow@okhdfcbank',
        clues: [
          { type: 'phone', normalized_value: '+919811002233', masked_value: '+91 981****233' },
          { type: 'upi', normalized_value: 'flow@okhdfcbank', masked_value: 'fl***@okhdfcbank' }
        ]
      },
      {
        id: 'TEST-02',
        platform: 'WhatsApp',
        username: 'bot_alpha_2',
        risk_score: 80,
        posted_at: new Date(Date.now() + 180000).toISOString(),
        text: 'Bank account available for rent call +919811002233',
        clues: [
          { type: 'phone', normalized_value: '+919811002233', masked_value: '+91 981****233' }
        ]
      },
      {
        id: 'TEST-03',
        platform: 'X',
        username: 'bot_alpha_3',
        risk_score: 75,
        posted_at: new Date(Date.now() + 360000).toISOString(),
        text: 'Full kit account ready UPI flow@okhdfcbank',
        clues: [
          { type: 'upi', normalized_value: 'flow@okhdfcbank', masked_value: 'fl***@okhdfcbank' }
        ]
      }
    ];

    const { campaigns } = detectCampaigns(sampleCluster);
    assert(campaigns.length >= 1, 'Coordinated campaign detected across 3 accounts and platforms');
    assert(campaigns[0].ad_count >= 2, 'Campaign includes linked member ads');
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
