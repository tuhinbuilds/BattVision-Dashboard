import React, { useMemo, useState } from 'react';
import { LiveOscilloscopeSection } from '../components/telemetry/LiveOscilloscopeSection';
import { MeasurementSourcesAndStatus } from '../components/telemetry/MeasurementSourcesAndStatus';
import { MotionVibrationSection } from '../components/telemetry/MotionVibrationSection';
import { PrimaryElectricalInstruments } from '../components/telemetry/PrimaryElectricalInstruments';
import { StreamControlStrip } from '../components/telemetry/StreamControlStrip';
import { ThermalMonitoringSection } from '../components/telemetry/ThermalMonitoringSection';
import { BATTERY_PACK_SPEC, SIMULATION_PROFILES } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { usePreferences } from '../services/preferencesService';
import {
  BatteryTelemetry,
  SimulationProfile,
  TelemetryHistoryPoint,
  TelemetryTimeWindowSec,
} from '../types/telemetry';

interface FrozenDisplayState {
  telemetry: BatteryTelemetry;
  history: TelemetryHistoryPoint[];
  sampleCountAtFreeze: number;
}

const PROFILES: SimulationProfile[] = [
  'NOMINAL_DRIVE',
  'IDLE_STANDBY',
  'HIGH_LOAD',
  'REGEN_CHARGE',
];

export const LiveTelemetryPage: React.FC = () => {
  const {
    telemetry,
    history,
    dataSourceMode,
    setDataSourceMode,
    simulationProfile,
    setSimulationProfile,
    sampleRateMs,
    sessionStartMs,
    sampleCount,
    sessionStats,
    activeTemperatureSensors,
    activeSensorStatuses,
    hardwareConnected,
    backendHealth,
    backendPacketSeq,
    startDemoStream,
    resetSimulationSession,
    logEvent,
  } = useTelemetry();

  const { prefs } = usePreferences();
  const [timeWindowSec, setTimeWindowSec] = useState<TelemetryTimeWindowSec>(
    prefs.defaultTimeWindowSec
  );
  const [frozenDisplay, setFrozenDisplay] = useState<FrozenDisplayState | null>(null);

  const isDemo = dataSourceMode === 'DEMO';
  const hasLiveData = isDemo || hardwareConnected;
  const displayPaused = frozenDisplay !== null;

  // Use frozen display snapshot when paused; underlying stream continues running in dataService
  const shownTelemetry = frozenDisplay ? frozenDisplay.telemetry : telemetry;
  const shownHistory = frozenDisplay ? frozenDisplay.history : history;
  const bufferedWhilePaused = frozenDisplay
    ? Math.max(0, sampleCount - frozenDisplay.sampleCountAtFreeze)
    : 0;

  // Slice history to selected time window (30s, 1m, 5m, 15m)
  const visibleHistory = useMemo(() => {
    if (!shownHistory.length) return [];
    const latestTs = shownHistory[shownHistory.length - 1].epochMs;
    const cutoff = latestTs - timeWindowSec * 1000;
    const sliced = shownHistory.filter((pt) => pt.epochMs >= cutoff);
    return sliced.length ? sliced : shownHistory.slice(-2);
  }, [shownHistory, timeWindowSec]);

  const displayedSensors = useMemo(() => {
    if (!hasLiveData) return activeTemperatureSensors;
    return shownTelemetry.temperatureSensors;
  }, [hasLiveData, activeTemperatureSensors, shownTelemetry.temperatureSensors]);

  const handleStartDemo = () => {
    setFrozenDisplay(null);
    startDemoStream();
  };

  const handlePauseDisplay = () => {
    if (!hasLiveData) return;
    setFrozenDisplay({
      telemetry,
      history,
      sampleCountAtFreeze: sampleCount,
    });
    logEvent(
      'DISP-001',
      'TELEMETRY',
      'Live telemetry display frozen for inspection (underlying demo stream remains active).',
      'INFO'
    );
  };

  const handleResumeDisplay = () => {
    setFrozenDisplay(null);
    logEvent(
      'DISP-002',
      'TELEMETRY',
      'Live telemetry display resumed and synchronized with stream.',
      'INFO'
    );
  };

  const handleResetSession = () => {
    setFrozenDisplay(null);
    resetSimulationSession();
  };

  const handleExportVisibleCsv = () => {
    if (!hasLiveData || visibleHistory.length === 0) return;
    const header =
      'epoch_ms,time,pack_voltage_v,pack_current_a,power_w,soc_est_pct,temp1_c,temp2_c,temp3_c,temp4_c,acc_x_g,acc_y_g,acc_z_g,gyro_x_dps,gyro_y_dps,gyro_z_dps,source\n';
    const rows = visibleHistory
      .map(
        (pt) =>
          `${pt.epochMs},${pt.timeLabel},${pt.packVoltage.toFixed(2)},${pt.packCurrent.toFixed(
            2
          )},${pt.power.toFixed(1)},${pt.stateOfCharge.toFixed(1)},${pt.temp1.toFixed(
            1
          )},${pt.temp2.toFixed(1)},${pt.temp3.toFixed(1)},${pt.temp4.toFixed(
            1
          )},${pt.accXG.toFixed(3)},${pt.accYG.toFixed(3)},${pt.accZG.toFixed(
            3
          )},${pt.gyroXDps.toFixed(2)},${pt.gyroYDps.toFixed(2)},${pt.gyroZDps.toFixed(
            2
          )},DEMO_SIMULATED`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battvision_live_telemetry_${timeWindowSec}s_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logEvent(
      'TEL-EXP',
      'TELEMETRY',
      `Exported ${visibleHistory.length} visible telemetry frames (${timeWindowSec}s window) as CSV.`,
      'INFO'
    );
  };

  return (
    <div className="canvas-container page-enter">
      {/* SECTION 3: PAGE HEADER */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">LIVE TELEMETRY / ELECTRICAL MONITORING</span>
            <span
              className={`bv-badge ${
                isDemo
                  ? 'bv-badge--amber'
                  : hardwareConnected
                  ? 'bv-badge--phosphor'
                  : backendHealth?.reachable
                  ? 'bv-badge--amber'
                  : 'bv-badge--muted'
              }`}
            >
              <span
                className={`status-led ${
                  isDemo
                    ? 'status-led--amber status-led--pulse'
                    : hardwareConnected
                    ? 'status-led--phosphor status-led--pulse'
                    : backendHealth?.reachable
                    ? 'status-led--amber'
                    : 'status-led--offline'
                }`}
              />
              {isDemo
                ? 'SIMULATION MODE'
                : hardwareConnected
                ? `EDGE BACKEND LIVE (#${backendPacketSeq ?? 0} · ${backendHealth?.activeSource ?? 'BACKEND'})`
                : backendHealth?.reachable
                ? 'EDGE API READY (NO PACKETS)'
                : 'HARDWARE MODE (OFFLINE)'}
            </span>
            <span className={`bv-badge ${hasLiveData && !displayPaused ? 'bv-badge--phosphor' : 'bv-badge--muted'}`}>
              <span
                className={`status-led ${
                  hasLiveData && !displayPaused
                    ? 'status-led--phosphor status-led--pulse'
                    : hasLiveData
                    ? 'status-led--amber'
                    : 'status-led--offline'
                }`}
              />
              {!hasLiveData
                ? 'STREAM: OFFLINE'
                : displayPaused
                ? 'DISPLAY FROZEN'
                : isDemo
                ? 'DATA STREAM ACTIVE'
                : 'WEBSOCKET STREAM LIVE'}
            </span>
          </div>

          <h1 className="page-header__title">LIVE TELEMETRY</h1>
          <p className="page-header__subtitle">
            Real-time electrical, thermal and motion monitoring of the BattVision battery system.
          </p>
        </div>

        {/* Mode & Load Profile Switchers */}
        <div className="page-header__controls">
          <div
            role="group"
            aria-label="Data source mode"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFrozenDisplay(null);
                setDataSourceMode('DEMO');
              }}
              className={`bv-btn ${isDemo ? 'bv-btn--amber' : ''}`}
              style={{
                border: 'none',
                padding: '5px 8px',
                fontSize: '10px',
                backgroundColor: isDemo ? 'var(--signal-amber-dim)' : 'transparent',
              }}
            >
              DEMO MODE
            </button>
            <button
              type="button"
              onClick={() => {
                setFrozenDisplay(null);
                setDataSourceMode('HARDWARE');
              }}
              className={`bv-btn ${!isDemo ? 'bv-btn--active' : ''}`}
              style={{
                border: 'none',
                padding: '5px 8px',
                fontSize: '10px',
                backgroundColor: !isDemo ? 'var(--phosphor-green-dim)' : 'transparent',
              }}
            >
              HARDWARE MODE
            </button>
          </div>

          {isDemo && (
            <div
              role="group"
              aria-label="Demo load profile"
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                padding: '2px',
                gap: '2px',
              }}
            >
              {PROFILES.map((key) => {
                const active = simulationProfile === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSimulationProfile(key)}
                    className={`bv-btn ${active ? 'bv-btn--active' : ''}`}
                    style={{
                      border: 'none',
                      padding: '5px 7px',
                      fontSize: '9.5px',
                      backgroundColor: active ? 'var(--phosphor-green-dim)' : 'transparent',
                    }}
                    title={SIMULATION_PROFILES[key].description}
                  >
                    {SIMULATION_PROFILES[key].shortLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* HEADER TECHNICAL METADATA STRIP */}
      <div
        className="bv-panel mono"
        style={{
          padding: '8px 14px',
          backgroundColor: '#1B1F1C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '18px' }}>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>PACK ID: </span>
            <strong style={{ color: 'var(--phosphor-green)' }}>{BATTERY_PACK_SPEC.packId}</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>MONITORING NODE: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>ESP32-S3</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>DATA SOURCE: </span>
            <strong
              style={{
                color: isDemo
                  ? 'var(--signal-amber)'
                  : hardwareConnected
                  ? 'var(--phosphor-green)'
                  : 'var(--text-secondary)',
              }}
            >
              {isDemo
                ? 'SIMULATION'
                : hardwareConnected
                ? `EDGE BACKEND (${backendHealth?.activeSource ?? 'WS'})`
                : backendHealth?.reachable
                ? 'EDGE API READY (AWAITING ESP32)'
                : 'HARDWARE (NOT CONNECTED)'}
            </strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>UPDATE RATE: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>
              {isDemo
                ? `DEMO (${(1000 / sampleRateMs).toFixed(1)} Hz)`
                : hardwareConnected
                ? `WS LIVE (SEQ #${backendPacketSeq ?? 0})`
                : 'OFFLINE'}
            </strong>
          </span>
        </div>

        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          8S4P LiFePO4 · 25.6 V NOM · 24 Ah · 614.4 Wh
        </span>
      </div>

      {/* SECTIONS 10 & 11: DATA STREAM CONTROLS & SESSION METRICS */}
      <StreamControlStrip
        dataSourceMode={dataSourceMode}
        hasLiveData={hasLiveData}
        displayPaused={displayPaused}
        bufferedWhilePaused={bufferedWhilePaused}
        timeWindowSec={timeWindowSec}
        sessionStartMs={sessionStartMs}
        sampleCount={isDemo ? sampleCount : shownHistory.length}
        sampleRateMs={sampleRateMs}
        latestEpochMs={shownTelemetry.epochMs}
        visibleFrameCount={visibleHistory.length}
        onStartDemo={handleStartDemo}
        onPauseDisplay={handlePauseDisplay}
        onResumeDisplay={handleResumeDisplay}
        onResetSession={handleResetSession}
        onSelectTimeWindow={setTimeWindowSec}
        onExportCsv={handleExportVisibleCsv}
      />

      {/* SECTION 4: FOUR PRIMARY ELECTRICAL INSTRUMENTS */}
      <PrimaryElectricalInstruments
        telemetry={shownTelemetry}
        history={shownHistory}
        sessionStats={sessionStats}
        dataSourceMode={dataSourceMode}
        hasLiveData={hasLiveData}
        displayPaused={displayPaused}
      />

      {/* SECTION 5: LIVE OSCILLOSCOPE WAVEFORMS (VOLTAGE / CURRENT / POWER) */}
      <LiveOscilloscopeSection
        visibleHistory={visibleHistory}
        dataSourceMode={dataSourceMode}
        hasLiveData={hasLiveData}
        displayPaused={displayPaused}
        bufferedWhilePaused={bufferedWhilePaused}
        timeWindowSec={timeWindowSec}
      />

      {/* SECTION 6: THERMAL MONITORING (4x DS18B20 CHANNELS) */}
      <ThermalMonitoringSection
        sensors={displayedSensors}
        history={shownHistory}
        dataSourceMode={dataSourceMode}
        hasLiveData={hasLiveData}
        displayPaused={displayPaused}
      />

      {/* SECTION 7: MOTION & VIBRATION MONITORING (MPU6050 ACCEL + GYRO) */}
      <MotionVibrationSection
        telemetry={shownTelemetry}
        history={shownHistory}
        dataSourceMode={dataSourceMode}
        hasLiveData={hasLiveData}
      />

      {/* SECTIONS 8 & 9: MEASUREMENT SOURCES & SENSOR CHANNEL STATUS TABLE */}
      <MeasurementSourcesAndStatus
        sensorStatuses={activeSensorStatuses}
        dataSourceMode={dataSourceMode}
      />
    </div>
  );
};
