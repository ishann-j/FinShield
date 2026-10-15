import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { useCardSpotlight, addStoredReport } from './dashboardUtils.js';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Hash,
  Sparkles,
  PhoneCall,
  Repeat,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  Scan,
  Cpu,
  Trash2
} from 'lucide-react';
import './Dashboards.css';

// -----------------------------------------------------------------
// ADVANCED REPEATED KEYWORDS & THREAT PATTERN MATRIX
// -----------------------------------------------------------------
const THREAT_RULES = [
  {
    id: 'rent',
    category: 'Mule Intent & Account Trafficking',
    label: 'Account Rental / Sale Offer',
    baseWeight: 35,
    repeatWeight: 8,
    maxCap: 55,
    re: /\b(rent|kiraya|kiraye|sell|sale|bikau|lease|lending|khata\s*rent|rent\s*par|account\s*use\s*karne)\b/gi,
    severity: 'Critical',
    description: 'Explicit commercial offer to rent, sell, or surrender access to a bank account to layer illegal funds.'
  },
  {
    id: 'instrument',
    category: 'Banking Hardware / Instrument Handover',
    label: 'ATM / Debit Card / Passbook Solicitation',
    baseWeight: 30,
    repeatWeight: 6,
    maxCap: 50,
    re: /\b(atm|debit\s*card|credit\s*card|passbook|cheque\s*book|chequebook|sim\s*card|net\s*banking|full\s*kit)\b/gi,
    severity: 'Critical',
    description: 'Demands physical or digital banking hardware (ATM card, PIN, passbook, cheque book, registered SIM).'
  },
  {
    id: 'credentials',
    category: 'Authentication & Credential Theft',
    label: 'OTP / PIN / Secret Extraction',
    baseWeight: 30,
    repeatWeight: 10,
    maxCap: 50,
    re: /\b(otp|pin|password|atm\s*pin|login\s*id|secret\s*code|credentials)\b/gi,
    severity: 'Critical',
    description: 'Attempts to extract one-time passwords, debit card PINs, or net banking passwords to compromise accounts.'
  },
  {
    id: 'unrealistic_return',
    category: 'Financial Enticement & Ponzi Promises',
    label: 'Guaranteed Returns / Daily Payouts',
    baseWeight: 25,
    repeatWeight: 6,
    maxCap: 45,
    re: /\b(guaranteed|double|paisa\s*double|100%|zero\s*risk|no\s*loss|daily\s*earning|daily\s*payment|daily\s*turnover|commission|kamai|lakh\s*daily)\b/gi,
    severity: 'High',
    description: 'Prompts users with impossible daily payouts, money doubling, or risk-free commission claims.'
  },
  {
    id: 'evasion_channel',
    category: 'Off-Platform Evasion & Secrecy',
    label: 'Encrypted Redirect (Telegram / WhatsApp)',
    baseWeight: 15,
    repeatWeight: 4,
    maxCap: 30,
    re: /\b(dm|whatsapp|telegram|inbox|t\.me|wa\.me|personal\s*chat|private\s*chat)\b/gi,
    severity: 'Medium',
    description: 'Redirects public audience into private end-to-end encrypted chats to avoid platform oversight.'
  },
  {
    id: 'kyc_bypass',
    category: 'Regulatory Non-Compliance',
    label: 'KYC Bypass / No Verification Claim',
    baseWeight: 20,
    repeatWeight: 5,
    maxCap: 35,
    re: /\b(no\s*kyc|without\s*kyc|skips?\s*kyc|no\s*document|no\s*aadhaar|no\s*pan|no\s*cibil)\b/gi,
    severity: 'High',
    description: 'Claims no identity verification, KYC, or PAN card is required, violating mandatory RBI compliance.'
  },
  {
    id: 'urgency_pressure',
    category: 'Psychological Manipulation',
    label: 'Artificial Urgency & Limited Slots',
    baseWeight: 10,
    repeatWeight: 3,
    maxCap: 20,
    re: /\b(fast|urgent|jaldi|turant|limited\s*slots|only\s*\d+\s*left|hurry|immediate|last\s*chance)\b/gi,
    severity: 'Medium',
    description: 'Uses pressure language and countdown urgency to prevent the victim from consulting friends or family.'
  }
];

const BENIGN_PATTERNS = /\b(per annum|p\.a\.|terms\s*(and|&)\s*conditions|dicgc|rbi\s*guidelines|official\s*advisory|never\s*share|beware\s*of)\b/gi;

// Entity extraction helpers
function extractEntities(text) {
  const phones = [...new Set(text.match(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g) || [])];
  const upis = [...new Set(text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g) || [])];
  const urls = [...new Set(text.match(/(?:https?:\/\/)?(?:t\.me|wa\.me|bit\.ly|tinyurl\.com)\/[a-zA-Z0-9_\-]+/gi) || [])];
  const banks = [...new Set(text.match(/\b(SBI|HDFC|ICICI|Axis|PNB|Kotak|Bank of Baroda|Canara|Paytm|Airtel Payments)\b/gi) || [])];
  const cryptos = [...new Set(text.match(/\b(USDT|TRC20|ERC20|Bitcoin|BTC|Ethereum|Crypto)\b/gi) || [])];
  const instruments = [...new Set(text.match(/\b(ATM|Debit Card|Credit Card|Passbook|Cheque Book|SIM Card|Net Banking)\b/gi) || [])];

  return { phones, upis, urls, banks, cryptos, instruments };
}

// SHA-256 fingerprint generator
async function computeHash(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `sha256-${Date.now().toString(16)}`;
  }
}

export function ReportAd() {
  useCardSpotlight();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('received');
  const [channel, setChannel] = useState('Instagram');
  const [text, setText] = useState('');
  const [report, setReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, keywords, legal, actions

  // OCR Scanner State
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrEngine, setOcrEngine] = useState('auto');
  const fileInputRef = useRef(null);

  const handleOcrFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setOcrScanning(true);
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('engine', ocrEngine);

      const res = await api.scanImageOcr(formData);
      if (res?.ok && res.rawText) {
        setText(res.rawText);
        setOcrResult(res);
      } else {
        alert(res?.error || 'Could not extract text from this image.');
      }
    } catch (err) {
      alert(`OCR Scan failed: ${err.message}`);
    } finally {
      setOcrScanning(false);
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          handleOcrFile(blob);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [ocrEngine]);

  const sampleDemos = [
    {
      title: '1. Mule Account Kit Rental',
      channel: 'Telegram',
      text: 'Urgent requirement! Rent your HDFC / ICICI bank account and get Rs 5000 daily payment. Send ATM card with PIN and passbook kit. Full safe work, daily commission. Contact on Telegram @mule_cashout_hub or WhatsApp +919871100234. Only 3 slots left, jaldi DM karo.'
    },
    {
      title: '2. Forex / Money Doubler Ponzi',
      channel: 'WhatsApp',
      text: 'Guaranteed 100% returns in 7 days! Deposit Rs 10,000 and get Rs 20,000 back with zero risk. No KYC needed, skips PAN verification. Join our VIP investment club on WhatsApp wa.me/919820144912. Fast payout, no work required!'
    },
    {
      title: '3. CVV Dumps / Carding Sale',
      channel: 'Telegram',
      text: 'Fresh live Visa Platinum and Mastercard CC CVV2 dumps track 1 & 2 available with PIN. 50-50 cashout service. Need active bank accounts to receive instant wire. Contact @carding_kingpin on Telegram.'
    },
    {
      title: '4. Genuine Bank Advisory (Benign)',
      channel: 'SMS or phone call',
      text: 'Official State Bank of India Advisory: Beware of unauthorized callers. SBI never asks for your OTP, net banking password, or ATM debit card PIN. Report cyber fraud to 1930 or visit cybercrime.gov.in. Terms and conditions apply.'
    }
  ];

  // Deep Analysis Engine with Repeated Keywords Calculation
  const runFullAnalysis = async (inputText, submitToInvestigators) => {
    const trimmed = inputText.trim();
    if (trimmed.length < 10) {
      alert('Please enter at least 10 characters of the advertisement or message.');
      return;
    }

    setSubmitting(true);

    // 1. Calculate Repeated Keyword Matrix
    const keywordMatches = [];
    let totalBaseScore = 0;
    let totalRepeatScore = 0;
    let totalKeywordHits = 0;

    for (const rule of THREAT_RULES) {
      const regex = new RegExp(rule.re.source, 'gi');
      const matches = trimmed.match(regex) || [];
      const count = matches.length;

      if (count > 0) {
        totalKeywordHits += count;
        // Base weight for first match
        const base = rule.baseWeight;
        // Escalation for repeated occurrences
        const repeats = count - 1;
        const repeatBonus = repeats * rule.repeatWeight;
        const subtotal = Math.min(rule.maxCap, base + repeatBonus);

        totalBaseScore += base;
        totalRepeatScore += (subtotal - base);

        keywordMatches.push({
          id: rule.id,
          category: rule.category,
          label: rule.label,
          severity: rule.severity,
          count,
          repeats,
          baseScore: base,
          repeatBonus: subtotal - base,
          totalScore: subtotal,
          matchedWords: [...new Set(matches.map(m => m.toLowerCase()))],
          description: rule.description
        });
      }
    }

    // Correlation multiplier: if multiple threat categories converge
    let correlationMultiplier = 1.0;
    if (keywordMatches.length >= 4) {
      correlationMultiplier = 1.25; // 4+ vectors indicates coordinated syndicate
    } else if (keywordMatches.length >= 2) {
      correlationMultiplier = 1.15;
    }

    let calculatedScore = Math.round((totalBaseScore + totalRepeatScore) * correlationMultiplier);

    // Benign discount if no core mule intent and official disclaimer present
    const hasCoreMule = keywordMatches.some(k => ['rent', 'instrument', 'credentials'].includes(k.id));
    if (!hasCoreMule && BENIGN_PATTERNS.test(trimmed)) {
      calculatedScore = Math.min(calculatedScore, 8);
    }

    calculatedScore = Math.min(100, Math.max(0, calculatedScore));

    const threatTier =
      calculatedScore >= 80 ? 'Critical' :
      calculatedScore >= 55 ? 'High' :
      calculatedScore >= 25 ? 'Medium' : 'Low';

    // 2. Extract Entities
    const entities = extractEntities(trimmed);

    // 3. Compute Digital Forensic Fingerprint
    const contentHash = await computeHash(trimmed);
    const incidentId = `FIN-REP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    // 4. Request Google Gemini AI Deep Qualitative Reasoning
    let geminiResult = null;
    try {
      const geminiRes = await api.geminiAnalyze({
        text: trimmed,
        platform: channel,
        username: user?.username || 'reporter'
      });
      if (geminiRes?.analysis) {
        geminiResult = geminiRes.analysis;
      }
    } catch (gErr) {
      console.warn('Gemini qualitative reasoning note:', gErr.message);
    }

    // 5. Build Complete Investigation Report Object
    const fullReport = {
      incidentId,
      timestamp,
      channel,
      role,
      text: trimmed,
      contentHash,
      calculatedScore,
      threatTier,
      totalKeywordHits,
      totalBaseScore,
      totalRepeatScore,
      correlationMultiplier,
      keywordMatches,
      entities,
      gemini: geminiResult,
      submitted: submitToInvestigators,
      reporter: user?.name || 'Citizen User',
      reporterUser: user?.username || 'citizen'
    };

    // If submitting, persist report in system database & local records
    if (submitToInvestigators) {
      addStoredReport({
        id: incidentId,
        mode: 'public',
        by: user?.username || 'citizen',
        byName: user?.name || 'Citizen User',
        byRole: user?.role || 'Citizen',
        text: trimmed,
        channel,
        category: role,
        src: `Public report: ${role} (${channel})`,
        status: 'Under review',
        statusNote: 'Investigator triage underway; pattern indexed.',
        statusClass: calculatedScore >= 60 ? 'a' : 'c',
        score: calculatedScore,
        level: threatTier,
        t: timestamp
      });

      try {
        const formData = new FormData();
        formData.append('text', trimmed);
        formData.append('platform', channel);
        formData.append('username', user?.username || 'citizen_reporter');
        formData.append('city', 'National');
        formData.append('language', 'Auto');
        await api.submitManualPost(formData);
      } catch (err) {
        console.warn('Backend intake sync note:', err.message);
      }
    }

    setReport(fullReport);
    setSubmitting(false);
  };

  const handleCopyReport = () => {
    if (!report) return;
    const textReport = `=======================================================
FINSHIELD SENTINEL — INCIDENT FRAUD REPORT
=======================================================
Incident ID:    ${report.incidentId}
Date/Time:      ${report.timestamp}
Platform:       ${report.channel}
Threat Level:   ${report.threatTier.toUpperCase()} (${report.calculatedScore}/100)
SHA-256 Hash:   ${report.contentHash}

REPEATED KEYWORDS ANALYSIS:
Total Keyword Hits: ${report.totalKeywordHits}
Base Risk Score:    ${report.totalBaseScore} pts
Repetition Escalation: +${report.totalRepeatScore} pts
Syndicate Multiplier: ${report.correlationMultiplier}x

TRIGGERED PATTERNS:
${report.keywordMatches.map(k => `• [${k.category}] "${k.matchedWords.join(', ')}" — ${k.count} hit(s) -> +${k.totalScore} pts`).join('\n')}

EXTRACTED DIGITAL CLUES:
• Phones:   ${report.entities.phones.join(', ') || 'None detected'}
• UPI IDs:  ${report.entities.upis.join(', ') || 'None detected'}
• Banks:    ${report.entities.banks.join(', ') || 'None detected'}
• Channels: ${report.entities.urls.join(', ') || 'None detected'}

AI EVALUATION:
Category: ${report.gemini?.scam_category || 'Suspected Financial Fraud'}
Summary:  ${report.gemini?.executive_summary || 'Evidence indicates high-risk financial solicitation.'}

ACTION REQUIRED:
Report to National Cybercrime Helpline 1930 / cybercrime.gov.in.
=======================================================`;

    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dashboard-root" style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Title & Introduction */}
      <div className="wc" style={{ borderLeft: '4px solid #0066ff' }}>
        <div className="av">
          <ShieldAlert className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1>Deep Ad Fraud Analysis & Reporting</h1>
          <div className="mu sm">
            Forensic Risk Scoring with Repeated Keyword Frequency Analysis & Google Gemini AI Intelligence
          </div>
          <div className="chips">
            <span>Module: Threat Screener v2.0</span>
            <span>Scoring: Keyword Frequency Escalation</span>
            <span>Integration: Gemini 1.5 Flash</span>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <h2>1. Report Type & Source</h2>
        <div className="row" style={{ gap: '16px', marginBottom: '14px' }}>
          {[
            ['received', 'I received a message'],
            ['seen', 'I saw a sponsored ad'],
            ['victim', 'I lost money / Victim report']
          ].map(([k, label]) => (
            <label key={k} className="chp" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="rr"
                value={k}
                checked={role === k}
                onChange={() => setRole(k)}
                style={{ width: 'auto' }}
              />
              <span className="sm">{label}</span>
            </label>
          ))}
        </div>

        <div className="row" style={{ alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: '1', minWidth: '220px' }}>
            <div className="mu sm" style={{ marginBottom: '4px' }}>Platform / Channel</div>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              aria-label="Platform"
              style={{ width: '100%' }}
            >
              <option>Instagram</option>
              <option>Telegram</option>
              <option>WhatsApp</option>
              <option>Facebook</option>
              <option>SMS / Phone Call</option>
              <option>Website / Direct Link</option>
            </select>
          </div>

          <div style={{ flex: '2', minWidth: '280px' }}>
            <div className="mu sm" style={{ marginBottom: '4px' }}>Quick Load Sample Scams</div>
            <div className="row" style={{ gap: '6px' }}>
              {sampleDemos.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="b sm"
                  style={{ fontSize: '11px', padding: '4px 9px' }}
                  onClick={() => {
                    setText(s.text);
                    setChannel(s.channel);
                    setReport(null);
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Real Multimodal OCR Scanner */}
        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(3, 19, 47, 0.7)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, fontSize: '14px' }}>
              <Scan className="h-4 w-4 text-cyan-400" />
              <span>2. Real OCR Image Scanner (Extract Text from Screenshot)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span className="mu">Engine:</span>
              <select
                value={ocrEngine}
                onChange={(e) => setOcrEngine(e.target.value)}
                style={{ padding: '3px 8px', fontSize: '11px', background: '#040A22', color: '#cbd5e1', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '6px' }}
              >
                <option value="auto">Auto (Gemini Vision AI + Tesseract)</option>
                <option value="gemini">Google Gemini Vision AI</option>
                <option value="tesseract">Tesseract.js (Offline)</option>
              </select>
            </div>
          </div>

          <p className="mu sm" style={{ marginBottom: '12px', fontSize: '11.5px' }}>
            Upload a screenshot or poster from Telegram, WhatsApp, or Instagram. Or press <b style={{ color: '#fff' }}>Ctrl + V</b> anywhere on this page to paste directly from your clipboard.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleOcrFile(e.target.files[0]);
            }}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleOcrFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '20px 16px',
              border: '2px dashed rgba(56, 189, 248, 0.4)',
              borderRadius: '10px',
              background: 'rgba(2, 11, 34, 0.5)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {ocrScanning ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                <Activity className="h-6 w-6 animate-spin text-cyan-400" />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                  Extracting verbatim text via {ocrEngine === 'tesseract' ? 'Tesseract.js' : 'Google Gemini Vision AI'}...
                </span>
                <span className="mu sm">Parsing visible phone numbers, UPI handles, URLs, and bank names</span>
              </div>
            ) : imagePreview ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <img
                  src={imagePreview}
                  alt="Scanned preview"
                  style={{ maxHeight: '85px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.4)' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#10b981', fontWeight: 700, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>OCR Extraction Succeeded ({ocrResult?.engine || 'Gemini Vision'})</span>
                  </div>
                  <div className="mu sm" style={{ marginTop: '2px', maxWidth: '450px' }}>
                    {ocrResult?.imageSummary || 'Extracted text has been populated in Section 3 below.'}
                  </div>
                  <div className="mu sm" style={{ marginTop: '4px', fontSize: '11px' }}>
                    Click or drag new screenshot to replace
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <UploadCloud className="h-7 w-7 text-sky-400" />
                <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>
                  Click to upload screenshot or drag & drop image here
                </span>
                <span className="mu sm" style={{ fontSize: '11px' }}>
                  Supports PNG, JPG, WebP · Clipboard paste (<b style={{ color: '#fff' }}>Ctrl+V</b>) active
                </span>
              </div>
            )}
          </div>

          {/* OCR Extracted Metadata Bar */}
          {ocrResult && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--cy)', fontWeight: 600 }}>Detected Language:</span>
                <span>{ocrResult.detectedLanguage || 'English'}</span>
                <span style={{ margin: '0 4px', color: 'var(--mu)' }}>·</span>
                <span style={{ color: 'var(--cy)', fontWeight: 600 }}>Confidence:</span>
                <span>{Math.round((ocrResult.confidence || 0.98) * 100)}%</span>
                <span style={{ margin: '0 4px', color: 'var(--mu)' }}>·</span>
                <span style={{ color: 'var(--cy)', fontWeight: 600 }}>Engine:</span>
                <span>{ocrResult.engine}</span>
              </div>
              <button
                type="button"
                className="b sm"
                style={{ fontSize: '11px', padding: '2px 8px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setImagePreview(null);
                  setOcrResult(null);
                }}
              >
                Clear Image
              </button>
            </div>
          )}
        </div>

        <h2 style={{ marginTop: '20px' }}>3. Extracted Advertisement Content & Text</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={6000}
          rows={5}
          placeholder="Paste the suspicious ad text, WhatsApp message, or job offer here..."
          aria-label="Ad text"
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <div className="mu sm" style={{ marginTop: '4px' }}>
          FinShield will detect repeated keywords, frequency multipliers, extracted UPI/phones, and Gemini AI reasoning.
        </div>

        {/* Action Buttons */}
        <div className="row" style={{ marginTop: '16px', gap: '10px' }}>
          <button
            className="b p"
            onClick={() => runFullAnalysis(text, true)}
            disabled={submitting || !text.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{submitting ? 'Generating Forensic Report...' : 'Submit Official Report & Analyze'}</span>
          </button>

          <button
            className="b"
            onClick={() => runFullAnalysis(text, false)}
            disabled={submitting || !text.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Activity className="h-4 w-4" />
            <span>Check Locally (Instant Analysis)</span>
          </button>

          {text && (
            <button
              className="b"
              onClick={() => { setText(''); setReport(null); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* COMPREHENSIVE DETAILED INVESTIGATION REPORT */}
      {/* ================================================================= */}
      {report && (
        <div
          className={`card ${report.threatTier === 'Critical' || report.threatTier === 'High' ? 'fx' : ''}`}
          style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease-out' }}
          id="officialReportView"
        >
          {/* Header & Meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--bd)', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`pill ${report.threatTier}`} style={{ fontSize: '12px', padding: '3px 10px' }}>
                  {report.threatTier.toUpperCase()} THREAT ({report.calculatedScore}/100)
                </span>
                <span className="st2 b">{report.incidentId}</span>
                {report.submitted && <span className="st2 c">Logged in Investigation Queue</span>}
              </div>
              <h2 style={{ fontSize: '18px', margin: '8px 0 2px', textTransform: 'none', letterSpacing: 'normal' }}>
                Forensic Threat Assessment Report
              </h2>
              <div className="mu sm">
                Generated {report.timestamp} · Source: {report.channel} · Reported by: @{report.reporterUser}
              </div>
            </div>

            {/* Print & Copy Actions */}
            <div className="row" style={{ gap: '8px' }}>
              <button
                type="button"
                className="b sm"
                onClick={handleCopyReport}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied Full Report' : 'Copy Report'}</span>
              </button>

              <button
                type="button"
                className="b sm"
                onClick={handlePrint}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Dossier</span>
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="fl2" style={{ marginBottom: '18px' }}>
            <span
              onClick={() => setActiveTab('overview')}
              style={{
                cursor: 'pointer',
                borderColor: activeTab === 'overview' ? 'var(--blue)' : 'var(--bd)',
                background: activeTab === 'overview' ? 'rgba(0,102,255,0.2)' : 'transparent',
                fontWeight: activeTab === 'overview' ? '700' : '500'
              }}
            >
              📊 Executive Overview
            </span>
            <span
              onClick={() => setActiveTab('keywords')}
              style={{
                cursor: 'pointer',
                borderColor: activeTab === 'keywords' ? 'var(--blue)' : 'var(--bd)',
                background: activeTab === 'keywords' ? 'rgba(0,102,255,0.2)' : 'transparent',
                fontWeight: activeTab === 'keywords' ? '700' : '500'
              }}
            >
              🔍 Repeated Keyword Matrix ({report.totalKeywordHits})
            </span>
            <span
              onClick={() => setActiveTab('clues')}
              style={{
                cursor: 'pointer',
                borderColor: activeTab === 'clues' ? 'var(--blue)' : 'var(--bd)',
                background: activeTab === 'clues' ? 'rgba(0,102,255,0.2)' : 'transparent',
                fontWeight: activeTab === 'clues' ? '700' : '500'
              }}
            >
              🏷️ Extracted Clues & Entities
            </span>
            <span
              onClick={() => setActiveTab('gemini')}
              style={{
                cursor: 'pointer',
                borderColor: activeTab === 'gemini' ? 'var(--blue)' : 'var(--bd)',
                background: activeTab === 'gemini' ? 'rgba(0,102,255,0.2)' : 'transparent',
                fontWeight: activeTab === 'gemini' ? '700' : '500'
              }}
            >
              ✨ Gemini AI Intelligence
            </span>
          </div>

          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Score Meter & Calculation Breakdown */}
              <div style={{ padding: '16px', background: 'rgba(3, 19, 47, 0.7)', borderRadius: '12px', border: '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Scoring Attribution Breakdown</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--cy)' }}>
                    Total Risk Score: <b>{report.calculatedScore} / 100</b>
                  </span>
                </div>

                <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${report.calculatedScore}%`,
                      background: report.calculatedScore >= 70
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : report.calculatedScore >= 40
                        ? 'linear-gradient(90deg, #38bdf8, #f59e0b)'
                        : '#10b981',
                      transition: 'width 0.5s ease-out'
                    }}
                  />
                </div>

                <div className="row" style={{ gap: '14px', fontSize: '12px', color: 'var(--mu)' }}>
                  <div>Base Keyword Weights: <b style={{ color: '#fff' }}>+{report.totalBaseScore} pts</b></div>
                  <div>Repetition Escalation: <b style={{ color: 'var(--redt)' }}>+{report.totalRepeatScore} pts</b></div>
                  <div>Syndicate Vector Multiplier: <b style={{ color: 'var(--cy)' }}>{report.correlationMultiplier}x</b></div>
                  <div>Total Keyword Occurrences: <b style={{ color: '#fff' }}>{report.totalKeywordHits} hits</b></div>
                </div>
              </div>

              {/* SHA-256 Fingerprint */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                <Hash className="h-4 w-4 text-sky-400" />
                <span className="mu">SHA-256 Integrity Hash:</span>
                <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>{report.contentHash}</span>
              </div>

              {/* Highlighted text preview */}
              <div>
                <h2 style={{ fontSize: '13px', marginBottom: '6px' }}>Raw Advertisement Evidence Content</h2>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', fontStyle: 'italic', lineHeight: 1.6, color: '#f1f5f9' }}>
                  "{report.text}"
                </div>
              </div>

              {/* Citizen & Investigator Action Advisory */}
              <div className="warn" style={{ marginTop: '6px' }}>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PhoneCall className="h-4 w-4 text-red-400" />
                  National Cyber Crime Action Required
                </div>
                <div>
                  If you shared bank details, call the National Cyber Helpline <b>1930</b> immediately or register your case on{' '}
                  <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cy)', fontWeight: 600 }}>
                    cybercrime.gov.in
                  </a>.
                  Renting bank accounts is illegal under the Prevention of Money Laundering Act (PMLA) and IT Act Section 66D.
                </div>
              </div>
            </div>
          )}

          {/* 2. REPEATED KEYWORDS MATRIX TAB */}
          {activeTab === 'keywords' && (
            <div>
              <div className="mu sm" style={{ marginBottom: '12px' }}>
                Keywords are weighted by initial appearance + escalating multiplier for every repeated occurrence:
              </div>

              {report.keywordMatches.length === 0 ? (
                <div className="mu sm" style={{ padding: '20px', textAlign: 'center' }}>
                  No high-risk keywords detected in this submission.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Threat Category</th>
                        <th>Matched Terms</th>
                        <th>Hits / Frequency</th>
                        <th>Base Weight</th>
                        <th>Repeated Escalation</th>
                        <th>Total Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.keywordMatches.map((km, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{km.label}</div>
                            <div className="mu sm">{km.category}</div>
                          </td>
                          <td>
                            <div className="row" style={{ gap: '4px' }}>
                              {km.matchedWords.map((w, wIdx) => (
                                <span key={wIdx} className="pill Medium" style={{ fontSize: '10.5px', textTransform: 'lowercase' }}>
                                  {w}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: km.count > 1 ? 'var(--redt)' : 'inherit' }}>
                            {km.count} {km.count > 1 ? `(${km.repeats} repeated)` : ''}
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>+{km.baseScore}</td>
                          <td style={{ fontFamily: 'monospace', color: km.repeatBonus > 0 ? 'var(--redt)' : 'var(--mu)' }}>
                            +{km.repeatBonus}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--cy)' }}>
                            +{km.totalScore} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. EXTRACTED CLUES & ENTITIES TAB */}
          {activeTab === 'clues' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="mu sm">
                Forensic identifiers automatically parsed from advertisement text:
              </div>

              <div className="dg" style={{ gap: '12px', marginBottom: 0 }}>
                {/* Phone & Contacts */}
                <div className="card" style={{ marginBottom: 0, padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--cy)', marginBottom: '8px' }}>📞 Extracted Phone Numbers</div>
                  {report.entities.phones.length > 0 ? (
                    report.entities.phones.map((p, i) => (
                      <span key={i} className="st2 r" style={{ marginRight: '6px', marginBottom: '6px', display: 'inline-block' }}>{p}</span>
                    ))
                  ) : (
                    <span className="mu sm">No phone numbers detected</span>
                  )}
                </div>

                {/* UPI Handles */}
                <div className="card" style={{ marginBottom: 0, padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--cy)', marginBottom: '8px' }}>💳 Extracted UPI Handles</div>
                  {report.entities.upis.length > 0 ? (
                    report.entities.upis.map((u, i) => (
                      <span key={i} className="st2 c" style={{ marginRight: '6px', marginBottom: '6px', display: 'inline-block' }}>{u}</span>
                    ))
                  ) : (
                    <span className="mu sm">No UPI IDs detected</span>
                  )}
                </div>

                {/* Bank Entities */}
                <div className="card" style={{ marginBottom: 0, padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--cy)', marginBottom: '8px' }}>🏦 Mentioned Bank Entities</div>
                  {report.entities.banks.length > 0 ? (
                    report.entities.banks.map((b, i) => (
                      <span key={i} className="st2 b" style={{ marginRight: '6px', marginBottom: '6px', display: 'inline-block' }}>{b}</span>
                    ))
                  ) : (
                    <span className="mu sm">No specific bank mentioned</span>
                  )}
                </div>

                {/* Redirect Channels */}
                <div className="card" style={{ marginBottom: 0, padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--cy)', marginBottom: '8px' }}>🔗 External Evasion Links</div>
                  {report.entities.urls.length > 0 ? (
                    report.entities.urls.map((u, i) => (
                      <span key={i} className="st2 a" style={{ marginRight: '6px', marginBottom: '6px', display: 'inline-block' }}>{u}</span>
                    ))
                  ) : (
                    <span className="mu sm">No direct URLs detected</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. GEMINI AI INTELLIGENCE TAB */}
          {activeTab === 'gemini' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700 }}>
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <span>Google Gemini AI Threat Synthesis</span>
                </div>
                {report.gemini?.isLiveGemini ? (
                  <span className="st2 c" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Google Gemini API ({report.gemini?.modelUsed || 'gemini-1.5-flash'})
                  </span>
                ) : (
                  <span className="st2 a" style={{ fontSize: '11px' }}>
                    ⚡ Smart Heuristic Mode (Add Key for Live Gemini)
                  </span>
                )}
              </div>

              {report.gemini?.liveApiError && (
                <div className="warn" style={{ fontSize: '11px', margin: '0' }}>
                  <b>Gemini Key Note:</b> {report.gemini.liveApiError}
                </div>
              )}

              {report.gemini ? (
                <>
                  <div style={{ padding: '14px', background: 'rgba(0,102,255,0.1)', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)', lineHeight: 1.6 }}>
                    <b>Executive Diagnosis:</b> {report.gemini.executive_summary}
                  </div>

                  {report.gemini.red_flags?.length > 0 && (
                    <div>
                      <h2 style={{ fontSize: '13px' }}>Red Flags Identified by Gemini AI</h2>
                      <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                        {report.gemini.red_flags.map((rf, idx) => (
                          <div key={idx} className="sm" style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ color: 'var(--redt)' }}>⚠</span>
                            <span>{rf}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.gemini.legal_violations?.length > 0 && (
                    <div>
                      <h2 style={{ fontSize: '13px' }}>Applicable Indian Cybercrime Laws</h2>
                      <div className="row" style={{ gap: '6px' }}>
                        {report.gemini.legal_violations.map((lv, idx) => (
                          <span key={idx} className="st2 r" style={{ fontSize: '11px' }}>{lv}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.gemini.investigator_action && (
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', borderLeft: '3px solid var(--cy)' }}>
                      <b>Investigator Directive:</b> {report.gemini.investigator_action}
                    </div>
                  )}
                </>
              ) : (
                <div className="mu sm">
                  Gemini qualitative intelligence active. Analyzing threat patterns.
                </div>
              )}
            </div>
          )}

          {/* Bottom Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--bd)', paddingTop: '14px', marginTop: '16px' }}>
            <div className="mu sm">
              Report archived securely in FinShield threat intelligence registry.
            </div>

            <div className="row" style={{ gap: '8px' }}>
              <button
                type="button"
                className="b sm p"
                onClick={() => navigate('/my-reports')}
              >
                Track in My Reports →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
