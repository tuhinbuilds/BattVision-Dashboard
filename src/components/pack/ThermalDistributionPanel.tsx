import React from 'react';
import { THERMAL_DISPLAY_BANDS } from '../../config/systemConfig';
import {
  DataSourceMode,
  TemperatureSensor,
  ThermalZoneStatus,
} from '../../types/telemetry';
import { formatTimeShort } from '../../services/simulationService';

interface ThermalDistributionPanelProps {
  sensors: TemperatureSensor[];
  selectedSensorId: string;
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
  isPaused: boolean;
  onSelectSensor: (sensorId: string) => void;
}

function zoneColors(status: ThermalZoneStatus): {
  stroke: string;
  fill: string;
  text: string;
  badgeClass: string;
} {
  switch (status) {
    case 'COOL':
      return {
        stroke: '#6E9172',
        fill: 'rgba(110, 145, 114, 0.16)',
        text: '#8FB593',
        badgeClass: 'bv-badge--muted',
      };
    case 'NORMAL':
      return {
        stroke: '#B8D65A',
        fill: 'rgba(184, 214, 90, 0.14)',
        text: '#B8D65A',
        badgeClass: 'bv-badge--phosphor',
      };
    case 'WARM':
      return {
        stroke: '#E69A42',
        fill: 'rgba(230, 154, 66, 0.18)',
        text: '#E69A42',
        badgeClass: 'bv-badge--amber',
      };
    case 'CRITICAL':
      return {
        stroke: '#D75C4B',
        fill: 'rgba(215, 92, 75, 0.22)',
        text: '#D75C4B',
        badgeClass: 'bv-badge--red',
      };
    case 'UNAVAILABLE':
    default:
      return {
        stroke: '#4E564C',
        fill: 'rgba(59, 65, 57, 0.16)',
        text: '#92998D',
        badgeClass: 'bv-badge--muted',
      };
  }
}

export const ThermalDistributionPanel: React.FC<ThermalDistributionPanelProps> = ({
  sensors,
  selectedSensorId,
  dataSourceMode,
  hasLiveData,
  isPaused,
  onSelectSensor,
}) => {
  const activeSensor = sensors.find((s) => s.id === selectedSensorId) ?? sensors[0];
  const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';

  return (
    <section className="bv-panel" aria-label="4-zone DS18B20 thermal distribution view">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${isDemo ? 'status-led--amber' : 'status-led--offline'}`}
          />
          <h2 className="bv-panel-title">Temperature Distribution // 4× DS18B20 Probes</h2>
        </div>
        <span className="bv-badge bv-badge--muted">ILLUSTRATIVE ZONES</span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Explicit Honest Placement Notice */}
        <div
          className="mono"
          style={{
            padding: '7px 10px',
            backgroundColor: 'rgba(19, 22, 20, 0.78)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '2px solid var(--signal-amber)',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          ILLUSTRATIVE MONITORING ZONES: Physical placement of TEMP-01 through TEMP-04 on the
          BV-PACK-8S4P enclosure has not yet been finalized.
        </div>

        {/* Conceptual 4-Zone Pack Thermal Map (SVG) */}
        <div
          className="scope-grid-bg"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '2px',
            padding: '10px',
          }}
        >
          <svg
            viewBox="0 0 640 164"
            width="100%"
            style={{ display: 'block', height: 'auto', maxHeight: '175px' }}
            role="img"
            aria-label="Conceptual 4-zone battery pack thermal map for TEMP-01 through TEMP-04"
          >
            {/* Outer Conceptual Pack Silhouette */}
            <rect
              x="16"
              y="14"
              width="608"
              height="136"
              rx="3"
              fill="#171B18"
              stroke="#4E564C"
              strokeWidth="1.2"
            />
            <text
              x="28"
              y="29"
              fill="#92998D"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="8.5"
              letterSpacing="1"
            >
              CONCEPTUAL PACK THERMAL ENVELOPE // 4× DS18B20 (CLICK ZONE TO INSPECT)
            </text>

            {/* 4 Interactive Monitoring Zones */}
            {sensors.map((sensor, idx) => {
              const x = 28 + idx * 148;
              const isSelected = sensor.id === activeSensor.id;
              const palette = zoneColors(sensor.status);
              return (
                <g
                  key={sensor.id}
                  onClick={() => onSelectSensor(sensor.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={x}
                    y="38"
                    width="140"
                    height="98"
                    rx="2"
                    fill={palette.fill}
                    stroke={isSelected ? '#F0F0E8' : palette.stroke}
                    strokeWidth={isSelected ? '1.8' : '1.1'}
                    strokeDasharray={isSelected ? undefined : '4 2'}
                  />
                  {/* Probe Node Reticle */}
                  <circle
                    cx={x + 70}
                    cy="70"
                    r="11"
                    fill="#141815"
                    stroke={palette.stroke}
                    strokeWidth="1.2"
                  />
                  <circle cx={x + 70} cy="70" r="3.5" fill={palette.stroke} />

                  <text
                    x={x + 70}
                    y="51"
                    textAnchor="middle"
                    fill="#D6D2C5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {sensor.id}
                  </text>
                  <text
                    x={x + 70}
                    y="102"
                    textAnchor="middle"
                    fill={palette.text}
                    fontFamily="IBM Plex Mono, monospace"
                    fontSize="14"
                    fontWeight="600"
                  >
                    {sensor.temperatureC !== null ? `${sensor.temperatureC.toFixed(1)} °C` : 'N/A'}
                  </text>
                  <text
                    x={x + 70}
                    y="120"
                    textAnchor="middle"
                    fill="#92998D"
                    fontFamily="IBM Plex Mono, monospace"
                    fontSize="8.5"
                  >
                    {sensor.status} · {sensor.dataSource}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selectable Sensor Cards (TEMP-01 .. TEMP-04) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '8px',
          }}
          className="thermal-cards-grid"
        >
          <style>{`
            @media (max-width: 820px) {
              .thermal-cards-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
          `}</style>
          {sensors.map((sensor) => {
            const isSelected = sensor.id === activeSensor.id;
            const palette = zoneColors(sensor.status);
            const freshness =
              sensor.timestamp === null
                ? 'OFFLINE'
                : isPaused
                ? 'PAUSED'
                : `LIVE · ${formatTimeShort(Date.parse(sensor.timestamp))}`;

            return (
              <button
                key={sensor.id}
                type="button"
                onClick={() => onSelectSensor(sensor.id)}
                style={{
                  textAlign: 'left',
                  padding: '9px 10px',
                  backgroundColor: isSelected ? 'var(--bg-panel-hover)' : 'var(--bg-recessed)',
                  border: `1px solid ${isSelected ? palette.stroke : 'var(--border-subtle)'}`,
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                  <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                    {sensor.id}
                  </span>
                  <span className={`bv-badge ${palette.badgeClass}`} style={{ fontSize: '8.5px', padding: '1px 5px' }}>
                    {sensor.status}
                  </span>
                </div>

                <div className="mono" style={{ fontSize: '18px', fontWeight: 600, color: palette.text }}>
                  {sensor.temperatureC !== null ? `${sensor.temperatureC.toFixed(1)} °C` : 'UNAVAILABLE'}
                </div>

                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {sensor.zoneTitle}
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: '8.5px',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '4px',
                  }}
                >
                  <span>{sensor.dataSource}</span>
                  <span>{freshness}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Thermal Scale Legend with Explicit Config Note */}
        <div
          className="mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '9px',
            color: 'var(--text-muted)',
            paddingTop: '4px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: '#8FB593' }}>■ COOL &lt;{THERMAL_DISPLAY_BANDS.coolMaxC}°C</span>
            <span style={{ color: '#B8D65A' }}>
              ■ NORMAL {THERMAL_DISPLAY_BANDS.coolMaxC}–{THERMAL_DISPLAY_BANDS.normalMaxC}°C
            </span>
            <span style={{ color: '#E69A42' }}>
              ■ WARM {THERMAL_DISPLAY_BANDS.normalMaxC}–{THERMAL_DISPLAY_BANDS.warmMaxC}°C
            </span>
            <span style={{ color: '#D75C4B' }}>■ CRITICAL &gt;{THERMAL_DISPLAY_BANDS.warmMaxC}°C</span>
          </div>
          <span>DISPLAY BANDS ONLY (UNVALIDATED)</span>
        </div>
      </div>
    </section>
  );
};
