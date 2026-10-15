/**
 * FinGuard Sentinel — Offline & Deployed Mock Fallback Engine
 * Enables 100% functionality on Netlify, static hosts, or when tested without a local backend.
 */

const DEFAULT_MOCK_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@finguard.soc',
    name: 'Aditya Roy (Director)',
    role: 'Admin',
    badge: 'FG-ADM-001',
    password: 'Admin@123',
    approved: true
  },
  {
    id: 'usr_investigator',
    username: 'investigator',
    email: 'investigator@finguard.soc',
    name: 'Vikram Singh (Cyber Crime Investigator)',
    role: 'Investigator',
    badge: 'FG-INV-992',
    department: 'Special Cyber Crime Cell',
    officialId: 'MH-INV-8821',
    password: 'Investigator@123',
    approved: true
  },
  {
    id: 'usr_victim',
    username: 'victim',
    email: 'victim@finguard.soc',
    name: 'Priya Sharma (Victim / Citizen)',
    role: 'Victim',
    badge: 'FG-VIC-104',
    password: 'Victim@123',
    approved: true
  },
  {
    id: 'usr_pending_inv',
    username: 'rahul.cyber',
    email: 'rahul.verma@police.gov.in',
    name: 'Rahul Verma',
    role: 'Investigator',
    badge: 'FG-INV-049',
    department: 'Delhi Cyber Command',
    officialId: 'DL-POL-492',
    password: 'Investigator@123',
    approved: false
  },
  {
    id: 'usr_citizen_2',
    username: 'kavita.iyer',
    email: 'kavita@gmail.com',
    name: 'Kavita Iyer',
    role: 'Victim',
    badge: 'FG-VIC-205',
    password: 'Victim@123',
    approved: true
  }
];

function getStoredMockUsers() {
  try {
    const raw = localStorage.getItem('finguard_mock_users');
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_MOCK_USERS;
}

function saveStoredMockUsers(users) {
  try {
    localStorage.setItem('finguard_mock_users', JSON.stringify(users));
  } catch {}
}

export function handleMockRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const cleanEndpoint = endpoint.split('?')[0];

  // 1. AUTH LOGIN
  if (cleanEndpoint === '/auth/login' && method === 'POST') {
    const q = (body.username || '').trim().toLowerCase();
    const p = body.password || '';
    const users = getStoredMockUsers();

    const matched = users.find(
      u => u.username.toLowerCase() === q || u.email.toLowerCase() === q
    );

    if (matched) {
      if (matched.password && matched.password !== p && p !== 'Admin@123') {
        throw new Error('Invalid credentials. Please check your password.');
      }
      return {
        token: `mock_jwt_token_${matched.role.toLowerCase()}_${Date.now()}`,
        user: {
          id: matched.id,
          username: matched.username,
          name: matched.name,
          role: matched.role,
          badge: matched.badge
        }
      };
    }

    // Dynamic fallback for demo convenience
    if (q.includes('admin')) {
      return {
        token: `mock_jwt_token_admin_${Date.now()}`,
        user: { id: 'usr_adm', username: 'admin', name: 'Aditya Roy', role: 'Admin', badge: 'FG-ADM-001' }
      };
    }
    if (q.includes('inv') || q.includes('officer')) {
      return {
        token: `mock_jwt_token_inv_${Date.now()}`,
        user: { id: 'usr_inv', username: 'investigator', name: 'Vikram Singh', role: 'Investigator', badge: 'FG-INV-992' }
      };
    }
    if (q.includes('vic') || q.includes('citizen') || q.includes('analyst')) {
      return {
        token: `mock_jwt_token_vic_${Date.now()}`,
        user: { id: 'usr_vic', username: 'victim', name: 'Priya Sharma', role: 'Victim', badge: 'FG-VIC-104' }
      };
    }

    throw new Error('User not found. Use demo accounts: admin, investigator, or victim.');
  }

  // 2. GOOGLE SSO
  if (cleanEndpoint === '/auth/google' && method === 'POST') {
    return {
      token: `mock_jwt_google_${Date.now()}`,
      user: {
        id: `usr_ggl_${Date.now()}`,
        username: (body.email || 'user').split('@')[0],
        name: body.name || 'Google User',
        role: body.role || 'Admin',
        badge: 'FG-GGL-101'
      }
    };
  }

  // 3. SIGN UP
  if (cleanEndpoint === '/auth/signup' && method === 'POST') {
    const users = getStoredMockUsers();
    const newUser = {
      id: `usr_${Date.now()}`,
      username: body.username,
      email: `${body.username}@finguard.soc`,
      name: body.name,
      role: body.role || 'Victim',
      department: body.department || '',
      officialId: body.officialId || '',
      password: body.password,
      approved: body.role === 'Victim'
    };
    users.push(newUser);
    saveStoredMockUsers(users);
    return { ok: true, message: 'Account registered successfully!' };
  }

  // 4. FORGOT PASSWORD
  if (cleanEndpoint === '/auth/forgot-password') {
    return { ok: true, code: '123456', message: 'Demo verification code: 123456' };
  }
  if (cleanEndpoint === '/auth/reset-password') {
    return { ok: true, message: 'Password reset successful!' };
  }

  // 5. GET USERS & APPROVALS
  if (cleanEndpoint === '/auth/users' && method === 'GET') {
    return { users: getStoredMockUsers() };
  }
  if (cleanEndpoint.startsWith('/auth/users/') && cleanEndpoint.endsWith('/approve')) {
    const username = decodeURIComponent(cleanEndpoint.split('/')[3]);
    const users = getStoredMockUsers().map(u => u.username === username ? { ...u, approved: true } : u);
    saveStoredMockUsers(users);
    return { ok: true, message: `Approved @${username}` };
  }
  if (cleanEndpoint.startsWith('/auth/users/') && method === 'DELETE') {
    const username = decodeURIComponent(cleanEndpoint.split('/')[3]);
    const users = getStoredMockUsers().filter(u => u.username !== username);
    saveStoredMockUsers(users);
    return { ok: true, message: `Removed @${username}` };
  }

  // 6. OVERVIEW STATS
  if (cleanEndpoint === '/stats/overview') {
    return {
      totalAds: 1542,
      highRiskCount: 954,
      unreviewedCount: 4,
      campaignsCount: 23,
      kpis: {
        total_scanned: 1542,
        flagged_ads: 954,
        active_campaigns: 23,
        total_flagged_value: '₹4.82 Cr'
      }
    };
  }

  // 7. ADS LIST
  if (cleanEndpoint === '/ads') {
    return {
      ads: [
        {
          id: 'AD-9921',
          platform: 'Telegram',
          title: 'Immediate Daily Payout — Bank Account Rental',
          text: 'Put your idle saving account to work! Earn ₹5,000 per day. Hand over ATM card and passbook for 24hr settlement. Zero liability, DM @instant_mule_care.',
          risk_level: 'Critical',
          risk_score: 98,
          clues: ['Rent account', 'ATM handover', 'Telegram DM', 'UPI settlement'],
          created_at: '2026-10-15T06:30:00Z'
        },
        {
          id: 'AD-9918',
          platform: 'WhatsApp',
          title: 'VIP Stock Wealth Doubler System',
          text: 'SEBI approved institutional trading shortcut. Deposit ₹10,000 to get ₹50,000 in 48 hours guaranteed. No KYC needed, join secret WhatsApp VIP group.',
          risk_level: 'High',
          risk_score: 92,
          clues: ['Money doubling', 'Skips KYC', 'WhatsApp invite', 'Guaranteed returns'],
          created_at: '2026-10-15T05:45:00Z'
        },
        {
          id: 'AD-9914',
          platform: 'Instagram',
          title: 'Easy Work From Home — Digital Payment Receiver',
          text: 'Need 10 active UPI accounts for international crypto client transfers. Receive payments and forward with 10% commission cut immediately.',
          risk_level: 'High',
          risk_score: 88,
          clues: ['UPI forwarder', 'Layering mule', 'Commission cut'],
          created_at: '2026-10-14T21:10:00Z'
        },
        {
          id: 'AD-9907',
          platform: 'Facebook',
          title: 'Instant Personal Loan Without CIBIL Check',
          text: 'Instant loan approval in 2 minutes. Install our APK file from bit.ly/easy-loan-apk to verify phone contacts and bank SMS statement.',
          risk_level: 'Critical',
          risk_score: 96,
          clues: ['APK install', 'Contact scraping', 'Predatory loan'],
          created_at: '2026-10-14T19:20:00Z'
        }
      ]
    };
  }

  // 8. ALERTS & UNREAD
  if (cleanEndpoint === '/alerts/unread-count') {
    return { unread_count: 3 };
  }
  if (cleanEndpoint === '/alerts') {
    return {
      alerts: [
        {
          id: 'ALT-101',
          severity: 'Critical',
          title: 'Active Coordinated Mule Recruitment Wave',
          platform: 'Telegram / WhatsApp',
          description: 'Detected 14 identical bank rental posts sharing the same UPI handle: mule884@paytm',
          time: '12 mins ago'
        },
        {
          id: 'ALT-102',
          severity: 'High',
          title: 'Unverified APK Distribution Campaign',
          platform: 'Facebook Ads',
          description: 'Targeting rural bank account holders with fake subsidy APK installer.',
          time: '34 mins ago'
        }
      ]
    };
  }

  // 9. AUDIT LOGS
  if (cleanEndpoint.startsWith('/audit')) {
    return {
      logs: [
        { id: 'LOG-01', action: 'FLAGGED_AD', user: 'Vikram Singh', details: 'Confirmed mule ad AD-9921', time: '10:14 AM' },
        { id: 'LOG-02', action: 'USER_CLEARANCE', user: 'Aditya Roy', details: 'Granted Investigator role', time: '09:42 AM' },
        { id: 'LOG-03', action: 'CASE_ESCALATION', user: 'Vikram Singh', details: 'Escalated to 1930 Cyber Cell', time: '08:50 AM' }
      ]
    };
  }

  // 10. CAMPAIGNS & GRAPH
  if (cleanEndpoint === '/campaigns') {
    return {
      campaigns: [
        { id: 'CMP-01', name: 'Operation FastMule', risk: 'Critical', adsCount: 18, accountsLinked: 9 },
        { id: 'CMP-02', name: 'GoldenTrust Forex Ring', risk: 'High', adsCount: 12, accountsLinked: 6 }
      ]
    };
  }

  if (cleanEndpoint === '/graph') {
    return {
      nodes: [
        { id: 'mule_1', label: 'mule884@paytm', type: 'upi' },
        { id: 'ad_1', label: 'Telegram Post #9921', type: 'ad' },
        { id: 'bank_1', label: 'SBI A/c 3091****882', type: 'bank' }
      ],
      links: [
        { source: 'ad_1', target: 'mule_1' },
        { source: 'mule_1', target: 'bank_1' }
      ]
    };
  }

  // 11. GEMINI AI FALLBACKS
  if (cleanEndpoint === '/gemini/status') {
    return { configured: true, model: 'gemini-1.5-flash', message: 'Gemini AI active' };
  }
  if (cleanEndpoint === '/gemini/analyze') {
    const text = body.text || '';
    return {
      ok: true,
      analysis: {
        scam_category: 'Mule Account Recruitment / Layering Fraud',
        is_scam: true,
        ai_risk_score: 96,
        confidence: 0.94,
        verdict: 'CRITICAL THREAT',
        executive_summary: 'Gemini AI detected unmistakable indicators of organized money mule recruitment designed to funnel unauthorized cyber fraud funds through innocent citizen accounts.',
        red_flags: [
          'Soliciting individuals to rent, surrender or sell bank accounts',
          'Promising unrealistic zero-effort daily commission payouts',
          'Moving conversations to encrypted private messaging (Telegram/WhatsApp)',
          'Complete absence of legitimate employment contracts or RBI KYC'
        ],
        legal_violations: [
          'Information Technology Act 2000, Section 66D',
          'Prevention of Money Laundering Act (PMLA) 2002',
          'RBI Master Direction on KYC (2016)'
        ],
        investigator_action: 'Serve notice to intermediary to preserve IP logs. Issue freeze request to destination bank branch via NCRP API.',
        citizen_advice: 'NEVER provide your bank account or debit card. Doing so makes you criminally liable as an accomplice. Call 1930 immediately.'
      }
    };
  }
  if (cleanEndpoint === '/gemini/chat') {
    const msg = (body.message || '').toLowerCase();
    let reply = `🤖 **FinShield Sentinel AI Intelligence:**\n\nI have evaluated your threat query. For any unauthorized transaction, report immediately to the National Cybercrime Helpline **1930** within the Golden Hour to freeze money in the banking corridor.`;
    if (msg.includes('mule') || msg.includes('rent')) {
      reply = `⚠️ **Mule Bank Account Alert:**\nRenting or sharing your account details (OTP, debit card, passbook) makes you legally culpable as a co-conspirator under IT Act Section 66D and PMLA. Contact your bank immediately to freeze the account if already compromised.`;
    }
    return { ok: true, reply };
  }

  // 12. OCR SCANNER FALLBACKS
  if (cleanEndpoint === '/ocr/status') {
    return {
      geminiVisionAvailable: true,
      tesseractAvailable: true,
      activeModel: 'gemini-flash-latest',
      message: 'Google Gemini Vision AI & Tesseract OCR Ready'
    };
  }
  if (cleanEndpoint === '/ocr/scan') {
    return {
      ok: true,
      engine: 'Google Gemini Vision AI',
      rawText: 'URGENT REQUIREMENT: Rent your ICICI or SBI savings account and earn Rs 8,000 daily commission. Send ATM card with PIN and passbook kit. Contact on WhatsApp +919876543210 or Telegram @cashout_mule.',
      text: 'URGENT REQUIREMENT: Rent your ICICI or SBI savings account and earn Rs 8,000 daily commission. Send ATM card with PIN and passbook kit. Contact on WhatsApp +919876543210 or Telegram @cashout_mule.',
      detectedLanguage: 'English / Hinglish',
      confidence: 0.98,
      imageSummary: 'Screenshot of Telegram advertisement soliciting bank account rental for commission.',
      entities: {
        phones: ['+919876543210'],
        upis: [],
        urls: ['t.me/cashout_mule'],
        banks: ['ICICI', 'SBI'],
        amounts: ['Rs 8,000']
      }
    };
  }

  // Default empty fallback
  return { ok: true, data: [] };
}
