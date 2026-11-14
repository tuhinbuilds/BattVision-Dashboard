import React from 'react';
import { BATTERY_PACK_SPEC, DEMO_SCENARIOS } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { NavSectionId } from '../types/telemetry';
import { ActivityTimeline } from './ActivityTimeline';
import { BatteryPackGraphic } from './BatteryPackGraphic';
import { SystemHealthPanel } from './SystemHealthPanel';

interface PresentationOverviewProps {
  onNavigate: (section: NavSectionId) => void;
}

export const PresentationOverview: React.FC<PresentationOverviewProps> = ({ onNavigate }) => {
  const { telemetry, events, isPaused, dataSourceMode, demoScenario } = useTelemetry();
  const isDemo = dataSourceMode === 'DEMO';

  const heroMetrics = [
    {
      label: 'PACK VOLTAGE',
      value: isDemo ? telemetry.packVoltage.toFixed(2) : '— —',
      unit: 'V',
      sub: `NOM ${BATTERY_PACK_SPEC.nominalVoltageV} V · FULL ${BATTERY_PACK_SPEC.fullChargeVoltageV} V`,
      color: 'var(--phosphor-green)',
    },
    {
      label: 'PACK CURRENT',
      value: isDemo ? telemetry.packCurrent.toFixed(2) : '— —',
      unit: 'A',
      sub: isDemo ? (telemetry.packCurrent < 0 ? 'CHARGING / INFLOW' : 'DISCHARGING') : 'OFFLINE',
      color: telemetry.packCurrent < 0 ? 'var(--signal-amber)' : 'var(--phosphor-green)',
    },
    {
      label: 'ELECTRICAL POWER',
      value: isDemo ? telemetry.power.toFixed(1) : '— —',
      unit: 'W',
      sub: 'V × I INSTANTANEOUS',
      color: 'var(--warm-neutral)',
    },
    {
      label: 'STATE OF CHARGE (EST)',
      value: isDemo ? telemetry.stateOfCharge.toFixed(1) : '— —',
      unit: '%',
      sub: isDemo ? `${((telemetry.stateOfCharge / 100) * 24).toFixed(1)} Ah EST · DEMO` : 'UNAVAILABLE',
      color: 'var(--phosphor-green)',
    },
    {
      label: 'PACK TEMPERATURE',
      value: isDemo ? telemetry.temperature.toFixed(1) : '— —',
      unit: '°C',
      sub: isDemo
        ? `RANGE ${telemetry.minTemperature.toFixed(1)}–${telemetry.maxTemperature.toFixed(1)} °C`
        : '4× DS18B20 OFFLINE',
      color: telemetry.maxTemperature > 38 ? 'var(--signal-amber)' : 'var(--phosphor-green)',
    },
  ];

  return (
    <div className="canvas-container page-enter" style={{ maxWidth: '1600px' }}>
      {/* Executive Demonstration Banner */}
      <div
        className="bv-panel"
        style={{
          padding: '14px 18px',
          backgroundColor: '#1B1F1C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="section-kicker">PRESENTATION OVERVIEW // LIVE DEMONSTRATION</span>
            <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
              {isDemo
                ? `SIMULATION MODE · ${DEMO_SCENARIOS[demoScenario].label.toUpperCase()}`
                : 'HARDWARE MODE (OFFLINE)'}
            </span>
          </div>
          <h1
            style={{
              margin: '6px 0 0',
              fontSize: 'clamp(18px, 2.2vw, 24px)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            BATTVISION · {BATTERY_PACK_SPEC.packId} ({BATTERY_PACK_SPEC.configuration}{' '}
            {BATTERY_PACK_SPEC.chemistry})
          </h1>
        </div>

        <div className="mono" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px' }}>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>SoH: </span>
            <strong style={{ color: 'var(--signal-amber)' }}>MODEL NOT DEPLOYED</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>RUL: </span>
            <strong style={{ color: 'var(--signal-amber)' }}>AWAITING AGEING DATA</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>EDGE: </span>
            <strong style={{ color: 'var(--phosphor-green)' }}>OFFLINE LOCAL</strong>
          </span>
        </div>
      </div>

      {/* Oversized High-Legibility Telemetry Strip */}
      <div className="instruments-grid">
        {heroMetrics.map((m) => (
          <div
            key={m.label}
            className="bv-panel"
            style={{
              padding: '16px 16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="micro-label">{m.label}</span>
              <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`} style={{ fontSize: '8.5px' }}>
                {isDemo ? 'DEMO' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                className="mono"
                style={{
                  fontSize: 'clamp(26px, 2.8vw, 38px)',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--text-primary)',
                }}
              >
                {m.value}
              </span>
              <span className="mono" style={{ fontSize: '15px', color: m.color, fontWeight: 600 }}>
                {m.unit}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
              {m.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Pack Graphic */}
      <BatteryPackGraphic
        telemetry={telemetry}
        isPaused={isPaused}
        onInspectPack={() => onNavigate('battery-pack')}
      />

      {/* System Health + Recent Events */}
      <div className="overview-bottom-grid">
        <SystemHealthPanel subsystems={telemetry.systemStatus.subsystems} />
        <ActivityTimeline events={events} maxVisible={6} />
      </div>
    </div>
  );
};
