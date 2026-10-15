import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Sidebar } from './components/Sidebar.jsx';

import { LandingPage } from './pages/LandingPage.jsx';
import { Login } from './pages/Login.jsx';
import { SignUp } from './pages/SignUp.jsx';
import { Overview } from './pages/Overview.jsx';
import { LiveAlerts } from './pages/LiveAlerts.jsx';
import { AdsList } from './pages/AdsList.jsx';
import { AdDetail } from './pages/AdDetail.jsx';
import { Campaigns } from './pages/Campaigns.jsx';
import { NetworkGraph } from './pages/NetworkGraph.jsx';
import { EntitySearch } from './pages/EntitySearch.jsx';
import { AnalyzeNow } from './pages/AnalyzeNow.jsx';
import { Reports } from './pages/Reports.jsx';
import { ModelRules } from './pages/ModelRules.jsx';
import { AuditLog } from './pages/AuditLog.jsx';

import { LatestNews } from './pages/dashboards/LatestNews.jsx';
import { ReportAd } from './pages/dashboards/ReportAd.jsx';
import { MyReports } from './pages/dashboards/MyReports.jsx';
import { UsersManagement } from './pages/dashboards/UsersManagement.jsx';
import { GeminiCopilot } from './components/GeminiCopilot.jsx';

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#040A22] text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-53px)] pb-12">
          <Routes>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/news" element={<LatestNews />} />
            <Route path="/report-ad" element={<ReportAd />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/users" element={<UsersManagement />} />
            <Route path="/alerts" element={<LiveAlerts />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/graph" element={<NetworkGraph />} />
            <Route path="/entities" element={<EntitySearch />} />
            <Route path="/analyze" element={<AnalyzeNow />} />
            <Route path="/ads" element={<AdsList />} />
            <Route path="/ads/:id" element={<AdDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/rules" element={<ModelRules />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <GeminiCopilot />
    </div>
  );
}

function MainAppRoutes() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Root route ('/'):
  // ALWAYS renders the Landing Page & Intro Animation!
  if (location.pathname === '/' || location.pathname === '/landing') {
    return <LandingPage />;
  }

  // 2. Explicit Login Page route (shows Login Card in the side)
  if (location.pathname === '/login') {
    return <Login initialMode="login" />;
  }

  // 3. Explicit Sign Up Page route (shows Sign Up Card replacing Login Card in the side)
  if (location.pathname === '/signup') {
    return <Login initialMode="signup" />;
  }

  // 3. Main Website Console routes (/dashboard, /alerts, /campaigns, /graph, etc.)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <ProtectedLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainAppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
