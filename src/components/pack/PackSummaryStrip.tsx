import React from 'react';
import { BATTERY_PACK_SPECIFICATIONS } from '../../config/systemConfig';
import { BatteryTelemetry, DataSourceMode } from '../../types/telemetry';
import { formatTimeShort } from '../../services/simulationService';

interface PackSummaryStripProps {
  telemetry: BatteryTelemetry;
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
  isPaused: boolean;
}

export const PackSummaryStrip: React.FC<PackSummaryStripProps> = ({
  telemetry,
  dataSourceMode,
  hasLiveData,
  isPaused,
}) => {
  const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';
  const timeStamp = isDemo ? formatTimeShort(telemetry.epochMs) : 'NO FEED';
  const freshness = !isDemo ? 'OFFLINE' : isPaused ? 'PAUSED' : `LIVE · ${timeStamp}`;

  const items = [
    {
      label: 'Pack Voltage',
      value: isDemo ? telemetry.packVoltage.toFixed(2) : '— —',
      unit: 'V',
      source: isDemo ? 'SIMULATED' : 'UNAVAILABLE',
      freshness,
      accent: isDemo ? 'var(--phosphor-green)' : 'var(--text-muted)',
    },
    {
      label: 'Pack Current',
      value: isDemo ? telemetry.packCurrent.toFixed(2) : '— —',
      unit: 'A',
      source: isDemo ? 'SIMULATED' : 'UNAVAILABLE',
      freshness,
      accent: isDemo
        ? telemetry.packCurrent < -0.5 || telemetry.packCurrent > 25
          ? 'var(--signal-amber)'
          : 'var(--phosphor-green)'
        : 'var(--text-muted)',
    },
    {
      label: 'Pack Power',
      value: isDemo ? telemetry.power.toFixed(1) : '— —',
      unit: 'W',
      source: isDemo ? 'SIMULATED' : 'UNAVAILABLE',
      freshness,
      accent: isDemo ? 'var(--warm-neutral)' : 'var(--text-muted)',
    },
    {
      label: 'State of Charge',
      value: isDemo ? telemetry.stateOfCharge.toFixed(1) : '— —',
      unit: '%',
      source: isDemo ? 'DEMO EST' : 'UNAVAILABLE',
      freshness,
      accent: isDemo
        ? telemetry.stateOfCharge <= 20
          ? 'var(--signal-amber)'
          : 'var(--phosphor-green)'
        : 'var(--text-muted)',
    },
    {
      label: 'Pack Temperature',
      value: isDemo ? telemetry.temperature.toFixed(1) : '— —',
      unit: '°C',
      source: isDemo ? 'DS18B20 SIM' : 'UNAVAILABLE',
      freshness,
      accent: isDemo
        ? telemetry.maxTemperature > 36
          ? 'var(--signal-amber)'
          : 'var(--phosphor-green)'
        : 'var(--text-muted)',
    },
    {
      label: 'Nominal Energy',
      value: BATTERY_PACK_SPECIFICATIONS.packEnergyWh.toFixed(1),
      unit: 'Wh',
      source: 'PACK SPEC',
      freshness: '25.6V × 24Ah',
      accent: 'var(--warm-neutral)',
    },
  ];

  return (
    <section
      aria-label="Battery pack summary instruments"
      className="pack-summary-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: '10px',
      }}
    >
      <style>{`
        @media (max-width: 1280px) {
          .pack-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 680px) {
          .pack-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      {items.map((item) => (
        <div
          key={item.label}
          className="bv-panel"
          style={{
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '4px',
              minHeight: '18px',
            }}
          >
            <span
              className="micro-label"
              style={{
                fontSize: '9px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={item.label}
            >
              {item.label}
            </span>
            <span
              className="mono"
              style={{
                fontSize: '8px',
                padding: '1px 4px',
                borderRadius: '2px',
                border:
                  item.source === 'PACK SPEC'
                    ? '1px solid var(--border-color)'
                    : item.source === 'UNAVAILABLE'
                    ? '1px solid var(--border-subtle)'
                    : '1px solid var(--signal-amber-border)',
                color:
                  item.source === 'PACK SPEC'
                    ? 'var(--warm-neutral)'
                    : item.source === 'UNAVAILABLE'
                    ? 'var(--text-muted)'
                    : 'var(--signal-amber)',
                backgroundColor:
                  item.source === 'PACK SPEC' || item.source === 'UNAVAILABLE'
                    ? 'var(--bg-recessed)'
                    : 'var(--signal-amber-dim)',
                whiteSpace: 'nowrap',
              }}
            >
              {item.source}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span
              className="mono"
              style={{
                fontSize: '22px',
                fontWeight: 600,
                lineHeight: 1.05,
                color: item.value === '— —' ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {item.value}
            </span>
            <span className="mono" style={{ fontSize: '11px', color: item.accent, fontWeight: 500 }}>
              {item.unit}
            </span>
          </div>

          <div
            className="mono"
            style={{
              fontSize: '9px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.freshness}
          </div>
        </div>
      ))}
    </section>
  );
};
