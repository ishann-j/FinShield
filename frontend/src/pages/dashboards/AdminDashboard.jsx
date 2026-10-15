import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { useCardSpotlight, getGreeting, getFormattedDate, getInitials, getStoredReports } from './dashboardUtils.js';
import './Dashboards.css';

export function AdminDashboard() {
  useCardSpotlight();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');

  const loadData = async () => {
    try {
      const [userData, statsData, auditData] = await Promise.allSettled([
        api.getUsers(),
        api.getOverviewStats(),
        api.getAuditLogs(10)
      ]);

      if (userData.status === 'fulfilled' && userData.value?.users) {
        setUsers(userData.value.users);
      }
      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }
      if (auditData.status === 'fulfilled') {
        const logs = auditData.value?.logs || (Array.isArray(auditData.value) ? auditData.value : []);
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setReports(getStoredReports());
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (username) => {
    try {
      await api.approveUser(username);
      setActionNotice(`Approved investigator clearance for @${username}`);
      await loadData();
      setTimeout(() => setActionNotice(''), 3500);
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (username) => {
    if (!window.confirm(`Remove or reject account @${username}?`)) return;
    try {
      await api.deleteUser(username);
      setActionNotice(`Removed account @${username}`);
      await loadData();
      setTimeout(() => setActionNotice(''), 3500);
    } catch (err) {
      alert(`Removal error: ${err.message}`);
    }
  };

  // Derive counts
  const pendingApprovals = users.filter(u => u.approved === false || u.ok === false);
  const investigatorsCount = users.filter(u => (u.role === 'Investigator' || u.role === 'Officer') && (u.approved !== false && u.ok !== false)).length || 1;
  const citizensCount = users.filter(u => u.role === 'Victim' || u.role === 'Citizen' || u.role === 'Analyst').length || 1;
  const reportsCount = reports.length;

  const pipelineCounts = {
    Received: reports.filter(r => (r.status || 'Received') === 'Received').length,
    'Under review': reports.filter(r => r.status === 'Under review').length,
    Reviewed: reports.filter(r => r.status === 'Reviewed').length,
    Escalated: reports.filter(r => r.status === 'Escalated').length,
    Closed: reports.filter(r => r.status === 'Closed').length
  };
  const maxPipeline = Math.max(1, reportsCount);

  const unreviewedCount = stats?.unreviewedCount ?? 2;
  const signedInSince = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="dashboard-root">
      {actionNotice && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--blue)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontWeight: 600,
          fontFamily: 'IBM Plex Sans, sans-serif'
        }}>
          {actionNotice}
        </div>
      )}

      {/* Welcome Card */}
      <div className="wc">
        <div className="av">
          {getInitials(user?.name || user?.username || 'Admin')}
        </div>
        <div>
          <div className="mu sm">
            {getGreeting()} · {getFormattedDate()}
          </div>
          <h1>Welcome back, {user?.name || 'Demo Admin'}</h1>
          <div className="chips">
            <span>Account: Admin</span>
            <span>Username: @{user?.username || 'admin'}</span>
            <span>Signed in: {signedInSince}</span>
            <span>Access: manage users and patterns</span>
          </div>
        </div>
      </div>

      {/* 4-Stat Metric Row */}
      <div className="sg">
        <div>
          <div className="num" style={{ color: pendingApprovals.length ? 'var(--redt)' : 'inherit' }}>
            {pendingApprovals.length}
          </div>
          <div className="mu sm">Pending approvals</div>
        </div>
        <div>
          <div className="num">{investigatorsCount}</div>
          <div className="mu sm">Investigators</div>
        </div>
        <div>
          <div className="num">{citizensCount}</div>
          <div className="mu sm">Citizens</div>
        </div>
        <div>
          <div className="num">{reportsCount}</div>
          <div className="mu sm">Reports received</div>
        </div>
      </div>

      {/* Two-Column Grid: Approvals + Pipeline */}
      <div className="dg">
        <div className={`card ${pendingApprovals.length ? 'fx' : ''}`}>
          <h2>Pending investigator approvals</h2>
          {pendingApprovals.length > 0 ? (
            pendingApprovals.map(u => (
              <div className="row" key={u.id || u.username} style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <b>@{u.username}</b>
                  <span>{u.name}</span>
                  <span className="mu sm">
                    {u.department || 'Cyber Cell'} · {u.badge || u.officialId || 'ID-PENDING'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="b sm p" onClick={() => handleApprove(u.username)}>
                    Approve
                  </button>
                  <button className="b sm d" onClick={() => handleReject(u.username)}>
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="mu sm" style={{ padding: '8px 0' }}>
              No pending approvals. All registered investigator accounts are active.
            </div>
          )}
          <div className="mu sm" style={{ marginTop: '12px' }}>
            Check the department and official ID before approving. The system cannot verify them for you.
          </div>
        </div>

        <div className="card">
          <h2>Reports pipeline</h2>
          {['Received', 'Under review', 'Reviewed', 'Escalated', 'Closed'].map(k => (
            <div className="row" key={k}>
              <span style={{ width: '110px' }}>{k}</span>
              <div
                className="bar"
                style={{
                  width: `${(pipelineCounts[k] / maxPipeline) * 50 + 2}%`,
                  transition: 'width 0.4s ease'
                }}
              />
              <span style={{ marginLeft: '4px' }}>{pipelineCounts[k]}</span>
            </div>
          ))}
          <div className="mu sm" style={{ marginTop: '10px' }}>
            {unreviewedCount} high-risk item(s) still unreviewed by investigators.
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Admin Actions + System Summary */}
      <div className="dg">
        <div className="card">
          <h2>Recent admin actions</h2>
          {auditLogs.length > 0 ? (
            auditLogs.slice(0, 6).map((a, i) => (
              <div className="row sm" key={a.id || i} style={{ padding: '4px 0' }}>
                <b>@{a.username || 'admin'}</b>
                <span>{a.details || a.action}</span>
                <span className="mu" style={{ marginLeft: 'auto' }}>
                  {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Recent'}
                </span>
              </div>
            ))
          ) : (
            <div className="mu sm">No actions yet. Approvals and removals are logged here.</div>
          )}
        </div>

        <div className="card">
          <h2>System summary</h2>
          <div className="sm" style={{ marginBottom: '4px' }}>
            Records stored: <b>{stats?.kpis?.total_scanned || stats?.totalAds || 1500}</b>
          </div>
          <div className="sm" style={{ marginBottom: '4px' }}>
            Patterns in library: <b>7 detection rules</b>
          </div>
          <div className="sm" style={{ marginBottom: '4px' }}>
            Open cases / syndicates: <b>{stats?.kpis?.active_campaigns || stats?.campaignsCount || 23}</b>
          </div>

          <div className="row" style={{ marginTop: '14px' }}>
            <Link to="/users" className="b sm p" style={{ textDecoration: 'none' }}>
              Manage Users
            </Link>
            <Link to="/rules" className="b sm" style={{ textDecoration: 'none' }}>
              Pattern Library
            </Link>
            <Link to="/audit" className="b sm" style={{ textDecoration: 'none' }}>
              Audit Trail
            </Link>
          </div>

          <div className="mu sm" style={{ marginTop: '12px' }}>
            FinGuard Sentinel SOC: All actions and approvals are committed to the audit ledger.
          </div>
        </div>
      </div>
    </div>
  );
}
