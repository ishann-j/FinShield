import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { RiskBadge, CategoryBadge } from '../components/RiskBadge.jsx';
import {
  Network,
  Download,
  Share2,
  Users,
  Radio,
  Zap,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState({});

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const data = await api.getCampaigns();
        setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const toggleExpand = async (id) => {
    if (expandedCampaignId === id) {
      setExpandedCampaignId(null);
      return;
    }
    setExpandedCampaignId(id);
    if (!campaignDetails[id]) {
      try {
        const detail = await api.getCampaign(id);
        setCampaignDetails(prev => ({ ...prev, [id]: detail }));
      } catch (err) {
        console.error(`Failed to load campaign ${id} details:`, err);
      }
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-purple-400" />
            Coordinated Syndicates & Campaign Detection
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Graph community detection & temporal clustering across social platforms
          </p>
        </div>

        <button
          onClick={() => api.downloadCampaignsCsv()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-purple-400" />
          <span>Export Syndicates CSV</span>
        </button>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-mono">Identified Syndicates</div>
          <div className="text-2xl font-black text-purple-400 font-mono">{campaigns.length} Active Rings</div>
          <p className="text-[10px] text-slate-500">Connected Components & Louvain Algorithm</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-mono">High-Intensity Burst Rings</div>
          <div className="text-2xl font-black text-red-400 font-mono">
            {campaigns.filter(c => c.is_burst).length} Bursts
          </div>
          <p className="text-[10px] text-slate-500">Multipost coordination within short time windows</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-mono">Total Syndicated Posts</div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {campaigns.reduce((acc, c) => acc + (c.ad_count || 0), 0)} Posts
          </div>
          <p className="text-[10px] text-slate-500">Linked by shared phones, UPIs, and wallets</p>
        </div>
      </div>

      {/* Campaign Cards List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-mono text-sm">
            No coordinated syndicates detected.
          </div>
        ) : (
          campaigns.map((camp) => {
            const isExpanded = expandedCampaignId === camp.id;
            const detail = campaignDetails[camp.id];

            return (
              <div
                key={camp.id}
                className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition-all"
              >
                {/* Main Card Row */}
                <div className="p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold">
                          {camp.id}
                        </span>
                        <h2 className="text-base font-bold text-white tracking-tight">
                          {camp.name}
                        </h2>
                        {camp.is_burst && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-red-950/70 border border-red-500/40 text-red-300 animate-pulse">
                            <Zap className="h-3 w-3 text-red-400" />
                            BURST COORDINATION
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                        <span>Platforms: <b className="text-slate-200">{camp.platforms?.join(', ')}</b></span>
                        <span>•</span>
                        <span>First Seen: <b className="text-slate-200">{new Date(camp.first_seen).toLocaleDateString('en-IN')}</b></span>
                        <span>•</span>
                        <span>Confidence: <b className="text-cyan-400">{Math.round(camp.confidence * 100)}%</b></span>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <div className="text-xs text-slate-400">Ring Risk Score</div>
                        <div className="text-lg font-black text-red-400">{camp.risk_score}/100</div>
                      </div>

                      <Link
                        to={`/graph?campaignId=${camp.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-semibold"
                        title="Visualize in Cytoscape Network Graph"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Graph</span>
                      </Link>

                      <button
                        onClick={() => toggleExpand(camp.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                      >
                        <span>{isExpanded ? 'Hide Ads' : `View ${camp.ad_count} Ads`}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Shared Forensic Entities Pills */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      Shared Forensic Anchors:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(camp.shared_entities || []).map((ent, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-700/80 text-slate-200"
                        >
                          <span className="text-[10px] font-bold text-cyan-400 uppercase">
                            {ent.type}:
                          </span>
                          <span>{ent.masked_value || ent.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded Member Ads Drawer */}
                {isExpanded && (
                  <div className="p-5 bg-slate-950 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Syndicate Member Advertisements ({camp.ad_count})</span>
                      <span className="text-cyan-400">Click to inspect forensic dossier</span>
                    </div>

                    {!detail ? (
                      <div className="h-20 bg-slate-900 rounded-lg animate-pulse" />
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {(detail.member_ads || []).map((ad) => (
                          <div
                            key={ad.id}
                            className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-cyan-400 font-bold">{ad.id}</span>
                                <span className="text-xs text-slate-400 font-mono">@{ad.username} on {ad.platform}</span>
                                <RiskBadge level={ad.risk_level} score={ad.risk_score} size="sm" />
                              </div>
                              <p className="text-xs text-slate-300 truncate font-sans">
                                {ad.text}
                              </p>
                            </div>
                            <Link
                              to={`/ads/${ad.id}`}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono whitespace-nowrap"
                            >
                              Open Dossier
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
