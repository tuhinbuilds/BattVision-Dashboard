import React from 'react';
import { Pause, Play, Radio, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { DEMO_SCENARIOS } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { usePreferences } from '../services/preferencesService';
import { DemoScenarioId, TelemetryTimeWindowSec } from '../types/telemetry';

interface DemoControlDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SCENARIO_KEYS: DemoScenarioId[] = [
  'NORMAL_OPERATION',
  'TEMPERATURE_WARNING',
  'SENSOR_DISCONNECTION',
  'COMMUNICATION_FAILURE',
  'VOLTAGE_VARIATION',
  'DATA_QUALITY_WARNING',
];

const WINDOWS: TelemetryTimeWindowSec[] = [30, 60, 300, 900];

export const DemoControlDrawer: React.FC<DemoControlDrawerProps> = ({ open, onClose }) => {
  const {
    dataSourceMode,
    setDataSourceMode,
    demoScenario,
    setDemoScenario,
    isPaused,
    togglePaused,
    startDemoStream,
    resetSimulationSession,
  } = useTelemetry();

  const { prefs, updatePrefs, resetPrefs } = usePreferences();

  if (!open) return null;

  const isDemo = dataSourceMode === 'DEMO';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Demo environment controls and workstation preferences"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(10, 12, 11, 0.72)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        style={{
          width: 'min(420px, 100vw)',
          height: '100vh',
          backgroundColor: '#1B1F1C',
          borderLeft: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '13px 16px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#151916',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={15} style={{ color: 'var(--phosphor-green)' }} />
            <span className="bv-panel-title">DEMO CONTROLS &amp; PREFERENCES</span>
          </div>
          <button
            type="button"
            className="bv-btn"
            onClick={onClose}
            aria-label="Close demo controls drawer"
            style={{ padding: '4px 6px' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Data Source & Stream Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="micro-label">1. DEMO ENVIRONMENT CONTROLS</span>
              <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                {isDemo ? 'DEMO MODE' : 'HARDWARE MODE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                className={`bv-btn ${isDemo ? 'bv-btn--amber' : ''}`}
                onClick={() => setDataSourceMode('DEMO')}
              >
                DEMO MODE
              </button>
              <button
                type="button"
                className={`bv-btn ${!isDemo ? 'bv-btn--active' : ''}`}
                onClick={() => setDataSourceMode('HARDWARE')}
              >
                HARDWARE MODE
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button type="button" className="bv-btn bv-btn--active" onClick={startDemoStream}>
                <Radio size={12} /> Start Demo
              </button>
              <button
                type="button"
                className={`bv-btn ${isPaused ? 'bv-btn--amber' : ''}`}
                onClick={togglePaused}
                disabled={!isDemo}
                style={{ opacity: isDemo ? 1 : 0.45 }}
              >
                {isPaused ? <Play size={12} /> : <Pause size={12} />}
                {isPaused ? 'Resume Visual' : 'Pause Visual'}
              </button>
              <button type="button" className="bv-btn" onClick={resetSimulationSession}>
                <RotateCcw size={12} /> Reset Demo
              </button>
            </div>
          </div>

          {/* 6 Demonstration Scenarios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
              <span className="micro-label">2. DEMONSTRATION SCENARIOS (SHARED BUS)</span>
              {!isDemo && <span className="bv-badge bv-badge--muted">DISABLED IN HW</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SCENARIO_KEYS.map((key) => {
                const sc = DEMO_SCENARIOS[key];
                const active = isDemo && demoScenario === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!isDemo}
                    onClick={() => setDemoScenario(key)}
                    style={{
                      textAlign: 'left',
                      padding: '9px 10px',
                      backgroundColor: active
                        ? sc.severityTag === 'CRITICAL'
                          ? 'var(--warning-red-dim)'
                          : sc.severityTag === 'WARNING'
                          ? 'var(--signal-amber-dim)'
                          : 'var(--phosphor-green-dim)'
                        : 'var(--bg-recessed)',
                      border: `1px solid ${
                        active
                          ? sc.severityTag === 'CRITICAL'
                            ? 'var(--warning-red-border)'
                            : sc.severityTag === 'WARNING'
                            ? 'var(--signal-amber-border)'
                            : 'var(--phosphor-green-border)'
                          : 'var(--border-subtle)'
                      }`,
                      borderRadius: '2px',
                      opacity: isDemo ? 1 : 0.42,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <span className="mono" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                        {sc.label.toUpperCase()}
                      </span>
                      <span
                        className={`bv-badge ${
                          sc.severityTag === 'CRITICAL'
                            ? 'bv-badge--red'
                            : sc.severityTag === 'WARNING'
                            ? 'bv-badge--amber'
                            : 'bv-badge--phosphor'
                        }`}
                        style={{ fontSize: '8px', padding: '1px 5px' }}
                      >
                        {active ? 'ACTIVE' : sc.severityTag}
                      </span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      {sc.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              ILLUSTRATIVE SCENARIOS ONLY · NEVER TRIGGERS HARDWARE CONTROL OR MODIFIES BMS PROTECTION
            </div>
          </div>

          {/* Global User Preferences */}
          <div
            style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="micro-label">3. WORKSTATION PREFERENCES</span>
              <button
                type="button"
                className="bv-btn"
                onClick={resetPrefs}
                style={{ padding: '2px 7px', fontSize: '9px' }}
              >
                Reset
              </button>
            </div>

            {[
              {
                label: 'Startup Boot Animation',
                val: prefs.bootAnimationEnabled,
                toggle: () => updatePrefs({ bootAnimationEnabled: !prefs.bootAnimationEnabled }),
              },
              {
                label: 'Reduced Motion Mode',
                val: prefs.reducedMotion,
                toggle: () => updatePrefs({ reducedMotion: !prefs.reducedMotion }),
              },
              {
                label: 'Start in Presentation Mode',
                val: prefs.startInPresentationMode,
                toggle: () =>
                  updatePrefs({ startInPresentationMode: !prefs.startInPresentationMode }),
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{item.label}</span>
                <button
                  type="button"
                  onClick={item.toggle}
                  className={`bv-btn ${item.val ? 'bv-btn--active' : ''}`}
                  style={{ padding: '3px 9px', fontSize: '9.5px' }}
                  aria-pressed={item.val}
                >
                  {item.val ? 'ENABLED' : 'OFF'}
                </button>
              </div>
            ))}

            {/* Density */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '12px' }}>Interface Density</span>
              <div style={{ display: 'inline-flex', gap: '4px' }}>
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updatePrefs({ density: d })}
                    className={`bv-btn ${prefs.density === d ? 'bv-btn--active' : ''}`}
                    style={{ padding: '3px 8px', fontSize: '9.5px' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Chart Time Window */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '12px' }}>Default Chart Window</span>
              <div style={{ display: 'inline-flex', gap: '3px' }}>
                {WINDOWS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => updatePrefs({ defaultTimeWindowSec: sec })}
                    className={`bv-btn ${prefs.defaultTimeWindowSec === sec ? 'bv-btn--active' : ''}`}
                    style={{ padding: '3px 6px', fontSize: '9px' }}
                  >
                    {sec < 60 ? `${sec}S` : `${sec / 60}M`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
