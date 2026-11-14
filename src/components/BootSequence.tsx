import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_STEPS = [
  { label: 'INITIALISING INTERFACE', status: 'OK' },
  { label: 'LOADING SYSTEM CONFIGURATION (BV-PACK-8S4P)', status: 'OK' },
  { label: 'INITIALISING TELEMETRY LAYER', status: 'SIMULATION' },
  { label: 'CHECKING LOCAL SERVICES', status: 'OFFLINE / DEMO' },
  { label: 'LOADING DASHBOARD', status: 'READY' },
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState<number>(0);

  useEffect(() => {
    const timers: number[] = [];
    BOOT_STEPS.forEach((_, idx) => {
      timers.push(window.setTimeout(() => setStepIndex(idx + 1), 240 + idx * 240));
    });
    timers.push(window.setTimeout(() => onComplete(), 1750));

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('keydown', handleKey);
    };
  }, [onComplete]);

  const progressPct = Math.min(100, Math.round((stepIndex / BOOT_STEPS.length) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="BattVision workstation initialisation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        backgroundColor: '#131614',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundImage:
          'linear-gradient(to right, rgba(59, 65, 57, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 65, 57, 0.14) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div
        className="bv-panel"
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '22px',
          backgroundColor: '#1A1E1B',
          border: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <BrandLogo />
          <button
            type="button"
            className="bv-btn"
            onClick={onComplete}
            style={{ fontSize: '9.5px', padding: '4px 8px' }}
          >
            SKIP [ESC]
          </button>
        </div>

        <div
          className="mono"
          style={{
            backgroundColor: '#121513',
            border: '1px solid var(--border-subtle)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            fontSize: '10.5px',
          }}
        >
          {BOOT_STEPS.map((st, idx) => {
            const visible = idx < stepIndex;
            return (
              <div
                key={st.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: visible ? 1 : 0.22,
                  transition: 'opacity 140ms ease',
                }}
              >
                <span style={{ color: visible ? 'var(--warm-neutral)' : 'var(--text-muted)' }}>
                  &gt; {st.label}
                </span>
                <span
                  style={{
                    color:
                      st.status === 'READY' || st.status === 'OK'
                        ? 'var(--phosphor-green)'
                        : 'var(--signal-amber)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  [{visible ? st.status : '...'}]
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ height: '5px', backgroundColor: '#101311', border: '1px solid var(--border-color)' }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: 'var(--phosphor-green)',
                transition: 'width 180ms ease',
              }}
            />
          </div>
          <div
            className="mono"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              {stepIndex >= BOOT_STEPS.length
                ? 'INTERFACE INITIALISED · DEMO ENVIRONMENT READY'
                : 'SYSTEM INTERFACE STARTING (NO HARDWARE CLAIMED)'}
            </span>
            <span style={{ color: 'var(--phosphor-green)' }}>{progressPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
