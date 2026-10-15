import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  BellRing,
  Network,
  Share2,
  SearchCheck,
  Zap,
  FileSearch,
  FileText,
  Sliders,
  History,
  AlertTriangle,
  Newspaper,
  ClipboardList,
  Users,
  ShieldAlert
} from 'lucide-react';

export function Sidebar() {
  const { user } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/news', label: 'Latest News', icon: Newspaper, badge: 'Live' },
    { to: '/report-ad', label: 'Report an Ad', icon: ShieldAlert, role: ['Victim', 'Citizen', 'Analyst', 'Admin'] },
    { to: '/my-reports', label: 'My Reports', icon: ClipboardList, role: ['Victim', 'Citizen', 'Analyst', 'Admin'] },
    { to: '/users', label: 'User Approvals', icon: Users, role: ['Admin'] },
    { to: '/alerts', label: 'Live Alerts', icon: BellRing, role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/campaigns', label: 'Coordinated Syndicates', icon: Network, role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/graph', label: 'Network Graph', icon: Share2, role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/entities', label: 'Entity Search', icon: SearchCheck, role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/analyze', label: 'Analyze Now', icon: Zap, badge: 'Live AI', role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/ads', label: 'Evidence Dossiers', icon: FileSearch, role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/reports', label: 'Official Reports', icon: FileText, role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/rules', label: 'Pattern Library', icon: Sliders, role: ['Admin', 'Investigator', 'Officer'] },
    { to: '/audit', label: 'Audit Trail', icon: History, role: ['Admin', 'Investigator', 'Officer'] }
  ];

  const visibleLinks = links.filter(l => !l.role || l.role.includes(user?.role));

  return (
    <aside className="w-64 flex-shrink-0 border-r border-blue-900/35 bg-[#040A22] flex flex-col justify-between hidden md:flex min-h-[calc(100vh-53px)]">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Investigation Console
        </div>

        {visibleLinks.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-l-2 border-cyan-400 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span>{label}</span>
            </div>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Mandatory Prototype Disclaimer Box */}
      <div className="p-3 m-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Synthetic Prototype</span>
        </div>
        <p className="leading-relaxed text-[10px] text-slate-400">
          Flags indicate suspicious indicators for investigative triage, not conclusive legal guilt. Public synthetic data only.
        </p>
      </div>
    </aside>
  );
}
