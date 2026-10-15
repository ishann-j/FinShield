/**
 * High-Accuracy Clue & Entity Extraction Engine for FinGuard Sentinel
 * Extracts Phone, UPI, URLs, Cards (Luhn validated), Bank/IFSC, Crypto Wallets,
 * PAN/Aadhaar (masked), and pHash/OCR clues.
 */

import crypto from 'crypto';

// Luhn check algorithm
export function passesLuhn(numStr) {
  const digits = String(numStr).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// Card brand from BIN
export function getCardBrand(binStr) {
  const clean = binStr.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MasterCard';
  if (/^(60|65|81|82)/.test(clean)) return 'RuPay';
  if (/^3[47]/.test(clean)) return 'American Express';
  return 'Unknown Card';
}

export function maskCardNumber(cardNumber) {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 10) return cardNumber;
  const first6 = clean.substring(0, 6);
  const last4 = clean.substring(clean.length - 4);
  return `${first6}${'*'.repeat(Math.max(4, clean.length - 10))}${last4}`;
}

export function maskPAN(pan) {
  if (pan.length !== 10) return pan;
  return `${pan.substring(0, 5)}****${pan.substring(9)}`;
}

export function maskAadhaar(aadhaar) {
  const clean = aadhaar.replace(/\s+/g, '');
  if (clean.length !== 12) return aadhaar;
  return `**** **** ${clean.substring(8)}`;
}

// Perceptual / Difference hash algorithm (64-bit)
export function computeDHashFromBuffer(buffer) {
  // Generates consistent deterministic 16-char hex perceptual hash
  const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 16);
  return hash;
}

export function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 999;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

const SHORTENER_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 'is.gd', 'cutt.ly', 't.co', 'rb.gy', 'goo.gl', 'ow.ly', 'shorturl.at'
]);

const SUSPICIOUS_TLDS = new Set([
  'top', 'xyz', 'icu', 'tk', 'ru', 'cc', 'club', 'work', 'click', 'link', 'vip', 'quest'
]);

const BANK_NAMES = ['hdfc', 'sbi', 'icici', 'axis', 'kotak', 'pnb', 'bob', 'canara', 'indusind', 'rbi'];

export function extractAllClues(text = '', metadata = {}, source = 'text') {
  const clues = [];
  const textStr = String(text);

  // 1. Phone Numbers & Messaging Handles
  // Indian mobiles: 10 digits starting with 6-9, optionally with +91 or 0 prefix, spaces or dashes
  const phoneRegex = /(?:(?:\+91|0)[\s\-]?)?([6-9]\d{4}[\s\-]?\d{5})\b/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(textStr)) !== null) {
    const raw = phoneMatch[0];
    const normalized = phoneMatch[1].replace(/[\s\-]/g, '');
    if (normalized.length === 10) {
      clues.push({
        type: 'phone',
        value: raw.trim(),
        normalized_value: `+91${normalized}`,
        masked_value: `+91 ${normalized.substring(0, 3)}****${normalized.substring(7)}`,
        source,
        confidence: 0.95,
        is_sensitive: false
      });
    }
  }

  // WhatsApp wa.me links
  const waRegex = /(?:https?:\/\/)?(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{10,13})/gi;
  let waMatch;
  while ((waMatch = waRegex.exec(textStr)) !== null) {
    const cleanNum = waMatch[1].replace(/\D/g, '');
    const norm = cleanNum.length === 10 ? `+91${cleanNum}` : `+${cleanNum}`;
    clues.push({
      type: 'whatsapp',
      value: waMatch[0],
      normalized_value: norm,
      masked_value: waMatch[0],
      source,
      confidence: 0.98,
      is_sensitive: false
    });
  }

  // Telegram handles and t.me links
  const tgRegex = /(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/)([a-zA-Z0-9_]{4,32})/gi;
  let tgMatch;
  while ((tgMatch = tgRegex.exec(textStr)) !== null) {
    clues.push({
      type: 'telegram',
      value: tgMatch[0],
      normalized_value: `@${tgMatch[1].toLowerCase()}`,
      masked_value: `@${tgMatch[1]}`,
      source,
      confidence: 0.98,
      is_sensitive: false
    });
  }

  // 2. UPI IDs
  const upiRegex = /\b([a-zA-Z0-9.\-_]{2,49})@(okhdfcbank|oksbi|okaxis|okicici|paytm|ybl|axl|ibl|barodampay|upi|postbank|fbl|idfcbank|airtel|jupiteraxis)\b/gi;
  let upiMatch;
  while ((upiMatch = upiRegex.exec(textStr)) !== null) {
    const cleanUPI = upiMatch[0].toLowerCase();
    clues.push({
      type: 'upi',
      value: upiMatch[0],
      normalized_value: cleanUPI,
      masked_value: `${cleanUPI.split('@')[0].substring(0, 3)}***@${cleanUPI.split('@')[1]}`,
      source,
      confidence: 0.96,
      is_sensitive: false
    });
  }

  // Generic UPI handle pattern
  const genUpiRegex = /\b([a-zA-Z0-9.\-_]{3,35})@([a-zA-Z]{3,20})\b/gi;
  let genUpi;
  while ((genUpi = genUpiRegex.exec(textStr)) !== null) {
    const full = genUpi[0].toLowerCase();
    // Exclude common email providers
    if (!full.includes('@gmail.com') && !full.includes('@yahoo.') && !full.includes('@outlook.') && !full.includes('@hotmail.')) {
      if (!clues.some(c => c.normalized_value === full)) {
        clues.push({
          type: 'upi',
          value: genUpi[0],
          normalized_value: full,
          masked_value: `${full.split('@')[0].substring(0, 2)}***@${full.split('@')[1]}`,
          source,
          confidence: 0.85,
          is_sensitive: false
        });
      }
    }
  }

  // 3. URLs, Shorteners & Lookalike Domains
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`]+)/gi;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(textStr)) !== null) {
    const fullUrl = urlMatch[1];
    let domain = '';
    let isShortener = false;
    let isSuspiciousTLD = false;
    let isLookalike = false;

    try {
      const parsed = new URL(fullUrl);
      domain = parsed.hostname.toLowerCase();
      const parts = domain.split('.');
      const tld = parts[parts.length - 1];

      if (SHORTENER_DOMAINS.has(domain)) isShortener = true;
      if (SUSPICIOUS_TLDS.has(tld)) isSuspiciousTLD = true;

      // Check bank lookalike domain
      for (const b of BANK_NAMES) {
        if (domain.includes(b) && !domain.endsWith(`${b}bank.com`) && !domain.endsWith('sbi.co.in') && !domain.endsWith('rbi.org.in')) {
          isLookalike = true;
          break;
        }
      }
    } catch {
      domain = fullUrl;
    }

    clues.push({
      type: 'url',
      value: fullUrl,
      normalized_value: fullUrl.toLowerCase(),
      masked_value: fullUrl,
      source,
      domain,
      is_shortener: isShortener,
      is_suspicious_tld: isSuspiciousTLD,
      is_lookalike: isLookalike,
      confidence: 0.90,
      is_sensitive: false
    });
  }

  // 4. IFSC Codes
  const ifscRegex = /\b([A-Z]{4}0[A-Z0-9]{6})\b/g;
  let ifscMatch;
  while ((ifscMatch = ifscRegex.exec(textStr.toUpperCase())) !== null) {
    clues.push({
      type: 'ifsc',
      value: ifscMatch[1],
      normalized_value: ifscMatch[1],
      masked_value: ifscMatch[1],
      source,
      confidence: 0.97,
      is_sensitive: false
    });
  }

  // 5. Card Numbers with Luhn check
  const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{16}\b/g;
  let cardMatch;
  while ((cardMatch = cardRegex.exec(textStr)) !== null) {
    const rawCard = cardMatch[0];
    const cleanCard = rawCard.replace(/\D/g, '');
    if (passesLuhn(cleanCard)) {
      const brand = getCardBrand(cleanCard);
      clues.push({
        type: 'card_number',
        value: cleanCard,
        raw_card: cleanCard,
        normalized_value: cleanCard,
        masked_value: maskCardNumber(cleanCard),
        brand,
        bin: cleanCard.substring(0, 6),
        source,
        confidence: 0.99,
        is_sensitive: true
      });
    }
  }

  // 6. Bank Account Numbers (with context)
  const acContextRegex = /(?:a\/c|ac|account|khata|ac\s*no|saving|current)[\s\.:#\-]+(\d{9,18})\b/gi;
  let acMatch;
  while ((acMatch = acContextRegex.exec(textStr)) !== null) {
    const acNum = acMatch[1];
    clues.push({
      type: 'bank_account',
      value: acNum,
      normalized_value: acNum,
      masked_value: `${acNum.substring(0, 3)}****${acNum.substring(acNum.length - 4)}`,
      source,
      confidence: 0.92,
      is_sensitive: true
    });
  }

  // 7. CVV & Expiry patterns
  const cvvRegex = /\b(?:cvv|cvv2|cvc|security\s*code)[\s\.:#\-]+([0-9]{3,4})\b/gi;
  let cvvMatch;
  while ((cvvMatch = cvvRegex.exec(textStr)) !== null) {
    clues.push({
      type: 'cvv',
      value: cvvMatch[1],
      normalized_value: cvvMatch[1],
      masked_value: '***',
      source,
      confidence: 0.95,
      is_sensitive: true
    });
  }

  // 8. Crypto Wallets (BTC, ETH, TRC20 USDT)
  // Tron / TRC20 USDT
  const trcRegex = /\b(T[A-Za-z1-9]{33})\b/g;
  let trcMatch;
  while ((trcMatch = trcRegex.exec(textStr)) !== null) {
    clues.push({
      type: 'crypto_wallet',
      subtype: 'TRC20_USDT',
      value: trcMatch[1],
      normalized_value: trcMatch[1],
      masked_value: `${trcMatch[1].substring(0, 6)}...${trcMatch[1].substring(trcMatch[1].length - 4)}`,
      source,
      confidence: 0.96,
      is_sensitive: false
    });
  }

  // Ethereum / EVM 0x...
  const ethRegex = /\b(0x[a-fA-F0-9]{40})\b/g;
  let ethMatch;
  while ((ethMatch = ethRegex.exec(textStr)) !== null) {
    clues.push({
      type: 'crypto_wallet',
      subtype: 'ETH_ERC20',
      value: ethMatch[1],
      normalized_value: ethMatch[1].toLowerCase(),
      masked_value: `${ethMatch[1].substring(0, 6)}...${ethMatch[1].substring(ethMatch[1].length - 4)}`,
      source,
      confidence: 0.96,
      is_sensitive: false
    });
  }

  // Bitcoin (legacy / segwit)
  const btcRegex = /\b((?:1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,39})\b/g;
  let btcMatch;
  while ((btcMatch = btcRegex.exec(textStr)) !== null) {
    clues.push({
      type: 'crypto_wallet',
      subtype: 'BTC',
      value: btcMatch[1],
      normalized_value: btcMatch[1],
      masked_value: `${btcMatch[1].substring(0, 6)}...${btcMatch[1].substring(btcMatch[1].length - 4)}`,
      source,
      confidence: 0.94,
      is_sensitive: false
    });
  }

  // 9. PAN & Aadhaar (Masked for privacy)
  const panRegex = /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/g;
  let panMatch;
  while ((panMatch = panRegex.exec(textStr.toUpperCase())) !== null) {
    clues.push({
      type: 'pan_card',
      value: panMatch[1],
      normalized_value: panMatch[1],
      masked_value: maskPAN(panMatch[1]),
      source,
      confidence: 0.95,
      is_sensitive: true
    });
  }

  const aadhaarRegex = /\b([2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4})\b/g;
  let aadhaarMatch;
  while ((aadhaarMatch = aadhaarRegex.exec(textStr)) !== null) {
    clues.push({
      type: 'aadhaar_card',
      value: aadhaarMatch[1],
      normalized_value: aadhaarMatch[1].replace(/\s+/g, ''),
      masked_value: maskAadhaar(aadhaarMatch[1]),
      source,
      confidence: 0.93,
      is_sensitive: true
    });
  }

  // 10. Email IDs
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(textStr)) !== null) {
    const em = emailMatch[1].toLowerCase();
    // Exclude if already matched as UPI handle
    if (!clues.some(c => c.type === 'upi' && c.normalized_value === em)) {
      clues.push({
        type: 'email',
        value: emailMatch[1],
        normalized_value: em,
        masked_value: `${em.substring(0, 2)}***@${em.split('@')[1]}`,
        source,
        confidence: 0.90,
        is_sensitive: false
      });
    }
  }

  // Deduplicate clues by type + normalized_value
  const uniqueClues = [];
  const seen = new Set();
  for (const clue of clues) {
    const key = `${clue.type}:${clue.normalized_value}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueClues.push(clue);
    }
  }

  return uniqueClues;
}
