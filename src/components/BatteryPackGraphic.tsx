import React, { useState } from 'react';
import { BATTERY_PACK_SPEC } from '../config/systemConfig';
import { BatteryTelemetry } from '../types/telemetry';

interface BatteryPackGraphicProps {
  telemetry: BatteryTelemetry;
  isPaused: boolean;
  onInspectPack?: () => void;
}

export const BatteryPackGraphic: React.FC<BatteryPackGraphicProps> = ({
  telemetry,
  isPaused,
  onInspectPack,
}) => {
  const [hoveredBank, setHoveredBank] = useState<number | null>(null);
  const isCharging = telemetry.packCurrent < -0.25;
  const activeBank =
    hoveredBank !== null
      ? telemetry.cellVoltages[hoveredBank]
      : telemetry.cellVoltages[0];

  const specItems = [
    { label: 'Pack Identity', value: BATTERY_PACK_SPEC.packId, highlight: true },
    { label: 'Chemistry', value: BATTERY_PACK_SPEC.chemistry },
    { label: 'Configuration', value: BATTERY_PACK_SPEC.configuration },
    { label: 'Cell Count', value: `${BATTERY_PACK_SPEC.cellCount} × 32700` },
    { label: 'Nominal Voltage', value: `${BATTERY_PACK_SPEC.nominalVoltageV.toFixed(1)} V` },
    { label: 'Nominal Capacity', value: `${BATTERY_PACK_SPEC.nominalCapacityAh.toFixed(0)} Ah` },
    { label: 'Nominal Energy', value: `${BATTERY_PACK_SPEC.nominalEnergyWh.toFixed(1)} Wh` },
    { label: 'Full-Charge Voltage', value: `${BATTERY_PACK_SPEC.fullChargeVoltageV.toFixed(1)} V` },
  ];

  const flowLabel = isPaused
    ? 'STREAM PAUSED'
    : isCharging
    ? `CHARGE INFLOW · ${Math.abs(telemetry.packCurrent).toFixed(1)} A`
    : telemetry.packCurrent > 1.2
    ? `DISCHARGE BUS · ${telemetry.packCurrent.toFixed(1)} A`
    : `QUIESCENT STANDBY · ${telemetry.packCurrent.toFixed(2)} A`;

  return (
    <section className="bv-panel" aria-label="Main battery pack architecture and status">
      <style>{`
        @keyframes bv-bus-flow-forward {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes bv-bus-flow-reverse {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 24; }
        }
        .bv-trace-discharge {
          animation: bv-bus-flow-forward 1.8s linear infinite;
        }
        .bv-trace-charge {
          animation: bv-bus-flow-reverse 1.8s linear infinite;
        }
        .bv-trace-paused {
          animation: none;
        }
      `}</style>

      {/* Panel Header */}
      <div className="bv-panel-header">
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor status-led--pulse" />
          <h2 className="bv-panel-title">
            Primary Battery Architecture // {BATTERY_PACK_SPEC.packId}
          </h2>
          <span className="bv-badge bv-badge--amber">SIMULATED TELEMETRY</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            className="mono"
            style={{
              fontSize: '10.5px',
              color: isCharging ? 'var(--signal-amber)' : 'var(--phosphor-green)',
              letterSpacing: '0.06em',
            }}
          >
            {flowLabel}
          </span>
          {onInspectPack && (
            <button type="button" className="bv-btn" onClick={onInspectPack}>
              Inspect 8S4P Array →
            </button>
          )}
        </div>
      </div>

      {/* Main Content Split: Technical Pack Illustration + Specification Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(270px, 1fr)',
          gap: '0',
        }}
        className="pack-panel-grid"
      >
        <style>{`
          @media (max-width: 1020px) {
            .pack-panel-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
            .pack-spec-col {
              border-left: none !important;
              border-top: 1px solid var(--border-color);
            }
          }
        `}</style>

        {/* Left: Detailed Engineering Battery Cutaway Graphic */}
        <div
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#191D1A',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span className="micro-label">
              8S4P MODULE SCHEMATIC · 32 × 32700 CYLINDRICAL CELLS · HOVER BANK TO INSPECT
            </span>
            <span className="mono" style={{ fontSize: '10.5px', color: 'var(--warm-neutral)' }}>
              {activeBank.label}:{' '}
              <strong style={{ color: 'var(--phosphor-green)' }}>
                {activeBank.voltage.toFixed(3)} V
              </strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                ({activeBank.deltaFromMeanMv >= 0 ? '+' : ''}
                {activeBank.deltaFromMeanMv} mV)
              </span>
            </span>
          </div>

          <div
            className="scope-grid-bg"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '12px 10px 8px',
            }}
          >
            <svg
              viewBox="0 0 760 232"
              width="100%"
              style={{ display: 'block', height: 'auto', maxHeight: '238px' }}
              role="img"
              aria-label="BV-PACK-8S4P LiFePO4 battery pack technical cutaway showing 8 series banks of 4 parallel 32700 cells"
            >
              {/* External Power Bus Rails (Animated current trace) */}
              {/* Negative B- trace */}
              <path
                d="M 16 66 L 54 66"
                stroke="#4E564C"
                strokeWidth="3"
              />
              <path
                d="M 16 66 L 54 66"
                stroke={isCharging ? '#E69A42' : '#B8D65A'}
                strokeWidth="1.5"
                strokeDasharray="6 6"
                className={
                  isPaused
                    ? 'bv-trace-paused'
                    : isCharging
                    ? 'bv-trace-charge'
                    : 'bv-trace-discharge'
                }
              />

              {/* Positive B+ trace */}
              <path
                d="M 706 166 L 744 166"
                stroke="#4E564C"
                strokeWidth="3"
              />
              <path
                d="M 706 166 L 744 166"
                stroke={isCharging ? '#E69A42' : '#B8D65A'}
                strokeWidth="1.5"
                strokeDasharray="6 6"
                className={
                  isPaused
                    ? 'bv-trace-paused'
                    : isCharging
                    ? 'bv-trace-charge'
                    : 'bv-trace-discharge'
                }
              />

              {/* Left B- Terminal Block */}
              <rect
                x="4"
                y="51"
                width="18"
                height="30"
                rx="1.5"
                fill="#202420"
                stroke="#92998D"
                strokeWidth="1.2"
              />
              <text
                x="13"
                y="70"
                textAnchor="middle"
                fill="#D6D2C5"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="10"
                fontWeight="600"
              >
                B−
              </text>

              {/* Right B+ Terminal Block */}
              <rect
                x="738"
                y="151"
                width="18"
                height="30"
                rx="1.5"
                fill="#202420"
                stroke="#B8D65A"
                strokeWidth="1.2"
              />
              <text
                x="747"
                y="170"
                textAnchor="middle"
                fill="#B8D65A"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="10"
                fontWeight="600"
              >
                B+
              </text>

              {/* Main Pack Chassis Enclosure */}
              <rect
                x="52"
                y="14"
                width="656"
                height="198"
                rx="3"
                fill="#1D221E"
                stroke="#4E564C"
                strokeWidth="1.5"
              />
              {/* Inner machined lip */}
              <rect
                x="58"
                y="20"
                width="644"
                height="186"
                rx="2"
                fill="none"
                stroke="#2E342D"
                strokeWidth="1"
              />

              {/* Corner M4 Hex Bolts */}
              {[
                [64, 26],
                [696, 26],
                [64, 200],
                [696, 200],
              ].map(([cx, cy], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="3.2" fill="#131614" stroke="#4E564C" strokeWidth="1" />
                  <circle cx={cx} cy={cy} r="1" fill="#92998D" />
                </g>
              ))}

              {/* Top Chassis Stamp */}
              <text
                x="78"
                y="34"
                fill="#92998D"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="8.5"
                letterSpacing="1.2"
              >
                ENC-32700 // 8S4P LiFePO4 MODULE · NOM 25.6V · 614.4Wh
              </text>
              <text
                x="682"
                y="34"
                textAnchor="end"
                fill="#B8D65A"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="8.5"
                letterSpacing="1"
              >
                SoC {telemetry.stateOfCharge.toFixed(1)}% · {telemetry.packVoltage.toFixed(2)}V
              </text>

              {/* Serpentine Series Interconnect Busbars between S1..S8 */}
              {Array.from({ length: 7 }).map((_, idx) => {
                const x1 = 109 + idx * 77;
                const x2 = 109 + (idx + 1) * 77;
                const y = idx % 2 === 0 ? 186 : 48;
                return (
                  <g key={`bus-${idx}`}>
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke="#535D51"
                      strokeWidth="4.5"
                      strokeLinecap="square"
                    />
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke={isCharging ? '#E69A42' : '#B8D65A'}
                      strokeWidth="1.2"
                      strokeDasharray="4 8"
                      opacity="0.72"
                      className={
                        isPaused
                          ? 'bv-trace-paused'
                          : isCharging
                          ? 'bv-trace-charge'
                          : 'bv-trace-discharge'
                      }
                    />
                  </g>
                );
              })}

              {/* 8 Series Banks (S1..S8), each with 4 Parallel 32700 Cylindrical Cells */}
              {telemetry.cellVoltages.map((cell, bankIdx) => {
                const bankX = 76 + bankIdx * 77;
                const isSelected = hoveredBank === bankIdx;
                // Normalize cell voltage 2.80V..3.55V for subtle fill indicator
                const vFill = Math.max(
                  0.08,
                  Math.min(1, (cell.voltage - 2.6) / (3.65 - 2.6))
                );
                const cellAccent =
                  cell.voltage < 2.85
                    ? '#D75C4B'
                    : cell.voltage > 3.55
                    ? '#E69A42'
                    : '#B8D65A';

                return (
                  <g
                    key={cell.label}
                    onMouseEnter={() => setHoveredBank(bankIdx)}
                    onMouseLeave={() => setHoveredBank(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Series Bank Housing */}
                    <rect
                      x={bankX}
                      y="46"
                      width="66"
                      height="142"
                      rx="2"
                      fill={isSelected ? '#272E27' : '#161A17'}
                      stroke={isSelected ? '#B8D65A' : '#3B4139'}
                      strokeWidth={isSelected ? '1.4' : '1'}
                    />

                    {/* Vertical Nickel Parallel Collector Strip */}
                    <rect
                      x={bankX + 30}
                      y="54"
                      width="6"
                      height="112"
                      fill="#2C322C"
                      stroke="#474F45"
                      strokeWidth="0.6"
                    />

                    {/* 4 Parallel 32700 Cylindrical Cell Caps (2x2 Matrix inside bank) */}
                    {[
                      [bankX + 19, 76],
                      [bankX + 47, 76],
                      [bankX + 19, 114],
                      [bankX + 47, 114],
                    ].map(([cx, cy], cellIdx) => (
                      <g key={cellIdx}>
                        {/* Outer 32700 steel can */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r="12.5"
                          fill="#202521"
                          stroke={isSelected ? '#92998D' : '#434B41'}
                          strokeWidth="1.1"
                        />
                        {/* Inner LiFePO4 insulator ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r="8.2"
                          fill="#141815"
                          stroke={cellAccent}
                          strokeOpacity={0.35 + vFill * 0.45}
                          strokeWidth="1.1"
                        />
                        {/* Center positive vent cap */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r="3.2"
                          fill={cellAccent}
                          fillOpacity={isSelected ? 0.95 : 0.68}
                        />
                      </g>
                    ))}

                    {/* Per-Bank Charge Level Micro-Bar */}
                    <rect
                      x={bankX + 7}
                      y="138"
                      width="52"
                      height="5"
                      rx="1"
                      fill="#101311"
                      stroke="#343A33"
                      strokeWidth="0.7"
                    />
                    <rect
                      x={bankX + 8}
                      y="139"
                      width={Math.round(50 * vFill)}
                      height="3"
                      fill={cellAccent}
                      opacity="0.88"
                    />

                    {/* Bank Label & Live Voltage */}
                    <text
                      x={bankX + 33}
                      y="159"
                      textAnchor="middle"
                      fill={isSelected ? '#F0F0E8' : '#D6D2C5'}
                      fontFamily="IBM Plex Mono, monospace"
                      fontSize="9.5"
                      fontWeight="600"
                    >
                      {cell.label} · 4P
                    </text>
                    <text
                      x={bankX + 33}
                      y="175"
                      textAnchor="middle"
                      fill={cellAccent}
                      fontFamily="IBM Plex Mono, monospace"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {cell.voltage.toFixed(2)}V
                    </text>
                  </g>
                );
              })}

              {/* 4x DS18B20 Thermal Probe Callouts along bottom chassis */}
              {telemetry.cellTemperatures.map((probe, idx) => {
                const px = 148 + idx * 154;
                return (
                  <g key={probe.probeId}>
                    <line
                      x1={px}
                      y1="188"
                      x2={px}
                      y2="202"
                      stroke="#E69A42"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle cx={px} cy="190" r="2.5" fill="#E69A42" />
                    <rect
                      x={px - 39}
                      y="202"
                      width="78"
                      height="20"
                      rx="1.5"
                      fill="#151916"
                      stroke="#3B4139"
                      strokeWidth="1"
                    />
                    <text
                      x={px}
                      y="215"
                      textAnchor="middle"
                      fill="#D6D2C5"
                      fontFamily="IBM Plex Mono, monospace"
                      fontSize="9"
                    >
                      {probe.probeId}: {probe.temperature.toFixed(1)}°C
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Schematic Telemetry Strip */}
          <div
            className="mono"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '10.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              CELL SPREAD (ΔV):{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{telemetry.cellDeltaMv} mV</strong>
            </span>
            <span>
              THERMAL ARRAY (4× DS18B20):{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {telemetry.minTemperature.toFixed(1)}-{telemetry.maxTemperature.toFixed(1)} °C
              </strong>
            </span>
            <span>
              IMU VIBRATION (MPU6050):{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {telemetry.vibration.rms.toFixed(3)} g RMS
              </strong>
            </span>
          </div>
        </div>

        {/* Right: Structured Hardware Specification Plate */}
        <div
          className="pack-spec-col"
          style={{
            borderLeft: '1px solid var(--border-color)',
            padding: '16px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span className="micro-label">PACK SPECIFICATION PLATE</span>
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                REV 01
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px',
              }}
            >
              {specItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '2px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: '9px',
                      letterSpacing: '0.09em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: item.highlight ? 'var(--phosphor-green)' : 'var(--text-primary)',
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware Bus Context Footer */}
          <div
            style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>CONTROLLER</span>
              <span style={{ color: 'var(--warm-neutral)' }}>PCBCupid Glyph ESP32-S3</span>
            </div>
            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>BMS TARGET</span>
              <span style={{ color: 'var(--text-secondary)' }}>JK B1A8S10P (Pending)</span>
            </div>
            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>CELL RATING</span>
              <span style={{ color: 'var(--text-secondary)' }}>3.2 V · 6.0 Ah / 32700</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
