import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { AdminDashboard } from './dashboards/AdminDashboard.jsx';
import { VictimDashboard } from './dashboards/VictimDashboard.jsx';
import { InvestigatorDashboard } from './dashboards/InvestigatorDashboard.jsx';

export function Overview() {
  const { user } = useAuth();
  const role = (user?.role || 'Admin').toLowerCase();

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'victim' || role === 'citizen' || role === 'analyst') {
    return <VictimDashboard />;
  }

  // Default to Investigator Dashboard (for 'investigator', 'officer', or fallback)
  return <InvestigatorDashboard />;
}
