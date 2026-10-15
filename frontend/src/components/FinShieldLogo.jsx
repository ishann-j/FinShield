import React from 'react';

/**
 * FinShieldLogo — Official Brand Logo & Animations
 * Matches the official FinShield shield emblem with stylized F,
 * electric blue magnifying glass, and warning triangle threat indicator.
 *
 * Variants:
 *  - 'icon': Emblem only (for navbar, small brand marks, buttons)
 *  - 'full': Emblem + Wordmark ("FinShield") + Tagline ("DETECT • PREVENT • PROTECT")
 *  - 'hero': Enhanced 3D animated hero showcase for Login page
 */
export function FinShieldLogo({
  variant = 'icon',
  size = 40,
  className = '',
  tagline = true,
  glow = false,
  light = false
}) {
  // SVG emblem paths
  const emblem = (
    <svg
      viewBox="0 0 200 200"
      width={variant === 'hero' ? '100%' : size}
      height={variant === 'hero' ? '100%' : size}
      className={`finshield-emblem ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Glow filters */}
        <filter id="electricGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="shieldStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e6ae8" />
          <stop offset="50%" stopColor="#0047ba" />
          <stop offset="100%" stopColor="#002d7a" />
        </linearGradient>

        <linearGradient id="fLetterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0a2e6b" />
        </linearGradient>

        <linearGradient id="lensBackdrop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>

        <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0066ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outer Shield Frame */}
      <path
        d="M 100 17 
           L 160 43 
           C 160 92 151 134 100 173 
           C 49 134 40 92 40 43 
           Z"
        fill={variant === 'hero' ? 'rgba(7, 24, 60, 0.65)' : 'none'}
        stroke="url(#shieldStrokeGrad)"
        strokeWidth="13"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="shield-path"
      />

      {/* Stylized "F" */}
      <path
        d="M 67 55
           L 134 55
           C 140 55 143 58 140 64
           L 133 73
           C 130 77 126 78 120 78
           L 89 78
           L 89 91
           L 112 91
           C 117 91 119 94 117 99
           L 114 105
           C 112 108 108 110 103 110
           L 89 110
           L 89 135
           C 89 140 85 144 80 144
           L 77 144
           C 71 144 67 140 67 135
           Z"
        fill={light ? '#ffffff' : 'url(#fLetterGrad)'}
        className="f-letter-path"
      />

      {/* Magnifying Glass Handle (at 45 degree angle) */}
      <line
        x1="152"
        y1="134"
        x2="176"
        y2="158"
        stroke="#0066ff"
        strokeWidth="15"
        strokeLinecap="round"
        className="glass-handle"
      />

      {/* Magnifying Glass Outer Lens Ring */}
      <circle
        cx="135"
        cy="116"
        r="27"
        fill="url(#lensBackdrop)"
        stroke="#0066ff"
        strokeWidth="9"
        className="glass-lens"
      />

      {/* Radar Scan Aura (active in hero mode) */}
      {variant === 'hero' && (
        <circle
          cx="135"
          cy="116"
          r="22"
          fill="url(#radarSweepGrad)"
          className="lens-radar-sweep"
        />
      )}

      {/* Warning Triangle inside Lens */}
      <path
        d="M 135 101
           L 148 124
           C 149 126 148 127 145 127
           L 125 127
           C 122 127 121 126 122 124
           Z"
        fill="#002b66"
        stroke="#002b66"
        strokeWidth="3"
        strokeLinejoin="round"
        className="warning-triangle"
      />

      {/* Exclamation Mark inside Triangle */}
      <line
        x1="135"
        y1="109"
        x2="135"
        y2="118"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle
        cx="135"
        cy="122.5"
        r="1.6"
        fill="#ffffff"
      />
    </svg>
  );

  if (variant === 'icon') {
    return emblem;
  }

  if (variant === 'hero') {
    return (
      <div className="finshield-hero-container">
        {/* Ambient Holographic Glow Behind Shield */}
        <div className="hero-emblem-glow" />
        {/* Core Animated Emblem */}
        <div className="hero-emblem-wrapper">
          {emblem}
        </div>
      </div>
    );
  }

  // variant === 'full'
  return (
    <div className={`finshield-brand-full flex items-center gap-3 ${className}`}>
      <div className="finshield-brand-icon flex-shrink-0">
        {emblem}
      </div>
      <div className="finshield-brand-text flex flex-col justify-center">
        <div className="finshield-brand-title font-black tracking-tight text-xl leading-none">
          <span className={light ? 'text-white' : 'text-[#002b66] dark:text-white'}>Fin</span>
          <span className="text-[#0066ff]">Shield</span>
        </div>
        {tagline && (
          <div className="finshield-brand-tagline text-[9.5px] uppercase font-bold tracking-[0.18em] text-[#0066ff]/90 dark:text-sky-300 mt-1 font-mono">
            DETECT • PREVENT • PROTECT
          </div>
        )}
      </div>
    </div>
  );
}

export default FinShieldLogo;
