import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { RiskBadge, CategoryBadge } from '../components/RiskBadge.jsx';
import {
  FileSearch,
  Search,
  Filter,
  Download,
  Eye,
  ArrowUpDown,
  Hash
} from 'lucide-react';

export function AdsList() {
  const [ads, setAds] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [platform, setPlatform] = useState('');
  const [sort, setSort] = useState('risk_desc');
  const [page, setPage] = useState(0);
  const limit = 25;

  const fetchAds = async () => {
    setLoading(true);
    try {
      const data = await api.getAds({
        search,
        category,
        riskLevel,
        platform,
        sort,
        limit,
        offset: page * limit
      });
      setAds(data.ads || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [category, riskLevel, platform, sort, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchAds();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Bulk Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-cyan-400" />
            Evidence Dossiers & Flagged Advertisements
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Forensically analyzed advertisements across 7 surveillance platforms
          </p>
        </div>

        <button
          onClick={() => api.downloadAdsCsv(null, riskLevel || null)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-cyan-400" />
          <span>Export Search CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search post text, phone, UPI, account number, or username..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Risk Level */}
          <select
            value={riskLevel}
            onChange={(e) => { setRiskLevel(e.target.value); setPage(0); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Risk Levels</option>
            <option value="Critical">Critical (81-100)</option>
            <option value="High">High (61-80)</option>
            <option value="Medium">Medium (31-60)</option>
            <option value="Low">Low / Benign (0-30)</option>
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(0); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Categories</option>
            <option value="ACCOUNT_SALE_RENT">Account Sale / Rent</option>
            <option value="ACCOUNT_RECRUITMENT">Mule Recruitment</option>
            <option value="CARD_SALE">ATM / Card Sale</option>
            <option value="STOLEN_CLONED_CARD">Carding / CVV Dump</option>
            <option value="FAKE_KYC_SHELL_ACCOUNT">Fake KYC / Shell Firm</option>
            <option value="CREDENTIAL_ACCESS_SALE">Credential & Access</option>
            <option value="CRYPTO_LAUNDERING_LINKED">Crypto Laundering</option>
            <option value="OTHER_FINANCIAL_FRAUD_ENABLER">Fraud Enabler</option>
            <option value="BENIGN">Benign Genuine</option>
          </select>

          {/* Platform */}
          <select
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(0); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Platforms</option>
            <option value="Telegram">Telegram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="X">X (Twitter)</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="OLX">OLX</option>
            <option value="DarkWebForum">DarkWebForum</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(0); }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="risk_desc">Sort: Highest Threat Score</option>
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>

          <span className="text-slate-500 font-mono ml-auto">
            Showing {ads.length} of {total.toLocaleString()} Records
          </span>
        </div>
      </div>

      {/* Ads Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono">
                <th className="py-3 px-4">Threat Level</th>
                <th className="py-3 px-4">Platform & Profile</th>
                <th className="py-3 px-4">Threat Categories</th>
                <th className="py-3 px-4">Post Snippet</th>
                <th className="py-3 px-4">Entities Extracted</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4 bg-slate-900/40" />
                  </tr>
                ))
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No advertisements found matching criteria.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Risk Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <RiskBadge level={ad.risk_level} score={ad.risk_score} size="sm" />
                    </td>

                    {/* Platform & User */}
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <div className="text-slate-200 font-semibold">{ad.platform}</div>
                      <div className="text-slate-400 text-[11px]">@{ad.username}</div>
                    </td>

                    {/* Categories */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(ad.categories || []).slice(0, 2).map((cat) => (
                          <CategoryBadge key={cat} category={cat} />
                        ))}
                      </div>
                    </td>

                    {/* Snippet */}
                    <td className="py-3 px-4 max-w-xs text-slate-300">
                      <p className="line-clamp-2 leading-relaxed">
                        {ad.text}
                      </p>
                    </td>

                    {/* Entities Extracted */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {(ad.clues || []).length > 0 ? (
                        <div className="space-y-0.5">
                          {ad.clues.slice(0, 2).map((c, i) => (
                            <div key={i} className="truncate max-w-[160px]">
                              <span className="text-cyan-400 uppercase">{c.type}:</span> {c.masked_value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(ad.posted_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </td>

                    {/* Dossier Link */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/ads/${ad.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 text-xs font-semibold"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">
            Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
