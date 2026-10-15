import { useEffect } from 'react';

export function useCardSpotlight() {
  useEffect(() => {
    const handleMouseMove = (e) => {
      const card = e.target.closest && e.target.closest('.card');
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getFormattedDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getInitials(name = '') {
  if (!name) return 'FG';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const SEED_REPORTS = [
  {
    id: 'R-101',
    mode: 'public',
    by: 'citizen',
    byName: 'Demo Citizen',
    text: 'Rent your bank account and earn money. Earn Rs 5000 per week, no work needed. DM fast on Telegram @acct_rent_demo or call +91 00000 11111.',
    src: 'Public report: Received a message (Telegram)',
    status: 'Under review',
    statusNote: 'Investigators have opened a case and are reviewing it.',
    statusClass: 'a',
    t: '15/10/2026, 09:30'
  },
  {
    id: 'R-102',
    mode: 'public',
    by: 'citizen',
    byName: 'Demo Citizen',
    text: 'Apna bank account rent par do. Apna account use karne do, daily payment milegi. Jaldi WhatsApp karo +91 00000 11111',
    src: 'Public report: Saw an ad (WhatsApp)',
    status: 'Reviewed',
    statusNote: 'Investigators reviewed it and confirmed high-risk mule recruitment indicators.',
    statusClass: 'b',
    t: '14/10/2026, 16:45'
  },
  {
    id: 'R-103',
    mode: 'public',
    by: 'citizen',
    byName: 'Demo Citizen',
    text: 'Hand over your ATM debit card for immediate commission. Contact @cardlink_demo on Instagram.',
    src: 'Public report: Saw an ad (Instagram)',
    status: 'Received',
    statusNote: 'Your report is in the queue waiting for investigator assignment.',
    statusClass: 'c',
    t: '15/10/2026, 11:15'
  }
];

export function getStoredReports() {
  try {
    const raw = localStorage.getItem('finguard_reports');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveStoredReports(SEED_REPORTS);
  return SEED_REPORTS;
}

export function saveStoredReports(reports) {
  try {
    localStorage.setItem('finguard_reports', JSON.stringify(reports));
  } catch {}
}

export function addStoredReport(report) {
  const reports = getStoredReports();
  reports.unshift(report);
  saveStoredReports(reports);
  return report;
}

export function rstat(report) {
  if (!report) return ['Received', 'Waiting for investigator assignment.', 'c'];
  const s = report.status || 'Received';
  if (s === 'Closed') return ['Closed', report.statusNote || 'Investigators have closed this report.', 'x'];
  if (s === 'Escalated') return ['Escalated', report.statusNote || 'Investigators have escalated this report for LEA action.', 'r'];
  if (s === 'Under review') return ['Under review', report.statusNote || 'Investigators have opened a case and are reviewing it.', 'a'];
  if (s === 'Reviewed') return ['Reviewed', report.statusNote || 'Investigators have evaluated this ad.', 'b'];
  return ['Received', report.statusNote || 'Your report is waiting for an investigator.', 'c'];
}
