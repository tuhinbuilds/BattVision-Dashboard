import React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { BatteryPackGraphic } from '../components/BatteryPackGraphic';
import { InstrumentGauge, InstrumentTone } from '../components/InstrumentGauge';
import { IntelligencePanel } from '../components/IntelligencePanel';
import { SystemHealthPanel } from '../components/SystemHealthPanel';
import { SIMULATION_PROFILES, TELEMETRY_LIMITS } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { NavSectionId, SimulationProfile } from '../types/telemetry';

interface OverviewPageProps {
  onNavigate: (section: NavSectionId) => void;
}

const PROFILE_KEYS: SimulationProfile[] = [
  'NOMINAL_DRIVE',
  'IDLE_STANDBY',
  'HIGH_LOAD',
  'REGEN_CHARGE',
];

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const {
    telemetry,
    history,
    events,
    simulationProfile,
    setSimulationProfile,
    isPaused,
    togglePaused,
    resetSimulationSession,
    dataSourceMode,
    hardwareConnected,
    backendHealth,
    backendPacketSeq,
  } = useTelemetry();

  const isDemo = dataSourceMode === 'DEMO';

  const voltageSeries = history.slice(-32).map((p) => p.packVoltage);
  const currentSeries = history.slice(-32).map((p) => p.packCurrent);
  const powerSeries = history.slice(-32).map((p) => p.power);
  const tempSeries = history.slice(-32).map((p) => p.temperature);
  const socSeries = history.slice(-32).map((p) => p.stateOfCharge);

  const voltageTone: InstrumentTone =
    telemetry.packVoltage < TELEMETRY_LIMITS.voltage.min ||
    telemetry.packVoltage > TELEMETRY_LIMITS.voltage.max
      ? 'red'
      : telemetry.packVoltage < TELEMETRY_LIMITS.voltage.warnLow
      ? 'amber'
      : 'nominal';

  const currentTone: InstrumentTone =
    telemetry.packCurrent > TELEMETRY_LIMITS.current.max
      ? 'red'
      : telemetry.packCurrent > TELEMETRY_LIMITS.current.warnHigh || telemetry.packCurrent < -0.5
      ? 'amber'
      : 'nominal';

  const powerTone: InstrumentTone =
    Math.abs(telemetry.power) > TELEMETRY_LIMITS.power.warnHigh ? 'amber' : 'nominal';

  const tempTone: InstrumentTone =
    telemetry.maxTemperature >= TELEMETRY_LIMITS.temperature.faultHigh
      ? 'red'
      : telemetry.maxTemperature >= TELEMETRY_LIMITS.temperature.warnHigh
      ? 'amber'
      : 'nominal';

  const socTone: InstrumentTone =
    telemetry.stateOfCharge <= 15
      ? 'red'
      : telemetry.stateOfCharge <= TELEMETRY_LIMITS.soc.warnLow
      ? 'amber'
      : 'nominal';

  return (
    <div className="canvas-container page-enter">
      {/* SECTION A: HEADER */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">
              {isDemo
                ? 'MONITORING SESSION / DEMO ENVIRONMENT'
                : 'MONITORING SESSION / EDGE BACKEND INTERFACE'}
            </span>
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
                ? `EDGE BACKEND LIVE (#${backendPacketSeq ?? 0} · ${backendHealth?.activeSource ?? 'WS'})`
                : backendHealth?.reachable
                ? 'EDGE API READY (NO PACKETS)'
                : 'HARDWARE MODE (OFFLINE)'}
            </span>
          </div>
          <h1 className="page-header__title">BATTERY SYSTEM OVERVIEW</h1>
          <p className="page-header__subtitle">
            Real-time monitoring and diagnostic intelligence for the BattVision EV battery platform.
          </p>
        </div>

        {/* Interactive Bench Load Profile Controls */}
        <div className="page-header__controls">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '2px',
              gap: '2px',
            }}
            role="group"
            aria-label="Simulated load profile selector"
          >
            {PROFILE_KEYS.map((key) => {
              const active = simulationProfile === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSimulationProfile(key)}
                  className={`bv-btn ${active ? 'bv-btn--active' : ''}`}
                  style={{
                    border: 'none',
                    padding: '5px 8px',
                    fontSize: '10px',
                    backgroundColor: active ? 'var(--phosphor-green-dim)' : 'transparent',
                  }}
                  title={SIMULATION_PROFILES[key].description}
                >
                  {SIMULATION_PROFILES[key].shortLabel}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`bv-btn ${isPaused ? 'bv-btn--amber' : ''}`}
            onClick={togglePaused}
            title={isPaused ? 'Resume simulation stream' : 'Pause simulation stream'}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          <button
            type="button"
            className="bv-btn"
            onClick={resetSimulationSession}
            title="Reset simulated telemetry buffer and session events"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* SECTION B: MAIN BATTERY STATUS PANEL */}
      <BatteryPackGraphic
        telemetry={telemetry}
        isPaused={isPaused}
        onInspectPack={() => onNavigate('battery-pack')}
      />

      {/* SECTION C: KEY MEASUREMENT INSTRUMENTS */}
      <section aria-label="Primary laboratory measurement instruments">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span className="micro-label">
            PRIMARY MEASUREMENT INSTRUMENTS · CENTRAL SIMULATED TELEMETRY BUS
          </span>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            PROFILE: {SIMULATION_PROFILES[simulationProfile].label.toUpperCase()}
          </span>
        </div>

        <div className="instruments-grid">
          <InstrumentGauge
            channelCode="CH-01"
            label="Pack Voltage"
            sensorLabel="INA226"
            value={telemetry.packVoltage}
            decimals={2}
            unit="V"
            min={TELEMETRY_LIMITS.voltage.min}
            nominal={TELEMETRY_LIMITS.voltage.nominal}
            max={TELEMETRY_LIMITS.voltage.max}
            historyValues={voltageSeries}
            tone={voltageTone}
            paused={isPaused}
            onInspect={() => onNavigate('live-telemetry')}
          />

          <InstrumentGauge
            channelCode="CH-02"
            label="Pack Current"
            sensorLabel="ACS758-50B"
            value={telemetry.packCurrent}
            decimals={2}
            unit="A"
            min={TELEMETRY_LIMITS.current.min}
            nominal={0}
            max={TELEMETRY_LIMITS.current.max}
            historyValues={currentSeries}
            tone={currentTone}
            subStatLeft={telemetry.packCurrent < 0 ? 'MODE CHG' : 'MODE DSG'}
            subStatRight={`PEAK ${Math.max(...currentSeries.map(Math.abs)).toFixed(1)}A`}
            paused={isPaused}
            onInspect={() => onNavigate('live-telemetry')}
          />

          <InstrumentGauge
            channelCode="CH-03"
            label="Power"
            sensorLabel="V × I CALC"
            value={telemetry.power}
            decimals={1}
            unit="W"
            min={TELEMETRY_LIMITS.power.min}
            nominal={TELEMETRY_LIMITS.power.nominal}
            max={TELEMETRY_LIMITS.power.max}
            historyValues={powerSeries}
            tone={powerTone}
            subStatLeft={`NOM 614.4Wh`}
            subStatRight={`MAX ${Math.max(...powerSeries).toFixed(0)}W`}
            paused={isPaused}
            onInspect={() => onNavigate('live-telemetry')}
          />

          <InstrumentGauge
            channelCode="CH-04"
            label="Temperature"
            sensorLabel="4× DS18B20"
            value={telemetry.temperature}
            decimals={1}
            unit="°C"
            min={TELEMETRY_LIMITS.temperature.min}
            nominal={TELEMETRY_LIMITS.temperature.nominal}
            max={TELEMETRY_LIMITS.temperature.max}
            historyValues={tempSeries}
            tone={tempTone}
            subStatLeft={`MIN ${telemetry.minTemperature.toFixed(1)}°C`}
            subStatRight={`MAX ${telemetry.maxTemperature.toFixed(1)}°C`}
            paused={isPaused}
            onInspect={() => onNavigate('battery-pack')}
          />

          <InstrumentGauge
            channelCode="CH-05"
            label="State of Charge"
            sensorLabel="COULOMB"
            value={telemetry.stateOfCharge}
            decimals={1}
            unit="%"
            min={0}
            nominal={80}
            max={100}
            historyValues={socSeries}
            tone={socTone}
            subStatLeft={`EST ${((telemetry.stateOfCharge / 100) * 24).toFixed(1)} Ah`}
            subStatRight={`EST ${((telemetry.stateOfCharge / 100) * 614.4).toFixed(0)} Wh`}
            paused={isPaused}
            onInspect={() => onNavigate('intelligence')}
          />
        </div>
      </section>

      {/* SECTION D: BATTERY INTELLIGENCE PANEL */}
      <IntelligencePanel
        telemetry={telemetry}
        onOpenIntelligence={() => onNavigate('intelligence')}
      />

      {/* SECTIONS E & F: SYSTEM HEALTH + RECENT ACTIVITY */}
      <div className="overview-bottom-grid">
        <SystemHealthPanel
          subsystems={telemetry.systemStatus.subsystems}
          onOpenConfig={() => onNavigate('system-config')}
        />
        <ActivityTimeline events={events} maxVisible={8} />
      </div>
    </div>
  );
};
