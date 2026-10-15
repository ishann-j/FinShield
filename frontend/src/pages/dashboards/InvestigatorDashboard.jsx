import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { CyberCrimeWatch } from './CyberCrimeWatch.jsx';
import {
  useCardSpotlight,
  getGreeting,
  getFormattedDate,
  getInitials
} from './dashboardUtils.js';
import './Dashboards.css';

export function InvestigatorDashboard() {
  useCardSpotlight();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [ads, setAds] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, adsData, auditData] = await Promise.allSettled([
          api.getOverviewStats(),
          api.getAds({ limit: 20 }),
          api.getAuditLogs(10)
        ]);

        if (statsData.status === 'fulfilled') setStats(statsData.value);
        if (adsData.status === 'fulfilled' && adsData.value?.ads) setAds(adsData.value.ads);
        if (auditData.status === 'fulfilled') setAuditLogs(auditData.value?.logs || (Array.isArray(auditData.value) ? auditData.value : []));
      } catch (err) {
        console.error('Failed to load investigator dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalAnalyzed = stats?.kpis?.total_scanned || stats?.totalAds || ads.length || 1500;
  const flaggedCount = stats?.kpis?.flagged_ads || stats?.highRiskCount || 950;
  const toReviewAds = ads.filter(a => a.risk_level === 'High' || a.risk_level === 'Critical' || (a.risk_score || a.riskScore) >= 60).slice(0, 4);
  const openCasesCount = stats?.kpis?.active_campaigns || stats?.campaignsCount || 23;

  const signedInSince = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const watchPhrases = [
    'Rent your bank account',
    'Hand over ATM / debit card',
    'Daily payment, no work needed',
    'Account holders required',
    'OTP, passbook, cheque book',
    'DM or WhatsApp to continue',
    'Apna account use karne do'
  ];

  return (
    <div className="dashboard-root">
      {/* Welcome Card */}
      <div className="wc">
        <div className="av">
          {getInitials(user?.name || user?.username || 'Investigator')}
        </div>
        <div>
          <div className="mu sm">
            {getGreeting()} · {getFormattedDate()}
          </div>
          <h1>Welcome back, {user?.name || 'Demo Investigator'}</h1>
          <div className="chips">
            <span>Role: Investigator</span>
            <span>Signed in: {signedInSince}</span>
            <span>Access: Analysis, review, cases</span>
            <span>{openCasesCount} open case(s)</span>
          </div>
        </div>
      </div>

      {/* 4-Stat Metric Row */}
      <div className="sg">
        <div>
          <div className="num">{totalAnalyzed}</div>
          <div className="mu sm">Analyzed</div>
        </div>
        <div>
          <div className="num" style={{ color: 'var(--redt)' }}>
            {flaggedCount}
          </div>
          <div className="mu sm">Flagged</div>
        </div>
        <div>
          <div className="num">{stats?.unreviewedCount || toReviewAds.length || 2}</div>
          <div className="mu sm">To review</div>
        </div>
        <div>
          <div className="num">{openCasesCount}</div>
          <div className="mu sm">Campaigns</div>
        </div>
      </div>

      {/* Two-Column Grid: Live News Ticker + Workbench / Reporting */}
      <div className="dg">
        <CyberCrimeWatch height={540} />

        <div>
          <div className="card fx">
            <h2>Your workbench</h2>
            <div className="sm mu" style={{ marginBottom: '10px' }}>
              Waiting for your review
            </div>

            {toReviewAds.length > 0 ? (
              toReviewAds.map((r) => (
                <div
                  className="row"
                  key={r.id}
                  style={{
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--bd)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link
                      to={`/ads/${r.id}`}
                      style={{ color: 'var(--cy)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {r.id}
                    </Link>
                    <span className="pill High">{r.risk_score || r.riskScore || 85}</span>
                  </div>
                  <span className="mu sm">
                    {r.language || 'English'} · {r.platform || 'Public Ad'}
                  </span>
                </div>
              ))
            ) : (
              <div className="mu sm" style={{ padding: '8px 0' }}>
                Nothing pending. Nice work.
              </div>
            )}

            <div className="sm mu" style={{ marginTop: '14px' }}>
              {openCasesCount} open syndicate case(s). Manage them from Evidence Dossiers or Syndicates.
            </div>

            <div className="row" style={{ marginTop: '12px' }}>
              <Link to="/ads" className="b sm p" style={{ textDecoration: 'none' }}>
                Evidence Dossiers
              </Link>
              <Link to="/analyze" className="b sm" style={{ textDecoration: 'none' }}>
                Analyze New Ad
              </Link>
              <Link to="/campaigns" className="b sm" style={{ textDecoration: 'none' }}>
                Syndicates
              </Link>
            </div>
          </div>

          <div className="card">
            <h2>Report cyber fraud</h2>
            <div className="sm" style={{ marginBottom: '6px' }}>
              National Cyber Crime Helpline: <b style={{ color: 'var(--redt)', fontSize: '15px' }}>1930</b>
            </div>
            <div className="sm" style={{ marginBottom: '8px' }}>
              Online Portal:{' '}
              <a
                href="https://cybercrime.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--cy)', fontWeight: 600 }}
              >
                cybercrime.gov.in
              </a>
            </div>
            <div className="mu sm">
              Screening results here are leads for investigators, not formal legal complaints.
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Watch Phrases + Recent Activity */}
      <div className="dg">
        <div className="card">
          <h2>Watch for these phrases</h2>
          <div className="fl2">
            {watchPhrases.map(p => (
              <span key={p}>{p}</span>
            ))}
          </div>
          <div className="mu sm" style={{ marginTop: '10px' }}>
            Common wording in mule-account recruitment ads. A phrase alone is a clue, not proof.
          </div>
        </div>

        <div className="card">
          <h2>Recent activity</h2>
          {auditLogs.length > 0 ? (
            auditLogs.slice(0, 5).map((a, i) => (
              <div className="row sm" key={a.id || i} style={{ padding: '4px 0' }}>
                <b>@{a.username || 'investigator'}</b>
                <span>{a.details || a.action}</span>
                <span className="mu" style={{ marginLeft: 'auto' }}>
                  {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Recent'}
                </span>
              </div>
            ))
          ) : (
            <div className="mu sm">No activity yet. Review an ad or open a case.</div>
          )}
        </div>
      </div>
    </div>
  );
}
