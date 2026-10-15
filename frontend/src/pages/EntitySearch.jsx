import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { RiskBadge, CategoryBadge } from '../components/RiskBadge.jsx';
import {
  SearchCheck,
  Search,
  History,
  Network,
  Radio,
  Clock,
  Eye,
  AlertTriangle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export function EntitySearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleQueries = [
    '+919820144912',
    'rahul.merchant@okhdfcbank',
    'https://bit.ly/mule-acc-fast',
    'TN2w5M41Z9sPq3XyK67L89vRt1Qwerty7u',
    'dailycash@paytm',
    'carderx@ybl'
  ];

  const handleSearch = async (targetQuery) => {
    const q = (targetQuery !== undefined ? targetQuery : query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setSearchParams({ q });

    try {
      const data = await api.searchEntity(q);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Entity search failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <SearchCheck className="h-6 w-6 text-cyan-400" />
          Forensic Entity Deep Trace & History
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Cross-platform identity correlation for phones, UPIs, crypto wallets, and URLs
        </p>
      </div>

      {/* Search Input Box */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Phone (+91...), UPI handle, Crypto Wallet (TRC20/ETH), Short URL, Account Number..."
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            {loading ? 'Tracing...' : 'Run Deep Trace'}
          </button>
        </form>

        {/* Quick Sample Query Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
          <span className="text-slate-500">Quick Test Entities:</span>
          {sampleQueries.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => { setQuery(sq); handleSearch(sq); }}
              className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-750 text-cyan-300 border border-slate-700 text-[11px] truncate max-w-[200px]"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Entity Profile Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 font-mono">
                  Forensic Target Matched
                </span>
                <h2 className="text-lg font-bold text-white font-mono select-all">
                  {result.query}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {result.is_syndicated && (
                  <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-mono font-bold animate-pulse">
                    SYNDICATE ANCHOR (2+ ADS)
                  </span>
                )}
                <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                  {result.total_linked_ads} Linked Post(s)
                </span>
              </div>
            </div>

            {/* Entity Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500">Platforms Seen</span>
                <div className="text-sm font-bold text-slate-200">
                  {result.platforms?.length > 0 ? result.platforms.join(', ') : 'None'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500">Profiles Linked</span>
                <div className="text-sm font-bold text-purple-400">
                  {result.accounts?.length || 0} Accounts
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500">First Identified</span>
                <div className="text-sm font-bold text-slate-200">
                  {result.first_seen ? new Date(result.first_seen).toLocaleDateString('en-IN') : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500">Last Identified</span>
                <div className="text-sm font-bold text-slate-200">
                  {result.last_seen ? new Date(result.last_seen).toLocaleDateString('en-IN') : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Linked Advertisements Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 text-xs font-mono font-bold text-slate-300 uppercase">
              Linked Illicit Advertisements ({result.linked_ads?.length || 0})
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono">
                    <th className="py-3 px-4">Threat Level</th>
                    <th className="py-3 px-4">Platform & User</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Post Transcript</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {(result.linked_ads || []).map((ad) => (
                    <tr key={ad.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <RiskBadge level={ad.risk_level} score={ad.risk_score} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <div className="text-slate-200 font-semibold">{ad.platform}</div>
                        <div className="text-slate-400 text-[11px]">@{ad.username}</div>
                      </td>
                      <td className="py-3 px-4">
                        {ad.categories?.[0] && <CategoryBadge category={ad.categories[0]} />}
                      </td>
                      <td className="py-3 px-4 max-w-sm text-slate-300">
                        <p className="line-clamp-2 leading-relaxed">
                          {ad.text}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(ad.posted_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/ads/${ad.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 text-xs font-semibold"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Inspect</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
