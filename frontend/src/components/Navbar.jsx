import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { FinShieldLogo } from './FinShieldLogo.jsx';
import {
  ShieldAlert,
  Bell,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  ChevronDown,
  Activity,
  Radio,
  ExternalLink
} from 'lucide-react';

export function Navbar() {
  const { user, logout, switchRole, theme, toggleTheme } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const data = await api.getUnreadAlertsCount();
        if (isMounted) setUnreadCount(data.unread_count || 0);
      } catch {
        // silent
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleRoleSwitch = async (role) => {
    await switchRole(role);
    setRoleMenuOpen(false);
    navigate('/dashboard');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-900/35 bg-[#061536]/90 backdrop-blur-md px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-950/70 via-slate-900 to-sky-950/80 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 group-hover:border-sky-400 transition-all p-1">
              <FinShieldLogo variant="icon" size={28} light={true} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-white">
                  Fin<span className="text-[#0066ff]">Shield</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-sky-400">
                  AI SOC v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5 hidden sm:block">
                DETECT • PREVENT • PROTECT • Threat Intelligence System
              </p>
            </div>
          </Link>
        </div>

        {/* Center Live Radar Status */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-slate-300">
            Scanning 7 Platforms (Synthetic Data)
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-1" />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 text-slate-300 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-sky-400" />}
          </button>

          {/* Alert Notification Bell */}
          <Link
            to="/alerts"
            className="relative p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 text-slate-300 transition-colors"
            title="Live Alerts"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md shadow-red-500/50 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Quick Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
              <div className="text-left hidden sm:block">
                <div className="font-semibold">{user?.name?.split(' ')[0]}</div>
                <div className="text-[10px] text-cyan-400 font-mono -mt-0.5">{user?.role}</div>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Role Switcher (Demo)
                  </div>
                </div>
                {['Admin', 'Victim', 'Investigator'].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      user?.role === role ? 'text-cyan-400 font-bold bg-slate-800/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{role} Role</span>
                    {user?.role === role && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                  </button>
                ))}
                <div className="border-t border-slate-800 mt-1 pt-1">
                  <Link
                    to="/landing"
                    onClick={() => setRoleMenuOpen(false)}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
                    <span>View Landing Page</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/30 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
