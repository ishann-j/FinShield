import React, { useState } from 'react';
import { NEWS } from './newsData.js';
import { useCardSpotlight } from './dashboardUtils.js';
import './Dashboards.css';

export function LatestNews() {
  useCardSpotlight();
  const [filter, setFilter] = useState('All');

  const getNewsGroup = (n) => {
    if (['ARREST', 'CASE', 'CRACKDOWN'].includes(n.t)) return 'Arrests & cases';
    if (n.t === 'POLICY') return 'Policy';
    return 'Advisory';
  };

  const filtered = NEWS.filter(n => filter === 'All' || getNewsGroup(n) === filter);

  return (
    <div className="dashboard-root" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Latest News</h1>
      <div className="sub">
        Recent enforcement reports and regulatory updates on bank-account renting and mule-account fraud across India.
      </div>

      <div className="row" style={{ gap: '8px', marginBottom: '16px' }}>
        {['All', 'Arrests & cases', 'Policy', 'Advisory'].map(f => (
          <button
            key={f}
            className={`b ${filter === f ? 'p' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
        <span className="mu sm" style={{ marginLeft: '8px' }}>
          {filtered.length} stories
        </span>
      </div>

      <div className="warn sm" style={{ margin: '14px 0', padding: '12px 16px' }}>
        <b>Legal Precedent:</b> Police and cyber cells across multiple states caution that individuals who rent out, lend, or sell their personal bank accounts or ATM cards can be prosecuted as co-accused in organized financial fraud.
      </div>

      <div className="ng">
        {filtered.map((n, i) => (
          <a
            key={i}
            className={`ni ${n.k === 'r' ? 'hot' : ''} ${i === 0 && filter === 'All' ? 'f' : ''}`}
            href={n.u}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="nt">
              <span className={`tg2 ${n.k}`}>{n.t}</span>
              {i === 0 && filter === 'All' && <span className="tg2 r">LATEST</span>}
              <span>{n.d}</span>
              <span>· {n.s}</span>
            </div>
            <div className="nh">{n.h}</div>
            <div className="nx">{n.x}</div>
            <div className="sm" style={{ color: 'var(--cy)', marginTop: '8px', fontWeight: 600 }}>
              Read at source ↗
            </div>
          </a>
        ))}
      </div>

      <div className="mu sm" style={{ marginTop: '20px', borderTop: '1px solid var(--bd)', paddingTop: '12px' }}>
        Headlines are paraphrased from verified Indian news publications and government press releases (compiled October 2026). Open external sources for full reports.
      </div>
    </div>
  );
}
