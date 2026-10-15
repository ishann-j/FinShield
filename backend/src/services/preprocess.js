/**
 * Preprocessing & Normalization Engine for FinGuard Sentinel
 * Handles de-obfuscation, leetspeak, zero-width characters, spaced text,
 * number-words to digits, and Hinglish normalization.
 */

// Common leetspeak substitutions
const LEET_MAP = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '@': 'a',
  '$': 's',
  '5': 's',
  '7': 't',
  '+': 't',
  '!': 'i',
  '|': 'l',
  '8': 'b',
  '9': 'g',
  '¥': 'y',
  '₹': 'rs'
};

// Common leetspeak whole terms mapped directly
const LEET_TERMS = [
  { regex: /\ba[cс0][cс0][o0]unt\b/gi, replacement: 'account' },
  { regex: /\ba\/c\b/gi, replacement: 'account' },
  { regex: /\bac\.\b/gi, replacement: 'account' },
  { regex: /\bb[@a4]nk\b/gi, replacement: 'bank' },
  { regex: /\bcurr[3e]nt\b/gi, replacement: 'current' },
  { regex: /\bs[a4]v[1i]ngs?\b/gi, replacement: 'savings' },
  { regex: /\bk[.\s]?y[.\s]?c\b/gi, replacement: 'kyc' },
  { regex: /\bp[@a]ssb[o0]{2}k\b/gi, replacement: 'passbook' },
  { regex: /\bch[3e]qu[3e]\b/gi, replacement: 'cheque' },
  { regex: /\bc[@a]rd\b/gi, replacement: 'card' },
  { regex: /\bcr[3e]d[1i]t\b/gi, replacement: 'credit' },
  { regex: /\bd[3e]b[1i]t\b/gi, replacement: 'debit' },
  { regex: /\bc[0o]mm[1i]ss[1i][0o]n\b/gi, replacement: 'commission' },
  { regex: /\bm[0o]n[3e]y\b/gi, replacement: 'money' },
  { regex: /\bl[1i]m[1i]t\b/gi, replacement: 'limit' },
  { regex: /\bturn[0o]v[3e]r\b/gi, replacement: 'turnover' },
  { regex: /\bc[@a]sh[o0]ut\b/gi, replacement: 'cashout' }
];

// Spaced letter patterns e.g. "b a n k", "a c c o u n t"
const SPACED_PATTERNS = [
  { regex: /\bb\s+a\s+n\s+k\b/gi, replacement: 'bank' },
  { regex: /\ba\s+c\s+c\s+o\s+u\s+n\s+t\b/gi, replacement: 'account' },
  { regex: /\bk\s+y\s+c\b/gi, replacement: 'kyc' },
  { regex: /\bc\s+a\s+r\s+d\b/gi, replacement: 'card' },
  { regex: /\bu\s+s\s+d\s+t\b/gi, replacement: 'usdt' },
  { regex: /\bu\s+p\s+i\b/gi, replacement: 'upi' },
  { regex: /\bc\s+v\s+v\b/gi, replacement: 'cvv' },
  { regex: /\bp\s+i\s+n\b/gi, replacement: 'pin' },
  { regex: /\bo\s+t\s+p\b/gi, replacement: 'otp' },
  { regex: /\bf\s+u\s+l\s+l\s+z\b/gi, replacement: 'fullz' }
];

// Number words to digits
const NUMBER_WORDS = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  shunya: '0',
  ek: '1',
  do: '2',
  teen: '3',
  char: '4',
  panch: '5',
  chhe: '6',
  saat: '7',
  aath: '8',
  nau: '9'
};

// Common Hinglish / Romanized Hindi slang terms
const HINGLISH_MAP = {
  khata: 'account',
  khate: 'accounts',
  bikau: 'for sale',
  kiraya: 'rent',
  kiraye: 'rent',
  chahiye: 'needed',
  dastavej: 'documents',
  kamai: 'earnings',
  rozana: 'daily',
  paisa: 'money',
  paise: 'money',
  turant: 'immediate',
  milega: 'will get'
};

export function preprocessText(text = '') {
  if (typeof text !== 'string') text = String(text || '');

  let evasions = [];
  let original = text;

  // 1. Check for zero-width characters
  const zeroWidthRegex = /[\u200B-\u200D\uFEFF\u202A-\u202E]/g;
  if (zeroWidthRegex.test(text)) {
    evasions.push('zero_width_characters');
  }
  let cleaned = text.replace(zeroWidthRegex, '');

  // 2. Unicode normalization (NFKD)
  cleaned = cleaned.normalize('NFKD');

  // 3. Spaced letters detection
  for (const { regex, replacement } of SPACED_PATTERNS) {
    if (regex.test(cleaned)) {
      evasions.push(`spaced_letters_${replacement}`);
      cleaned = cleaned.replace(regex, replacement);
    }
  }

  // 4. Specific leet terms
  for (const { regex, replacement } of LEET_TERMS) {
    if (regex.test(cleaned)) {
      evasions.push(`leetspeak_${replacement}`);
      cleaned = cleaned.replace(regex, replacement);
    }
  }

  // 5. Convert sequences of number words into digits
  // e.g. "nine eight seven six five four three two one zero" -> "9876543210"
  const numberWordRegex = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ek|do|teen|char|panch|chhe|saat|aath|nau)\b/gi;
  if (numberWordRegex.test(cleaned)) {
    const originalPreNum = cleaned;
    cleaned = cleaned.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ek|do|teen|char|panch|chhe|saat|aath|nau)(\s+(zero|one|two|three|four|five|six|seven|eight|nine|ek|do|teen|char|panch|chhe|saat|aath|nau))+\b/gi, (match) => {
      evasions.push('number_words_obfuscation');
      return match.toLowerCase().split(/\s+/).map(w => NUMBER_WORDS[w] || w).join('');
    });
  }

  // 6. Transliterated Hinglish terms normalization
  const words = cleaned.toLowerCase().split(/\s+/);
  const normalizedWords = words.map(w => {
    const cleanW = w.replace(/[^a-z0-9]/g, '');
    return HINGLISH_MAP[cleanW] || w;
  });

  return {
    originalText: original,
    cleanedText: cleaned,
    normalizedText: normalizedWords.join(' '),
    evasionDetected: evasions.length > 0,
    evasions: [...new Set(evasions)]
  };
}
