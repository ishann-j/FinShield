import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { RiskBadge, CategoryBadge } from '../components/RiskBadge.jsx';
import { EvidenceView } from '../components/EvidenceView.jsx';
import {
  BellRing,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Eye,
  X,
  ExternalLink
} from 'lucide-react';

export function LiveAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeEvidenceAd, setActiveEvidenceAd] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      const data = await api.getAlerts({
        status: statusFilter,
        severity: severityFilter,
        limit: 100
      });
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    if (!autoRefresh) return;
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, severityFilter, autoRefresh]);

  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      await api.updateAlertStatus(alertId, newStatus);
      fetchAlerts();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleOpenEvidence = async (adId) => {
    setEvidenceLoading(true);
    try {
      const res = await api.getAdEvidence(adId);
      setActiveEvidenceAd(res.evidence);
    } catch (err) {
      alert(`Failed to load evidence for ad ${adId}: ${err.message}`);
    } finally {
      setEvidenceLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BellRing className="h-6 w-6 text-red-400" />
            Live Threat Alerts & Triage Feed
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time queue for high-priority illicit ads and syndicate detections
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              autoRefresh
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto-Refresh: {autoRefresh ? 'ON (10s)' : 'PAUSED'}</span>
          </button>
          <button
            onClick={fetchAlerts}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
          <Filter className="h-3.5 w-3.5 text-cyan-400" />
          <span>Filters:</span>
        </div>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Triage States</option>
          <option value="New">New</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Investigating">Investigating</option>
          <option value="Escalated">Escalated</option>
          <option value="Resolved">Resolved</option>
          <option value="False Positive">False Positive</option>
        </select>

        {(statusFilter || severityFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setSeverityFilter(''); }}
            className="text-xs text-cyan-400 hover:underline font-mono"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Alerts Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono">
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Alert Title & Details</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4 bg-slate-900/40" />
                  </tr>
                ))
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No active alerts matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Severity */}
                    <td className="py-3.5 px-4">
                      <RiskBadge level={alert.severity} showScore={false} size="sm" />
                    </td>

                    {/* Title & Message */}
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-semibold text-slate-200">
                        {alert.title}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {alert.message}
                      </p>
                    </td>

                    {/* Platform */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {alert.platform || 'N/A'}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      {alert.categories?.[0] ? (
                        <CategoryBadge category={alert.categories[0]} />
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Syndicate</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(alert.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        alert.status === 'New'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : alert.status === 'Escalated'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : alert.status === 'Resolved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {alert.status}
                      </span>
                    </td>

                    {/* Triage Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {alert.ad_id && (
                        <button
                          onClick={() => handleOpenEvidence(alert.ad_id)}
                          className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="Open Evidence Card"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Dossier</span>
                        </button>
                      )}

                      {alert.status === 'New' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'Acknowledged')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                        >
                          Ack
                        </button>
                      )}

                      {alert.status !== 'Escalated' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'Escalated')}
                          className="px-2 py-1 rounded bg-orange-950/70 hover:bg-orange-900 border border-orange-500/30 text-orange-400 text-[11px]"
                        >
                          Escalate
                        </button>
                      )}

                      {alert.status !== 'Resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'Resolved')}
                          className="px-2 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 text-[11px]"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Evidence Dossier Modal */}
      {activeEvidenceAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative max-w-5xl w-full max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setActiveEvidenceAd(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <EvidenceView
              evidence={activeEvidenceAd}
              onStatusUpdate={() => {
                fetchAlerts();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
