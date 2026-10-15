import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { CyberCrimeWatch } from './CyberCrimeWatch.jsx';
import {
  useCardSpotlight,
  getGreeting,
  getFormattedDate,
  getInitials,
  getStoredReports,
  rstat
} from './dashboardUtils.js';
import './Dashboards.css';

export function VictimDashboard() {
  useCardSpotlight();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const all = getStoredReports();
    // Filter reports submitted by current user or show recent public reports
    const myReports = all.filter(r => !r.by || r.by === user?.username || r.by === 'citizen');
    setReports(myReports);
  }, [user]);

  const stats = {
    sent: reports.length,
    waiting: reports.filter(r => rstat(r)[0] === 'Received').length,
    lookedAt: reports.filter(r => ['Under review', 'Reviewed', 'Escalated'].includes(rstat(r)[0])).length,
    closed: reports.filter(r => rstat(r)[0] === 'Closed').length
  };

  const signedInSince = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const safeTips = [
    'Never share OTP or PIN',
    'Never hand over your ATM or debit card',
    'Do not rent or sell your bank account',
    'Ignore "easy money, no work" offers',
    'Verify before you reply',
    'Report suspicious ads'
  ];

  return (
    <div className="dashboard-root">
      {/* Welcome Card */}
      <div className="wc">
        <div className="av">
          {getInitials(user?.name || user?.username || 'Citizen')}
        </div>
        <div>
          <div className="mu sm">
            {getGreeting()} · {getFormattedDate()}
          </div>
          <h1>Welcome back, {user?.name || 'Demo Citizen'}</h1>
          <div className="chips">
            <span>Account: Citizen</span>
            <span>Username: @{user?.username || 'citizen'}</span>
            <span>Signed in: {signedInSince}</span>
          </div>
        </div>
      </div>

      {/* 4-Stat Metric Row */}
      <div className="sg">
        <div>
          <div className="num">{stats.sent}</div>
          <div className="mu sm">Reports sent</div>
        </div>
        <div>
          <div className="num">{stats.waiting}</div>
          <div className="mu sm">Waiting</div>
        </div>
        <div>
          <div className="num">{stats.lookedAt}</div>
          <div className="mu sm">Looked at</div>
        </div>
        <div>
          <div className="num">{stats.closed}</div>
          <div className="mu sm">Closed</div>
        </div>
      </div>

      {/* Two-Column Grid: Watch Ticker + Reporting Card / Recent Reports */}
      <div className="dg">
        <CyberCrimeWatch height={540} />

        <div>
          <div className="card fx">
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
            <div className="mu sm" style={{ marginBottom: '14px' }}>
              A report submitted here is triaged for investigative intelligence. File officially with authorities if money, bank instruments, or personal credentials were breached.
            </div>
            <div className="row">
              <Link to="/report-ad" className="b sm p" style={{ textDecoration: 'none' }}>
                Report an ad
              </Link>
              <Link to="/my-reports" className="b sm" style={{ textDecoration: 'none' }}>
                My reports
              </Link>
              <Link to="/news" className="b sm" style={{ textDecoration: 'none' }}>
                Latest News
              </Link>
            </div>
          </div>

          <div className="card">
            <h2>Your recent reports</h2>
            {reports.slice(0, 4).map((r) => {
              const [statusName, note, colorCls] = rstat(r);
              return (
                <div className="row sm" key={r.id} style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <b>{r.id}</b>
                    <span className={`st2 ${colorCls}`}>{statusName}</span>
                  </div>
                  <span className="mu">{r.t || 'Recent'}</span>
                </div>
              );
            })}
            {reports.length === 0 && (
              <div className="mu sm" style={{ padding: '8px 0' }}>
                No reports submitted yet. If you see a recruitment offer for bank accounts or cards, click "Report an ad".
              </div>
            )}
            <div style={{ marginTop: '12px' }}>
              <Link to="/my-reports" className="sm" style={{ color: 'var(--cy)', textDecoration: 'none' }}>
                View all report statuses ↗
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Stay Safe + How Reporting Works */}
      <div className="dg">
        <div className="card">
          <h2>Stay safe</h2>
          <div className="fl2">
            {safeTips.map(tip => (
              <span key={tip}>{tip}</span>
            ))}
          </div>
          <div className="mu sm" style={{ marginTop: '10px' }}>
            Account rental schemes violate RBI guidelines and Prevention of Money Laundering Act (PMLA). Never lend banking credentials.
          </div>
        </div>

        <div className="card">
          <h2>How reporting works</h2>
          <div className="sm" style={{ marginBottom: '6px' }}>
            1. You check or submit an advertisement or message.
          </div>
          <div className="sm" style={{ marginBottom: '6px' }}>
            2. Suspicious reports reach investigators with your account handle so they can follow up.
          </div>
          <div className="sm" style={{ marginBottom: '6px' }}>
            3. Track your report status in real time in My reports.
          </div>
          <div className="mu sm" style={{ marginTop: '8px' }}>
            Automated heuristic screening occurs instantly upon submission.
          </div>
        </div>
      </div>
    </div>
  );
}
