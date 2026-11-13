import React from 'react';
import { BatteryTelemetry, DataSourceMode } from '../../types/telemetry';

interface EnergyFlowPanelProps {
  telemetry: BatteryTelemetry;
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
  isPaused: boolean;
}

export const EnergyFlowPanel: React.FC<EnergyFlowPanelProps> = ({
  telemetry,
  dataSourceMode,
  hasLiveData,
  isPaused,
}) => {
  const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';
  const current = isDemo ? telemetry.packCurrent : null;
  const voltage = isDemo ? telemetry.packVoltage : null;
  const power = isDemo ? telemetry.power : null;

  const isInflow = current !== null && current < -0.25;
  const isDischarging = current !== null && current > 0.25;
  const animateFlow = isDemo && !isPaused && (isDischarging || isInflow);

  const directionLabel = !isDemo
    ? 'NO HARDWARE TELEMETRY'
    : isInflow
    ? 'REVERSE INFLOW (CHARGE / REGEN)'
    : isDischarging
    ? 'FORWARD DISCHARGE (PACK → LOAD)'
    : 'QUIESCENT STANDBY';

  const strokeColor = !isDemo
    ? '#4E564C'
    : isInflow
    ? '#E69A42'
    : isDischarging
    ? '#B8D65A'
    : '#92998D';

  return (
    <section className="bv-panel" aria-label="Pack energy flow path">
      <style>{`
        @keyframes bv-energy-fwd {
          from { stroke-dashoffset: 28; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes bv-energy-rev {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 28; }
        }
        .bv-energy-line-fwd {
          animation: bv-energy-fwd 1.6s linear infinite;
        }
        .bv-energy-line-rev {
          animation: bv-energy-rev 1.6s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .bv-energy-line-fwd,
          .bv-energy-line-rev {
            animation: none !important;
          }
        }
      `}</style>

      <div className="bv-panel-header">
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              !isDemo ? 'status-led--offline' : isInflow ? 'status-led--amber' : 'status-led--phosphor'
            }`}
          />
          <h2 className="bv-panel-title">Pack Energy Flow // Monitoring Bus</h2>
          <span className="bv-badge bv-badge--muted">PASSIVE MONITOR</span>
        </div>

        <span
          className="mono"
          style={{
            fontSize: '10px',
            color: !isDemo ? 'var(--text-muted)' : isInflow ? 'var(--signal-amber)' : 'var(--phosphor-green)',
            letterSpacing: '0.07em',
          }}
        >
          {directionLabel}
        </span>
      </div>

      <div className="bv-panel-body">
        <div
          className="scope-grid-bg"
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '2px',
            padding: '12px 10px',
          }}
        >
          <svg
            viewBox="0 0 760 112"
            width="100%"
            style={{ display: 'block', height: 'auto', maxHeight: '120px' }}
            role="img"
            aria-label="Electrical energy flow diagram from Battery Pack through BMS to Load"
          >
            {/* Base DC Bus Conductors */}
            <line x1="212" y1="56" x2="292" y2="56" stroke="#3B4139" strokeWidth="4" />
            <line x1="468" y1="56" x2="548" y2="56" stroke="#3B4139" strokeWidth="4" />

            {/* Animated Electrical Flow Traces */}
            <line
              x1="212"
              y1="56"
              x2="292"
              y2="56"
              stroke={strokeColor}
              strokeWidth="2"
              strokeDasharray="7 7"
              className={
                animateFlow
                  ? isInflow
                    ? 'bv-energy-line-rev'
                    : 'bv-energy-line-fwd'
                  : undefined
              }
            />
            <line
              x1="468"
              y1="56"
              x2="548"
              y2="56"
              stroke={strokeColor}
              strokeWidth="2"
              strokeDasharray="7 7"
              className={
                animateFlow
                  ? isInflow
                    ? 'bv-energy-line-rev'
                    : 'bv-energy-line-fwd'
                  : undefined
              }
            />

            {/* Directional Arrows */}
            {isDemo && (
              <>
                <polygon
                  points={isInflow ? '248,56 258,51 258,61' : '258,56 248,51 248,61'}
                  fill={strokeColor}
                />
                <polygon
                  points={isInflow ? '504,56 514,51 514,61' : '514,56 504,51 504,61'}
                  fill={strokeColor}
                />
              </>
            )}

            {/* Bus Telemetry Callouts above conductors */}
            <text
              x="252"
              y="38"
              textAnchor="middle"
              fill="#D6D2C5"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="9.5"
            >
              {voltage !== null ? `${voltage.toFixed(2)} V` : '— V'}
            </text>
            <text
              x="252"
              y="76"
              textAnchor="middle"
              fill="#92998D"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="8.5"
            >
              DC BUS
            </text>

            <text
              x="508"
              y="38"
              textAnchor="middle"
              fill={strokeColor}
              fontFamily="IBM Plex Mono, monospace"
              fontSize="9.5"
              fontWeight="600"
            >
              {current !== null ? `${current.toFixed(2)} A` : '— A'}
            </text>
            <text
              x="508"
              y="76"
              textAnchor="middle"
              fill="#92998D"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="8.5"
            >
              {power !== null ? `${power.toFixed(1)} W` : '— W'}
            </text>

            {/* Node 1: BATTERY PACK */}
            <g>
              <rect
                x="14"
                y="18"
                width="198"
                height="76"
                rx="2"
                fill="#1E231F"
                stroke="#4E564C"
                strokeWidth="1.2"
              />
              <rect x="14" y="18" width="4" height="76" fill={isDemo ? '#B8D65A' : '#4E564C'} />
              <text
                x="30"
                y="38"
                fill="#92998D"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="8.5"
                letterSpacing="1"
              >
                SOURCE // 8S4P LFP
              </text>
              <text
                x="30"
                y="57"
                fill="#F0F0E8"
                fontFamily="Inter, sans-serif"
                fontSize="13"
                fontWeight="700"
              >
                BATTERY PACK
              </text>
              <text
                x="30"
                y="77"
                fill="#D6D2C5"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="10"
              >
                BV-PACK-8S4P · 25.6V NOM
              </text>
            </g>

            {/* Node 2: BMS */}
            <g>
              <rect
                x="292"
                y="18"
                width="176"
                height="76"
                rx="2"
                fill="#1E231F"
                stroke="#3B4139"
                strokeWidth="1.2"
                strokeDasharray="4 2"
              />
              <text
                x="380"
                y="38"
                textAnchor="middle"
                fill="#92998D"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="8.5"
                letterSpacing="1"
              >
                PROTECTION NODE
              </text>
              <text
                x="380"
                y="57"
                textAnchor="middle"
                fill="#F0F0E8"
                fontFamily="Inter, sans-serif"
                fontSize="13"
                fontWeight="700"
              >
                JK SMART BMS
              </text>
              <text
                x="380"
                y="77"
                textAnchor="middle"
                fill="#E69A42"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="9.5"
              >
                B1A8S10P · NOT CONNECTED
              </text>
            </g>

            {/* Node 3: LOAD */}
            <g>
              <rect
                x="548"
                y="18"
                width="198"
                height="76"
                rx="2"
                fill="#1E231F"
                stroke="#4E564C"
                strokeWidth="1.2"
              />
              <rect x="742" y="18" width="4" height="76" fill={strokeColor} />
              <text
                x="564"
                y="38"
                fill="#92998D"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="8.5"
                letterSpacing="1"
              >
                OUTPUT BUS // MONITOR ONLY
              </text>
              <text
                x="564"
                y="57"
                fill="#F0F0E8"
                fontFamily="Inter, sans-serif"
                fontSize="13"
                fontWeight="700"
              >
                EV LOAD / DC BUS
              </text>
              <text
                x="564"
                y="77"
                fill={strokeColor}
                fontFamily="IBM Plex Mono, monospace"
                fontSize="10"
              >
                {power !== null
                  ? `OUT ${power.toFixed(1)} W · ${isDemo ? 'DEMO' : 'HW'}`
                  : 'OUTPUT UNAVAILABLE'}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
};
