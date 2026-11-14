import React, { useState } from 'react';
import {
  BATTERY_PACK_SPEC,
  DEMO_SCENARIOS,
  HARDWARE_STACK,
  SIMULATION_PROFILES,
  SYSTEM_IDENTITY,
} from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { usePreferences } from '../services/preferencesService';
import { DemoScenarioId, SimulationProfile, TelemetryTimeWindowSec } from '../types/telemetry';

const PROFILES: SimulationProfile[] = [
  'NOMINAL_DRIVE',
  'IDLE_STANDBY',
  'HIGH_LOAD',
  'REGEN_CHARGE',
];

const SCENARIOS: DemoScenarioId[] = [
  'NORMAL_OPERATION',
  'TEMPERATURE_WARNING',
  'SENSOR_DISCONNECTION',
  'COMMUNICATION_FAILURE',
  'VOLTAGE_VARIATION',
  'DATA_QUALITY_WARNING',
];

const SAMPLE_RATES = [
  { label: '500 ms (2.0 Hz)', ms: 500 },
  { label: '1000 ms (1.0 Hz)', ms: 1000 },
  { label: '2000 ms (0.5 Hz)', ms: 2000 },
];

const CHART_WINDOWS: TelemetryTimeWindowSec[] = [30, 60, 300, 900];

export const SystemConfigPage: React.FC = () => {
  const {
    dataSourceMode,
    requestDataSourceMode,
    simulationProfile,
    setSimulationProfile,
    demoScenario,
    setDemoScenario,
    sampleRateMs,
    setSampleRateMs,
    hardwareConnected,
    backendHealth,
    backendPacketSeq,
  } = useTelemetry();

  const { prefs, updatePrefs, resetPrefs } = usePreferences();
  const [modeNotice, setModeNotice] = useState<string | null>(null);
  const isDemo = dataSourceMode === 'DEMO';

  const handleModeClick = (target: 'DEMO' | 'HARDWARE') => {
    const res = requestDataSourceMode(target);
    setModeNotice(res.message);
  };

  return (
    <div className="canvas-container page-enter">
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">MODULE 08 // BENCH CONFIGURATION &amp; HARDWARE SPEC</span>
            <span className="bv-badge bv-badge--amber">{SYSTEM_IDENTITY.revision}</span>
          </div>
          <h1 className="page-header__title">SYSTEM CONFIGURATION</h1>
          <p className="page-header__subtitle">
            Manage telemetry source mode, simulation dynamics, and inspect the target BattVision
            8S4P LiFePO4 hardware stack.
          </p>
        </div>
      </div>

      <div className="two-col-grid">
        {/* Data Source & Simulation Engine Controls */}
        <section className="bv-panel">
          <div className="bv-panel-header">
            <div className="bv-panel-title-group">
              <span className="status-led status-led--amber" />
              <h2 className="bv-panel-title">Telemetry Data Source &amp; Simulation Control</h2>
            </div>
            <span className="bv-badge bv-badge--amber">MODE: {dataSourceMode}</span>
          </div>

          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div className="micro-label" style={{ marginBottom: '8px' }}>
                Data Source Switch (API Readiness)
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`bv-btn ${dataSourceMode === 'DEMO' ? 'bv-btn--active' : ''}`}
                  onClick={() => handleModeClick('DEMO')}
                >
                  DEMO (Simulation Engine)
                </button>
                <button
                  type="button"
                  className={`bv-btn ${dataSourceMode === 'HARDWARE' ? 'bv-btn--amber' : ''}`}
                  onClick={() => handleModeClick('HARDWARE')}
                >
                  HARDWARE (Edge Backend)
                </button>
              </div>
              <div
                className="mono"
                style={{
                  marginTop: '10px',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-recessed)',
                  border: `1px solid ${
                    backendHealth?.reachable ? 'var(--phosphor-green-border)' : 'var(--border-subtle)'
                  }`,
                  borderRadius: '2px',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span>
                    PYTHON EDGE BACKEND:{' '}
                    <strong style={{ color: backendHealth?.reachable ? 'var(--phosphor-green)' : 'var(--text-muted)' }}>
                      {backendHealth?.reachable ? 'REACHABLE (HTTP/WS)' : 'OFFLINE / NOT RUNNING'}
                    </strong>
                  </span>
                  <span>
                    STREAM:{' '}
                    <strong style={{ color: hardwareConnected ? 'var(--phosphor-green)' : 'var(--signal-amber)' }}>
                      {hardwareConnected
                        ? `LIVE SEQ #${backendPacketSeq ?? 0} (${backendHealth?.activeSource ?? 'BACKEND'})`
                        : 'AWAITING PACKETS'}
                    </strong>
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>
                  3 STRICT MODES: DEMO (browser simulation) · LIVE HARDWARE (Python FastAPI + SQLite + WebSocket) · IMPORTED DATA (CSV/JSON in Data Laboratory). Never silently mixed.
                </div>
              </div>
              {modeNotice && (
                <div
                  className="mono"
                  style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: 'var(--signal-amber)',
                    backgroundColor: 'var(--signal-amber-dim)',
                    border: '1px solid var(--signal-amber-border)',
                    borderRadius: '2px',
                  }}
                >
                  {modeNotice}
                </div>
              )}
            </div>

            <div>
              <div className="micro-label" style={{ marginBottom: '8px' }}>
                Simulated Operating Profile
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {PROFILES.map((key) => {
                  const active = simulationProfile === key;
                  const item = SIMULATION_PROFILES[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSimulationProfile(key)}
                      style={{
                        textAlign: 'left',
                        padding: '9px 11px',
                        backgroundColor: active ? 'rgba(184, 214, 90, 0.08)' : 'var(--bg-recessed)',
                        border: `1px solid ${
                          active ? 'var(--phosphor-green-border)' : 'var(--border-subtle)'
                        }`,
                        borderRadius: '2px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div
                          className="mono"
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: active ? 'var(--phosphor-green)' : 'var(--text-primary)',
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {item.description}
                        </div>
                      </div>
                      {active && <span className="bv-badge bv-badge--phosphor">ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="micro-label" style={{ marginBottom: '8px' }}>
                Simulated Sampling Interval
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {SAMPLE_RATES.map((sr) => (
                  <button
                    key={sr.ms}
                    type="button"
                    className={`bv-btn ${sampleRateMs === sr.ms ? 'bv-btn--active' : ''}`}
                    onClick={() => setSampleRateMs(sr.ms)}
                  >
                    {sr.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Target Hardware Stack Reference */}
        <section className="bv-panel">
          <div className="bv-panel-header">
            <div className="bv-panel-title-group">
              <span className="status-led status-led--phosphor" />
              <h2 className="bv-panel-title">Target Hardware Architecture // {BATTERY_PACK_SPEC.packId}</h2>
            </div>
            <span className="bv-badge bv-badge--muted">SPEC LOCKED</span>
          </div>

          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              className="mono"
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>BATTERY PACK</span>
                <span>8S4P LiFePO4 · 32 × 32700 · 25.6 V · 24 Ah · 614.4 Wh</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>MAIN CONTROLLER</span>
                <span>{HARDWARE_STACK.controller}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>BATTERY MGMT</span>
                <span>{HARDWARE_STACK.bms}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>EDGE COMPUTER</span>
                <span>{HARDWARE_STACK.edgeComputer}</span>
              </div>
            </div>

            <div>
              <div className="micro-label" style={{ marginBottom: '6px' }}>
                Instrumentation Sensor Suite
              </div>
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Function</th>
                    <th>Bus</th>
                  </tr>
                </thead>
                <tbody>
                  {HARDWARE_STACK.sensors.map((sensor) => (
                    <tr key={sensor.id}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--warm-neutral)' }}>
                        {sensor.id}
                      </td>
                      <td>{sensor.role}</td>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {sensor.bus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      {/* Global Preferences & Demonstration Scenarios */}
      <div className="two-col-grid">
        <section className="bv-panel">
          <div className="bv-panel-header">
            <div className="bv-panel-title-group">
              <span className="status-led status-led--phosphor" />
              <h2 className="bv-panel-title">Workstation User Preferences</h2>
            </div>
            <button type="button" className="bv-btn" onClick={resetPrefs} style={{ padding: '3px 8px', fontSize: '9.5px' }}>
              Reset Defaults
            </button>
          </div>
          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {
                label: 'Startup Boot Animation',
                val: prefs.bootAnimationEnabled,
                onClick: () => updatePrefs({ bootAnimationEnabled: !prefs.bootAnimationEnabled }),
              },
              {
                label: 'Reduced Motion Mode',
                val: prefs.reducedMotion,
                onClick: () => updatePrefs({ reducedMotion: !prefs.reducedMotion }),
              },
              {
                label: 'Start in Presentation Mode',
                val: prefs.startInPresentationMode,
                onClick: () =>
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
                <span style={{ fontSize: '12px' }}>{item.label}</span>
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`bv-btn ${item.val ? 'bv-btn--active' : ''}`}
                  style={{ padding: '3px 9px', fontSize: '9.5px' }}
                >
                  {item.val ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            ))}

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
              <span style={{ fontSize: '12px' }}>Default Oscilloscope Window</span>
              <div style={{ display: 'inline-flex', gap: '4px' }}>
                {CHART_WINDOWS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => updatePrefs({ defaultTimeWindowSec: sec })}
                    className={`bv-btn ${prefs.defaultTimeWindowSec === sec ? 'bv-btn--active' : ''}`}
                    style={{ padding: '3px 7px', fontSize: '9.5px' }}
                  >
                    {sec < 60 ? `${sec}S` : `${sec / 60}M`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bv-panel">
          <div className="bv-panel-header">
            <div className="bv-panel-title-group">
              <span className="status-led status-led--amber" />
              <h2 className="bv-panel-title">Demonstration Scenarios (Shared Bus)</h2>
            </div>
            <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
              {isDemo ? 'DEMO ACTIVE' : 'DISABLED IN HW'}
            </span>
          </div>
          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SCENARIOS.map((key) => {
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
                    padding: '8px 10px',
                    backgroundColor: active ? 'var(--signal-amber-dim)' : 'var(--bg-recessed)',
                    border: `1px solid ${
                      active ? 'var(--signal-amber-border)' : 'var(--border-subtle)'
                    }`,
                    opacity: isDemo ? 1 : 0.45,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                      {sc.label}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      {sc.description}
                    </div>
                  </div>
                  {active && <span className="bv-badge bv-badge--amber">ACTIVE</span>}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
