import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCardSpotlight, getStoredReports, rstat } from './dashboardUtils.js';
import './Dashboards.css';

export function MyReports() {
  useCardSpotlight();
  const { user } = useAuth();

  const [reports, setReports] = useState([]);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupNotFound, setLookupNotFound] = useState(false);

  useEffect(() => {
    const all = getStoredReports();
    const my = all.filter(r => !r.by || r.by === user?.username || r.by === 'citizen');
    setReports(my);
  }, [user]);

  const handleLookup = () => {
    const q = lookupQuery.trim().toUpperCase();
    if (!q) return;

    const all = getStoredReports();
    const found = all.find(r => r.id.toUpperCase() === q);

    if (found) {
      setLookupResult(found);
      setLookupNotFound(false);
    } else {
      setLookupResult(null);
      setLookupNotFound(true);
    }
  };

  return (
    <div className="dashboard-root" style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1>My reports</h1>
      <div className="sub">
        Track what happened to reports you sent from your account. You only see a high-level triage status, never investigators' internal notes.
      </div>

      {/* Look Up Report */}
      <div className="card">
        <h2>Look up a report</h2>
        <div className="row" style={{ gap: '10px' }}>
          <input
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="Report ID, e.g. R-101"
            aria-label="Report ID"
            style={{ flex: 1, minWidth: '200px' }}
          />
          <button className="b p" onClick={handleLookup}>
            Check status
          </button>
        </div>

        {lookupNotFound && (
          <div className="warn" style={{ marginTop: '12px' }}>
            No report found with ID "{lookupQuery}". Verify the ID format (e.g., R-101).
          </div>
        )}

        {lookupResult && (
          <div className="card" style={{ marginTop: '14px', background: 'var(--el)', borderColor: 'var(--blue)' }}>
            <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
              <b>{lookupResult.id}</b>
              <span className={`st2 ${rstat(lookupResult)[2]}`}>
                {rstat(lookupResult)[0]}
              </span>
            </div>
            <div className="sm mu" style={{ marginTop: '6px' }}>
              {rstat(lookupResult)[1]}
            </div>
            <div className="mu sm" style={{ marginTop: '8px' }}>
              Submitted: {lookupResult.t || 'Recent'} · Channel: {lookupResult.src || 'Public Submission'}
            </div>
          </div>
        )}
      </div>

      {/* Reports Table */}
      <div className="card scroll">
        <h2>Your reports ({reports.length})</h2>
        {reports.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>ID</th>
                <th style={{ width: '130px' }}>Submitted</th>
                <th>About</th>
                <th style={{ width: '240px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const [statusName, statusNote, statusClass] = rstat(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <b style={{ color: 'var(--cy)' }}>{r.id}</b>
                    </td>
                    <td className="sm mu">{r.t || '-'}</td>
                    <td>
                      <div className="sm" style={{ fontWeight: 500 }}>
                        {r.src ? r.src.replace('Public report: ', '') : 'Online ad / message'}
                      </div>
                      <div className="mu sm" style={{ maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.text}
                      </div>
                    </td>
                    <td>
                      <span className={`st2 ${statusClass}`}>{statusName}</span>
                      <div className="sm mu" style={{ marginTop: '4px' }}>
                        {statusNote}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '12px 0' }}>
            <p className="mu" style={{ marginBottom: '14px' }}>
              No reports registered for your account yet.
            </p>
            <Link to="/report-ad" className="b p" style={{ textDecoration: 'none' }}>
              Report a suspicious ad
            </Link>
          </div>
        )}
      </div>

      <div className="warn sm" style={{ marginTop: '16px' }}>
        A status here indicates screening triage in FinGuard Sentinel. It does not replace a police First Information Report (FIR). For formal legal and monetary recovery action, call <b>1930</b> or visit <b>cybercrime.gov.in</b>.
      </div>
    </div>
  );
}
