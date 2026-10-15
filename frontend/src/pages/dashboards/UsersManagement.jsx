import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useCardSpotlight } from './dashboardUtils.js';
import './Dashboards.css';

export function UsersManagement() {
  useCardSpotlight();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      if (res?.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApprove = async (username) => {
    try {
      await api.approveUser(username);
      showToast(`User @${username} approved`);
      await loadUsers();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleRemove = async (username) => {
    if (!window.confirm(`Are you sure you want to remove or reject user @${username}?`)) return;
    try {
      await api.deleteUser(username);
      showToast(`User @${username} removed`);
      await loadUsers();
    } catch (err) {
      alert(`Deletion error: ${err.message}`);
    }
  };

  return (
    <div className="dashboard-root" style={{ maxWidth: '960px', margin: '0 auto' }}>
      {toast && (
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
          {toast}
        </div>
      )}

      <h1>Users</h1>
      <div className="sub">
        Approve investigator accounts and audit official department clearances.
      </div>

      <div className="card scroll">
        {users.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department / Badge</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isApproved = u.approved !== false && u.ok !== false;
                const isProtected = ['admin', 'victim', 'investigator'].includes(u.username?.toLowerCase());

                return (
                  <tr key={u.id || u.username}>
                    <td>
                      <b>@{u.username}</b>
                    </td>
                    <td>{u.name}</td>
                    <td>{u.role || 'Investigator'}</td>
                    <td className="mu sm">
                      {u.department || '—'} {u.badge ? `(${u.badge})` : ''}
                    </td>
                    <td>
                      <span className={`st2 ${isApproved ? 'c' : 'a'}`}>
                        {isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {!isApproved && (
                          <button
                            className="b sm p"
                            onClick={() => handleApprove(u.username)}
                          >
                            Approve
                          </button>
                        )}
                        {!isProtected && (
                          <button
                            className="b sm d"
                            onClick={() => handleRemove(u.username)}
                          >
                            Remove
                          </button>
                        )}
                        {isProtected && (
                          <span className="mu sm" style={{ padding: '4px 6px' }}>
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mu">No registered user accounts found.</p>
        )}
      </div>

      <div className="mu sm" style={{ marginTop: '12px' }}>
        Built-in demo accounts (admin, victim, investigator) are protected by system security policy.
      </div>
    </div>
  );
}
