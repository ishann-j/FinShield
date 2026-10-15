import React from 'react';
import { NEWS } from './newsData.js';

export function CyberCrimeWatch({ title = 'CYBER CRIME WATCH', subtitle = 'Mule-account headlines · hover to pause', height = 480 }) {
  return (
    <div className="card">
      <div className="nwh">
        <h2>
          <span className="lv">{title}</span>
        </h2>
        <span className="mu sm">{subtitle}</span>
      </div>

      <div className="nwv" role="region" aria-label="Cyber crime news" style={{ height: `${height}px` }}>
        <div className="nwi">
          {/* Primary stream */}
          {NEWS.map((n, i) => (
            <a
              key={`news-${i}`}
              className={`ni ${n.k === 'r' ? 'hot' : ''} ${i === 0 ? 'f' : ''}`}
              href={n.u}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="nt">
                <span className={`tg2 ${n.k}`}>{n.t}</span>
                {i === 0 && <span className="tg2 r">LATEST</span>}
                <span>{n.d}</span>
                <span>· {n.s}</span>
              </div>
              <div className="nh">{n.h}</div>
              <div className="nx">{n.x}</div>
              <div className="sm" style={{ color: 'var(--cy)', marginTop: '4px' }}>
                Read at source ↗
              </div>
            </a>
          ))}

          {/* Duplicate stream for seamless endless CSS loop */}
          {NEWS.map((n, i) => (
            <a
              key={`dup-${i}`}
              className={`ni ${n.k === 'r' ? 'hot' : ''}`}
              href={n.u}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
            >
              <div className="nt">
                <span className={`tg2 ${n.k}`}>{n.t}</span>
                <span>{n.d}</span>
                <span>· {n.s}</span>
              </div>
              <div className="nh">{n.h}</div>
              <div className="nx">{n.x}</div>
              <div className="sm" style={{ color: 'var(--cy)', marginTop: '4px' }}>
                Read at source ↗
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="mu sm" style={{ marginTop: '8px' }}>
        Headlines are compiled from public news reports (October 2026), not a live feed. Open the source for the full investigation story.
      </div>
    </div>
  );
}
