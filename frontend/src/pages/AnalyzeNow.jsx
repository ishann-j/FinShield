import React, { useState } from 'react';
import { api } from '../services/api.js';
import { EvidenceView } from '../components/EvidenceView.jsx';
import {
  Zap,
  Upload,
  Globe,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export function AnalyzeNow() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('Telegram');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const sampleDemos = [
    {
      title: '1. Account Sale (Full Kit)',
      text: 'Fresh ICICI and HDFC corporate current account for sale. Full kit with passbook, cheque book, ATM card with PIN, and registered SIM card. High limit 50 Lakh daily turnover. WhatsApp wa.me/919820144912 UPI: rahul.merchant@okhdfcbank'
    },
    {
      title: '2. Carding (CVV Dumps)',
      text: 'Fresh live CC CVV2 dumps track 1 & 2 available with PIN. High balance Visa Platinum 4532015892341980 exp 09/28 cvv 789. Card checker passed. 50-50 cashout service telegram t.me/carding_gods'
    },
    {
      title: '3. Mule Recruitment',
      text: 'Urgent account holders needed! Give your bank account and earn Rs 8,000 to 15,000 daily. Commission per transaction. Safe work from home for students. Contact +919871100234'
    },
    {
      title: '4. Crypto USDT P2P',
      text: 'Need mule accounts for continuous USDT P2P transactions. High volume daily settlement. Cash to USDT direct rate. TRC20 wallet: TN2w5M41Z9sPq3XyK67L89vRt1Qwerty7u'
    },
    {
      title: '5. Hard Benign Negative',
      text: 'State Bank of India official cyber security advisory: Beware of fraudulent mule recruiters. Never share your bank account, OTP, or debit card PIN with anyone. Report fraud to 1930 or cybercrime.gov.in.'
    }
  ];

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !imageFile && !url.trim()) {
      setError('Please provide advertisement text, URL, or upload an image.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('text', text);
    formData.append('url', url);
    formData.append('platform', platform);
    if (imageFile) formData.append('image', imageFile);

    try {
      const data = await api.analyzePost(formData);
      setResult(data.analysis?.evidence);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = (demo) => {
    setText(demo.text);
    setUrl('');
    setImageFile(null);
    setResult(null);
  };

  const handleReset = () => {
    setText('');
    setUrl('');
    setImageFile(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-cyan-400" />
          Live AI Threat Sandbox & Analyzer
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Paste any suspect post, URL, or graphic for instant classification, clue extraction, and factor attribution
        </p>
      </div>

      {/* Input Sandbox Box */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        {/* Sample Demos Row */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Load Quick Demo Scenarios:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleDemos.map((demo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadDemo(demo)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono border border-slate-700/80 transition-colors"
              >
                {demo.title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4 pt-2">
          {/* Post Textarea */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Advertisement / Social Post Content (Devanagari, Hinglish, Leetspeak, English)
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste suspect text advertisement (e.g. 'Fresh bank account for sale with passbook, SIM, ATM and netbanking credentials...')"
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Platform & URL Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Source Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="Telegram">Telegram Channel / Group</option>
                <option value="WhatsApp">WhatsApp Community / Status</option>
                <option value="X">X (Twitter)</option>
                <option value="Facebook">Facebook Public Page / Marketplace</option>
                <option value="Instagram">Instagram Story / Reel</option>
                <option value="OLX">OLX / Classifieds</option>
                <option value="DarkWebForum">Underground Forum</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Post URL (Optional)
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://t.me/post/..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Screenshot / Graphic (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-cyan-600/25 disabled:opacity-50 transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{loading ? 'Analyzing Post Signals...' : 'Run Instant AI Analysis'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs font-mono transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Analysis Output View */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Real-Time Forensics Output & Explainability Breakdown</span>
            </h2>
          </div>
          <EvidenceView evidence={result} />
        </div>
      )}
    </div>
  );
}
