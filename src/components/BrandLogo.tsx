import React from 'react';
import { SYSTEM_IDENTITY } from '../config/systemConfig';

interface BrandLogoProps {
  collapsed?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ collapsed = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: 0,
      }}
    >
      {/* Custom technical battery-cell & waveform emblem */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="BattVision technical mark"
        style={{ flexShrink: 0 }}
      >
        {/* Outer precision housing */}
        <rect
          x="2"
          y="4"
          width="28"
          height="28"
          rx="2"
          fill="#151916"
          stroke="#4E564C"
          strokeWidth="1.25"
        />
        {/* Positive battery terminal lug */}
        <rect
          x="30"
          y="12"
          width="4"
          height="12"
          rx="1"
          fill="#272C27"
          stroke="#B8D65A"
          strokeWidth="1.25"
        />
        {/* Corner registration ticks */}
        <path d="M5 9V7H7" stroke="#92998D" strokeWidth="1" />
        <path d="M27 27V29H25" stroke="#92998D" strokeWidth="1" />
        {/* Internal cell bus bars */}
        <line x1="7" y1="10" x2="25" y2="10" stroke="#3B4139" strokeWidth="1" />
        <line x1="7" y1="26" x2="25" y2="26" stroke="#3B4139" strokeWidth="1" />
        {/* Electrical diagnostic pulse waveform */}
        <path
          d="M5.5 18H10.5L13 12.5L16.5 23.5L19.5 15.5L21.5 18H26.5"
          stroke="#B8D65A"
          strokeWidth="1.75"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Node dots */}
        <circle cx="5.5" cy="18" r="1.3" fill="#D6D2C5" />
        <circle cx="26.5" cy="18" r="1.3" fill="#B8D65A" />
      </svg>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.15 }}>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.14em',
              color: 'var(--text-primary)',
            }}
          >
            {SYSTEM_IDENTITY.productName}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '7.8px',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            {SYSTEM_IDENTITY.subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
