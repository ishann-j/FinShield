import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  FileText,
  Download,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Layers
} from 'lucide-react';

export function Reports() {
  const [ads, setAds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedAdId, setSelectedAdId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [authority, setAuthority] = useState('Cyber Crime Investigation Unit');

  useEffect(() => {
    api.getAds({ riskLevel: 'Critical', limit: 50 }).then(res => {
      setAds(res.ads || []);
      if (res.ads?.length > 0) setSelectedAdId(res.ads[0].id);
    }).catch(() => {});

    api.getCampaigns().then(res => {
      setCampaigns(res.campaigns || []);
      if (res.campaigns?.length > 0) setSelectedCampaignId(res.campaigns[0].id);
    }).catch(() => {});
  }, []);

  const handleDownloadPdf = async () => {
    if (!selectedAdId) return;
    setLoading(true);
    try {
      await api.downloadPdf(selectedAdId);
    } catch (err) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-cyan-400" />
          Official Law Enforcement & Bank Case Reporting
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Generate tamper-evident evidence dossiers and bulk data feeds for Cyber Crime Units and Bank Nodal Officers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Official Cyber Cell Case Dossier (PDF) */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono border-b border-slate-800 pb-3">
            <Building2 className="h-4 w-4" />
            <span>Generate Official Case Dossier (PDF)</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Constructs a formatted, tamper-evident investigation dossier complete with SHA-256 evidence fingerprint, extracted forensic clues, risk score factor attribution, and chain of custody logs.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Authority Jurisdiction:</label>
              <select
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              >
                <option value="State Cyber Crime Police Station">State Cyber Crime Police Station</option>
                <option value="National Cyber Crime Reporting Portal (1930)">National Cyber Crime Reporting Portal (1930)</option>
                <option value="Bank Principal Nodal Officer / Fraud Control Unit">Bank Principal Nodal Officer / Fraud Control Unit</option>
                <option value="Financial Intelligence Unit (FIU-IND)">Financial Intelligence Unit (FIU-IND)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Select Flagged Target Ad:</label>
              <select
                value={selectedAdId}
                onChange={(e) => setSelectedAdId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {ads.map(ad => (
                  <option key={ad.id} value={ad.id}>
                    {ad.id} - {ad.platform} (@{ad.username}) - Score: {ad.risk_score}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={loading || !selectedAdId}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{loading ? 'Compiling Dossier...' : 'Download Official PDF Dossier'}</span>
          </button>
        </div>

        {/* Card 2: Bulk Forensic Exports (CSV) */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 font-mono border-b border-slate-800 pb-3">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Bulk Intelligence Exports (CSV)</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Export structured evidence records for SIEM integration, forensic indexing, spreadsheet correlation, and nodal bank blocking notices.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Suspect Advertisements Feed</div>
                <div className="text-[11px] text-slate-500 font-mono">All 1,500 ingested & classified records</div>
              </div>
              <button
                onClick={() => api.downloadAdsCsv()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-mono font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Coordinated Syndicates Dataset</div>
                <div className="text-[11px] text-slate-500 font-mono">All detected rings, burst tags & shared entities</div>
              </div>
              <button
                onClick={() => api.downloadCampaignsCsv()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-purple-400 text-xs font-mono font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
