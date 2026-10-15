import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  History,
  ShieldCheck,
  Filter,
  User,
  Lock,
  Clock,
  Search
} from 'lucide-react';

export function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(150);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterAction && log.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.username?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.targetId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-cyan-400" />
          Tamper-Evident Forensic Audit Trail
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Immutable ledger of investigator evidence inspections, sensitive entity unmaskings, and model adjustments
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, action, target ID, or justification note..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Action Types</option>
            <option value="INVESTIGATOR_UNMASK_SENSITIVE_ENTITY">Investigator Privacy Unmaskings</option>
            <option value="VIEW_EVIDENCE_CARD">Evidence Card Views</option>
            <option value="FEEDBACK_CONFIRM">Confirm Illicit Triages</option>
            <option value="FEEDBACK_ESCALATE">Nodal Escalations</option>
            <option value="FEEDBACK_FALSE_POSITIVE">False Positive Reports</option>
            <option value="RETRAIN_MODEL">Model Retrainings</option>
            <option value="USER_LOGIN">User Logins</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Investigator</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Ref</th>
                <th className="py-3 px-4">Audit Details & Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4 bg-slate-900/40" />
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isUnmask = log.action === 'INVESTIGATOR_UNMASK_SENSITIVE_ENTITY' || log.action === 'OFFICER_UNMASK_SENSITIVE_ENTITY';
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isUnmask ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200 whitespace-nowrap">
                        {log.username}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.role === 'Investigator' || log.role === 'Officer'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : log.role === 'Admin'
                            ? 'bg-purple-500/20 text-purple-300'
                            : log.role === 'Victim'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-400 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {log.targetId}
                      </td>
                      <td className="py-3 px-4 max-w-md text-slate-300 font-sans text-xs">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
