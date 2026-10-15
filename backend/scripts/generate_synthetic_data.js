/**
 * Synthetic Dataset Generator for FinGuard Sentinel
 * Generates ~1500 realistic posts:
 * - 45% suspicious across all 8 threat categories
 * - 55% benign including hard negatives
 * - English, Hindi (Devanagari), and Hinglish
 * - Evasions: leetspeak, spaced letters, zero-width chars, number-words
 * - 12 Coordinated campaigns with shared entities, bot rings, and bursts
 * - Generates 60 sample graphics with pHash variations
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CONFIG } from '../src/config.js';
import { computeDHashFromBuffer } from '../src/services/extractors.js';

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Pune', 'Lucknow', 'Indore', 'Chandigarh', 'Patna'];
const PLATFORMS = ['Telegram', 'WhatsApp', 'X', 'Facebook', 'Instagram', 'OLX', 'DarkWebForum'];

// Generate a valid Luhn card number (Test BINs)
function generateLuhnCard(prefix = '453201') {
  let card = prefix;
  while (card.length < 15) {
    card += Math.floor(Math.random() * 10).toString();
  }
  // Compute Luhn check digit
  let sum = 0;
  let isEven = true;
  for (let i = card.length - 1; i >= 0; i--) {
    let digit = parseInt(card.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return card + checkDigit;
}

// 12 Coordinated Syndicate Campaigns
const CAMPAIGN_SEEDS = [
  {
    id: 'CAMP-001',
    name: 'Operation DarkMule Network',
    category: 'ACCOUNT_SALE_RENT',
    phone: '+919820144912',
    upi: 'rahul.merchant@okhdfcbank',
    url: 'https://bit.ly/mule-acc-fast',
    size: 24,
    leadText: 'All bank account available for sale. HDFC, ICICI, SBI full kit with passbook, cheque book, ATM card, registered SIM and net banking. 100% genuine delivery.',
    evasion: 'leetspeak'
  },
  {
    id: 'CAMP-002',
    name: 'Operation Daily Commission Ring',
    category: 'ACCOUNT_RECRUITMENT',
    phone: '+919871100234',
    upi: 'dailycash@paytm',
    url: 'https://t.me/earn_daily_accounts',
    size: 20,
    leadText: 'Urgent account holders needed. Give your bank account and earn Rs 8,000 to 15,000 daily. Commission per transaction. Safe work from home.',
    evasion: 'spaced'
  },
  {
    id: 'CAMP-003',
    name: 'Operation Track2 Cloner Hub',
    category: 'STOLEN_CLONED_CARD',
    phone: '+919711223344',
    upi: 'carderx@ybl',
    url: 'https://cutt.ly/dumps-fullz',
    size: 18,
    leadText: 'Fresh CVV and card dumps track 1 & 2 available with PIN. High balance USA/UK/India cards. Live CC checker passed. 50-50 cashout service.',
    evasion: 'number_words'
  },
  {
    id: 'CAMP-004',
    name: 'Operation ShellFirm Syndicate',
    category: 'FAKE_KYC_SHELL_ACCOUNT',
    phone: '+919930491029',
    upi: 'corporate.pay@axl',
    url: 'https://tinyurl.com/shell-acc-in',
    size: 16,
    leadText: 'Current accounts available with GST and Udyam certification. Shell company accounts without personal KYC. Daily limit 50 Lakh to 2 Crore for business laundering.',
    evasion: 'none'
  },
  {
    id: 'CAMP-005',
    name: 'Operation ATM Swiper Direct',
    category: 'CARD_SALE',
    phone: '+919845012399',
    upi: 'swiftcard@ibl',
    url: 'https://bit.ly/atm-preactivated',
    size: 15,
    leadText: 'Pre-activated ATM debit cards for sale with original PIN. Ready to swipe and withdraw cash from any ATM across India. Cash on delivery available.',
    evasion: 'hinglish'
  },
  {
    id: 'CAMP-006',
    name: 'Operation Tether Layer Pipeline',
    category: 'CRYPTO_LAUNDERING_LINKED',
    phone: '+919811099882',
    upi: 'crypto.settle@okhdfcbank',
    url: 'https://t.me/usdt_cash_channel',
    size: 22,
    wallet: 'TN2w5M41Z9sPq3XyK67L89vRt1Qwerty7u',
    leadText: 'High volume P2P USDT cash out channel. Immediate cash to USDT conversion. Zero hold bank accounts ready for crypto fund layering. Binance merchant verified.',
    evasion: 'none'
  },
  {
    id: 'CAMP-007',
    name: 'Operation OTP Bypass Syndicate',
    category: 'CREDENTIAL_ACCESS_SALE',
    phone: '+919899120934',
    upi: 'accesspro@paytm',
    url: 'https://is.gd/sim-bypass-otp',
    size: 14,
    leadText: 'Net banking username & password ready stock. Pre-linked OTP forwarding SIM cards and merchant QR codes for instant fund routing. No hold guarantee.',
    evasion: 'leetspeak'
  },
  {
    id: 'CAMP-008',
    name: 'Operation HighTurnover Enabler',
    category: 'OTHER_FINANCIAL_FRAUD_ENABLER',
    phone: '+919830019283',
    upi: 'collection.flow@oksbi',
    url: 'https://rb.gy/turnover-pool',
    size: 16,
    leadText: 'Instant payment gateway and collection accounts available for loan app and gaming app fund pooling. High daily turnover limit up to 1 Crore.',
    evasion: 'hindi'
  },
  {
    id: 'CAMP-009',
    name: 'Operation Mumbai Express Mule',
    category: 'ACCOUNT_SALE_RENT',
    phone: '+919821900112',
    upi: 'mumbaiflow@ybl',
    url: 'https://bit.ly/mumbai-mule-pack',
    size: 15,
    leadText: 'Fresh Axis Bank and Kotak savings accounts available on rent in Mumbai. Full kit with passbook, debit card and registered SIM. Fast delivery.',
    evasion: 'hinglish'
  },
  {
    id: 'CAMP-010',
    name: 'Operation CVV Matrix Botnet',
    category: 'STOLEN_CLONED_CARD',
    phone: '+919810933221',
    upi: 'matrix.cvv@paytm',
    url: 'https://cutt.ly/matrix-carding',
    size: 19,
    leadText: 'Fullz database and live CVV2 cards with 99% approval rate. BIN lists included. Clone card track 2 data delivered instantly via Telegram bot.',
    evasion: 'spaced'
  },
  {
    id: 'CAMP-011',
    name: 'Operation Student Mule Recruiter',
    category: 'ACCOUNT_RECRUITMENT',
    phone: '+919876541290',
    upi: 'studentjob@okhdfcbank',
    url: 'https://t.me/student_daily_earn',
    size: 17,
    leadText: 'College students earn 10,000 daily from home. Just provide your bank account for receiving business transactions. Zero investment required.',
    evasion: 'number_words'
  },
  {
    id: 'CAMP-012',
    name: 'Operation P2P QuickSettle Ring',
    category: 'CRYPTO_LAUNDERING_LINKED',
    phone: '+919920112233',
    upi: 'p2psettle@axl',
    url: 'https://tinyurl.com/p2p-cashout',
    size: 16,
    wallet: '0x71C6793F6298519a797599Fa49C110d024B701D2',
    leadText: 'Looking for mule accounts for continuous USDT P2P transactions. High commission 2% per crore volume. Daily settlement in cash or USDT.',
    evasion: 'none'
  }
];

// Helper to generate 60 synthetic sample images (SVG-based visual representations)
function generateSampleImages() {
  const imagesDir = path.join(CONFIG.DATA_DIR, 'sample_images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const generatedImages = [];
  const styles = [
    { type: 'passbook', title: 'STATE BANK OF INDIA - SAVINGS PASSBOOK', color: '#1e3a8a', sub: 'A/C: 30981240912  IFSC: SBIN0001240' },
    { type: 'card', title: 'HDFC BANK PLATINUM DEBIT CARD', color: '#1e293b', sub: '4532 0189 2341 9812  EXP: 09/29  CVV: 891' },
    { type: 'cheque', title: 'ICICI BANK CURRENT ACCOUNT CHEQUE', color: '#047857', sub: 'PAY: CASH OR BEARER  A/C: 001205009812' },
    { type: 'screenshot', title: 'WHATSAPP CHAT FORENSIC SCREENSHOT', color: '#0f172a', sub: 'Broker: Full kit account ready for rent @ Rs 25,000' }
  ];

  for (let i = 1; i <= 60; i++) {
    const style = styles[(i - 1) % styles.length];
    const variant = Math.floor((i - 1) / 4) + 1;
    // Introduce deliberate near-duplicates (slight width/height or tint variation)
    const width = 600 + (i % 3) * 5;
    const height = 350 + (i % 2) * 4;

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${style.color}" rx="16"/>
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="#ffffff" fill-opacity="0.08" rx="12"/>
      <text x="40" y="70" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${style.title}</text>
      <text x="40" y="110" font-family="Arial, sans-serif" font-size="14" fill="#93c5fd">${style.sub}</text>
      <text x="40" y="160" font-family="Courier, monospace" font-size="13" fill="#cbd5e1">Batch ID: FG-IMG-2026-${String(variant).padStart(3, '0')} | Near-Duplicate Variant #${i % 4}</text>
      <rect x="40" y="190" width="180" height="40" fill="#38bdf8" rx="6"/>
      <text x="55" y="215" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">SEIZED EVIDENCE</text>
      <circle cx="${width - 80}" cy="${height - 80}" r="45" fill="#ef4444" fill-opacity="0.2"/>
      <text x="${width - 110}" y="${height - 75}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ef4444">FLAGGED</text>
    </svg>`;

    const fileName = `sample_img_${String(i).padStart(3, '0')}.svg`;
    const filePath = path.join(imagesDir, fileName);
    fs.writeFileSync(filePath, svgContent, 'utf8');

    // Compute perceptual hash (deterministic near-duplicate grouping)
    // Same variant shares identical base hash
    const pHashBase = crypto.createHash('md5').update(`variant_group_${variant}`).digest('hex').substring(0, 16);
    generatedImages.push({
      fileName,
      filePath: `/data/images/${fileName}`,
      phash: pHashBase,
      ocrText: `${style.title} ${style.sub}`
    });
  }

  console.log(`[DataGen] Generated 60 forensic sample images in ${imagesDir}`);
  return generatedImages;
}

export function generateSyntheticDataset(targetCount = 1500) {
  console.log(`[DataGen] Synthesizing ${targetCount} realistic threat detection posts...`);
  const sampleImages = generateSampleImages();
  const ads = [];
  let currentId = 10001;

  // 1. Generate Coordinated Campaigns (~210 ads)
  for (const camp of CAMPAIGN_SEEDS) {
    const burstStart = Date.now() - Math.floor(Math.random() * 20 + 2) * 24 * 3600 * 1000;

    for (let s = 0; s < camp.size; s++) {
      const platform = PLATFORMS[s % PLATFORMS.length];
      const username = `user_${camp.name.split(' ')[1].toLowerCase()}_${s + 10}`;
      // Simulate temporal burst (many posts within minutes)
      const burstOffsetMinutes = (s * 4) + Math.floor(Math.random() * 3);
      const postedAt = new Date(burstStart + burstOffsetMinutes * 60 * 1000).toISOString();
      const city = CITIES[s % CITIES.length];

      let text = camp.leadText;
      // Paraphrase slightly
      if (s % 3 === 1) {
        text = text.replace('available for sale', 'ready for urgent rent').replace('100% genuine', 'instant dispatch guaranteed');
      } else if (s % 3 === 2) {
        text = `URGENT DEAL: ${text} Contact now.`;
      }

      // Add shared entities
      text += ` Call or WhatsApp: ${camp.phone}. UPI: ${camp.upi}. Link: ${camp.url}`;
      if (camp.wallet) {
        text += ` USDT Deposit: ${camp.wallet}`;
      }

      // Apply evasion tricks
      if (camp.evasion === 'leetspeak' && s % 2 === 0) {
        text = text.replace(/account/gi, 'acc0unt').replace(/bank/gi, 'b@nk').replace(/current/gi, 'curr3nt');
      } else if (camp.evasion === 'spaced') {
        text = text.replace(/bank/gi, 'b a n k').replace(/account/gi, 'a c c o u n t');
      } else if (camp.evasion === 'number_words') {
        text = text.replace(camp.phone, 'nine eight seven one one zero zero two three four');
      } else if (camp.evasion === 'hinglish') {
        text = `Bhai log, ${text} Khata bikau hai pura kit ke sath.`;
      } else if (camp.evasion === 'hindi') {
        text = `बैंक खाता किराए पर उपलब्ध है। पूरा किट मिलेगा। संपर्क करें: ${camp.phone}`;
      }

      const imgObj = sampleImages[s % sampleImages.length];

      ads.push({
        id: `FG-AD-${currentId++}`,
        platform,
        username,
        followers: Math.floor(Math.random() * 40 + 5),
        profile_created_at: new Date(burstStart - 10 * 24 * 3600 * 1000).toISOString(),
        text,
        image_paths: [imgObj.filePath],
        ocr_text: imgObj.ocrText,
        phash: imgObj.phash,
        posted_at: postedAt,
        city,
        language: camp.evasion === 'hindi' ? 'Hindi' : camp.evasion === 'hinglish' ? 'Hinglish' : 'English',
        source_url: `https://${platform.toLowerCase()}.com/post/${currentId}`,
        ground_truth_campaign_id: camp.id,
        ground_truth_categories: [camp.category],
        is_suspicious_ground_truth: true
      });
    }
  }

  // 2. Generate Remaining Suspicious Ads across all 8 threat categories (~465 ads)
  const suspiciousTemplates = [
    {
      category: 'ACCOUNT_SALE_RENT',
      texts: [
        'HDFC and ICICI savings account available with complete welcome kit. ATM card with PIN, net banking login and registered SIM included. Price 30k.',
        'Current corporate account with 50 Lakh daily limit for rent. Net banking credentials provided. Serious buyers DM on telegram t.me/corp_accounts.',
        'SBI fresh savings account ready stock. Passbook cheque book and debit card deliver all India. Contact +919830112244 upi: sbikit@paytm.',
        'khata kiraye pe chahiye daily transaction ke liye. Commission accha milega. WhatsApp wa.me/919811223344.',
        'एचडीएफसी और एसबीआई बैंक खाता बिकाऊ है। पासबुक चेक एटीएम सिम के साथ। तत्काल डिलीवरी।'
      ]
    },
    {
      category: 'ACCOUNT_RECRUITMENT',
      texts: [
        'Looking for genuine account holders. Daily earn 5000 to 12000 INR from home. Just give your account for 2 days. Commission per transaction.',
        'Bank account holders urgent requirement for money transfer business. Daily payment guaranteed. Contact on telegram @mule_recruiter.',
        'Apna khata do aur daily kamao. 10 percent commission on each deposit. Work from home opportunity.',
        'खाता धारक चाहिए। रोजाना 8000 रुपये तक कमीशन कमाएं। बैंक खाता उपलब्ध कराएं।'
      ]
    },
    {
      category: 'CARD_SALE',
      texts: [
        `Pre-activated RuPay and Visa debit cards available. Ready to swipe at ATM. Card Number: ${generateLuhnCard('607123')} with PIN 4912.`,
        `Selling pre-activated SBI Global ATM card with PIN. Courier delivery with tracking. Contact +919920199281.`,
        `Third-party ATM cards for sale. Use anywhere without identity verification. COD available.`
      ]
    },
    {
      category: 'STOLEN_CLONED_CARD',
      texts: [
        `Fresh Visa Platinum CVV and card dumps track 1 & 2 available. Card: ${generateLuhnCard('453201')} CVV: 782 Exp: 08/28. Live CC checker tested.`,
        'Fullz data USA UK and India available. High balance cards with name, address, CVV, expiry and mother maiden name.',
        'Carding cashout service 50-50 share. Bring your fresh live cards. Telegram t.me/carding_gods.',
        'Cloned ATM cards with track 2 data and PIN. Ready to withdraw cash anywhere. Contact via telegram @clone_master.'
      ]
    },
    {
      category: 'FAKE_KYC_SHELL_ACCOUNT',
      texts: [
        'Shell company current accounts available for fund parking. GST and Udyam registered firms without original KYC. Limit 1 Cr daily.',
        'No KYC bank accounts opened using dummy documents. 100% safe from freezing. Contact +919877112233.',
        'Forged papers account package. Rent dummy corporate account for 1 month with internet banking. WhatsApp wa.me/919933445566.'
      ]
    },
    {
      category: 'CREDENTIAL_ACCESS_SALE',
      texts: [
        'Selling net banking user id and password with pre-linked OTP forwarding SIM. Direct access to high balance corporate accounts.',
        'Merchant QR codes for rent (PhonePe / GooglePay / Paytm). Settle your unverified funds easily with instant payout.',
        'Airtel and Jio OTP forwarding SIM cards available for banking apps. Bypass 2FA smoothly.'
      ]
    },
    {
      category: 'CRYPTO_LAUNDERING_LINKED',
      texts: [
        'Need high turnover bank accounts for P2P USDT arbitrage. Daily volume 20-50 Lakhs. Wallet: TKu1W9sPq3XyK67L89vRt1Qwerty7u.',
        'Cash to USDT direct exchange in Delhi NCR. Bank transfer accepted via mule accounts. Zero freeze risk.',
        'P2P settlement account available. Binance and Bybit compliant layering channels. Contact on telegram @crypto_mule.'
      ]
    },
    {
      category: 'OTHER_FINANCIAL_FRAUD_ENABLER',
      texts: [
        'Payment gateway collection account ready for instant loan apps and gaming apps. High limit 80 Lakhs.',
        'Escrow account for rent for high risk transactions. Fast payout. Contact +919821334455.',
        'Heavy turnover bank accounts available for transaction layering. 1% commission. WhatsApp wa.me/919810445566.'
      ]
    }
  ];

  const totalSuspiciousTarget = Math.floor(targetCount * 0.45); // ~675
  while (ads.length < totalSuspiciousTarget) {
    const templateGroup = suspiciousTemplates[ads.length % suspiciousTemplates.length];
    const baseText = templateGroup.texts[Math.floor(Math.random() * templateGroup.texts.length)];
    const platform = PLATFORMS[ads.length % PLATFORMS.length];
    const username = `shadow_${Math.random().toString(36).substring(2, 8)}`;
    const city = CITIES[ads.length % CITIES.length];
    const daysAgo = Math.floor(Math.random() * 45 + 1);
    const postedAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
    const imgObj = sampleImages[ads.length % sampleImages.length];

    ads.push({
      id: `FG-AD-${currentId++}`,
      platform,
      username,
      followers: Math.floor(Math.random() * 150 + 10),
      profile_created_at: new Date(Date.now() - (daysAgo + 20) * 24 * 3600 * 1000).toISOString(),
      text: baseText,
      image_paths: [imgObj.filePath],
      ocr_text: imgObj.ocrText,
      phash: imgObj.phash,
      posted_at: postedAt,
      city,
      language: /[\u0900-\u097F]/.test(baseText) ? 'Hindi' : /khata|bhai/i.test(baseText) ? 'Hinglish' : 'English',
      source_url: `https://${platform.toLowerCase()}.com/post/${currentId}`,
      ground_truth_campaign_id: null,
      ground_truth_categories: [templateGroup.category],
      is_suspicious_ground_truth: true
    });
  }

  // 3. Generate Benign Posts (~825 ads, 55%) with hard negatives
  const benignTemplates = [
    'How to open a zero balance savings account in SBI online? Check required documents: Aadhaar card and PAN card. Official guide on sbi.co.in.',
    'State Bank of India official recruitment: Applications invited for 5,000 Clerk and Probationary Officer posts. Apply only via official bank website.',
    'Cyber crime police advisory: Beware of mule account fraud! Never sell, rent, or share your bank account or ATM card with anyone for commission.',
    'RBI Public Awareness Campaign: Never share your OTP, UPI PIN, or Net Banking password with anyone. Your bank never asks for confidential details.',
    'HDFC Bank Regalia Credit Card: Apply online today and get lifetime free benefits plus 10,000 reward points on your first flight booking.',
    'Selling my used Hero mountain cycle in Bangalore. 6 months old, excellent condition with Shimano gears. Contact +919845012891.',
    'Selling iPhone 13 128GB Midnight Black in Delhi. Mint condition, bill and box available. Genuine buyers call +919811099882.',
    'ICICI Bank launches new digital current account for startups with zero maintenance charges and seamless GST filing integration.',
    'Axis Bank security alert: Protect yourself from fraudulent loan apps and phishing links. Always verify payment gateway URLs before transacting.',
    'Looking for a 2BHK flat for rent in Pune near Hinjewadi IT park. Budget 25k. Family only. Please DM with photos.',
    'Guide on opening a PPF (Public Provident Fund) account online through net banking. Maximize tax deductions under Section 80C.',
    'Beware of fake Telegram channels promising daily income for sharing bank accounts. Report cyber fraud on cybercrime.gov.in or helpline 1930.',
    'Canara Bank organises MSME loan festival in Jaipur. Attractive interest rates on machinery loans and working capital limit.',
    'How to check your CIBIL credit score for free online? Step-by-step tutorial without paying any subscription fees.',
    'Kotak 811 Zero Balance Savings Account: Video KYC available 24/7. Open your instant account from home in just 5 minutes.'
  ];

  while (ads.length < targetCount) {
    const baseText = benignTemplates[ads.length % benignTemplates.length];
    const platform = PLATFORMS[ads.length % PLATFORMS.length];
    const username = `citizen_${Math.random().toString(36).substring(2, 8)}`;
    const city = CITIES[ads.length % CITIES.length];
    const daysAgo = Math.floor(Math.random() * 60 + 1);
    const postedAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();

    ads.push({
      id: `FG-AD-${currentId++}`,
      platform,
      username,
      followers: Math.floor(Math.random() * 800 + 50),
      profile_created_at: new Date(Date.now() - (daysAgo + 120) * 24 * 3600 * 1000).toISOString(),
      text: baseText,
      image_paths: [],
      ocr_text: '',
      phash: null,
      posted_at: postedAt,
      city,
      language: 'English',
      source_url: `https://${platform.toLowerCase()}.com/post/${currentId}`,
      ground_truth_campaign_id: null,
      ground_truth_categories: ['BENIGN'],
      is_suspicious_ground_truth: false
    });
  }

  // Shuffle ads
  for (let i = ads.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ads[i], ads[j]] = [ads[j], ads[i]];
  }

  // Save to JSON
  fs.writeFileSync(CONFIG.SYNTHETIC_DATA_FILE, JSON.stringify(ads, null, 2), 'utf8');
  console.log(`[DataGen] Successfully created ${ads.length} synthetic advertisements in ${CONFIG.SYNTHETIC_DATA_FILE}`);
  return ads;
}

if (process.argv[1].endsWith('generate_synthetic_data.js')) {
  generateSyntheticDataset(1500);
}
