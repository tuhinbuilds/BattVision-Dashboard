import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Minus } from 'lucide-react';
import { BATTERY_PACK_SPEC, TELEMETRY_LIMITS } from '../../config/systemConfig';
import { SessionTelemetryStats } from '../../services/dataService';
import { formatTimeShort } from '../../services/simulationService';
import {
  BatteryTelemetry,
  DataSourceMode,
  TelemetryHistoryPoint,
} from '../../types/telemetry';
import { SparklinePlot } from '../SparklinePlot';

interface PrimaryElectricalInstrumentsProps {
  telemetry: BatteryTelemetry;
  history: TelemetryHistoryPoint[];
  sessionStats: SessionTelemetryStats;
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
  displayPaused: boolean;
}

function computeTrend(values: number[], deadband: number): 'UP' | 'DOWN' | 'FLAT' {
  if (values.length < 4) return 'FLAT';
  const latest = values[values.length - 1];
  const earlier = values[Math.max(0, values.length - 5)];
  const diff = latest - earlier;
  if (diff > deadband) return 'UP';
  if (diff < -deadband) return 'DOWN';
  return 'FLAT';
}

function renderTrendLabel(trend: 'UP' | 'DOWN' | 'FLAT', available: boolean) {
  if (!available) return <span style={{ color: 'var(--text-muted)' }}>TREND --</span>;
  if (trend === 'UP') {
    return (
      <span style={{ color: 'var(--phosphor-green)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        <ArrowUpRight size={11} /> RISING
      </span>
    );
  }
  if (trend === 'DOWN') {
    return (
      <span style={{ color: 'var(--signal-amber)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        <ArrowDownLeft size={11} /> FALLING
      </span>
    );
  }
  return (
    <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      <Minus size={11} /> STEADY
    </span>
  );
}

export const PrimaryElectricalInstruments: React.FC<PrimaryElectricalInstrumentsProps> = React.memo(
  ({ telemetry, history, sessionStats, dataSourceMode, hasLiveData, displayPaused }) => {
    const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';
    const recent = history.slice(-36);
    const voltageSeries = isDemo ? recent.map((p) => p.packVoltage) : [];
    const currentSeries = isDemo ? recent.map((p) => p.packCurrent) : [];
    const powerSeries = isDemo ? recent.map((p) => p.power) : [];
    const socSeries = isDemo ? recent.map((p) => p.stateOfCharge) : [];

    // Consistent derived calculation: Power (W) = Voltage (V) * Current (A)
    const computedPower = isDemo
      ? Number((telemetry.packVoltage * telemetry.packCurrent).toFixed(1))
      : null;

    const freshnessLabel = !isDemo
      ? 'OFFLINE'
      : displayPaused
      ? `FROZEN · ${formatTimeShort(telemetry.epochMs)}`
      : `LIVE · ${formatTimeShort(telemetry.epochMs)}`;

    // Instrument 01: Voltage scale (20.0V .. 29.2V)
    const vPct = isDemo
      ? Math.max(
          0,
          Math.min(
            100,
            ((telemetry.packVoltage - TELEMETRY_LIMITS.voltage.min) /
              (TELEMETRY_LIMITS.voltage.max - TELEMETRY_LIMITS.voltage.min)) *
              100
          )
        )
      : 0;
    const vNomPct =
      ((TELEMETRY_LIMITS.voltage.nominal - TELEMETRY_LIMITS.voltage.min) /
        (TELEMETRY_LIMITS.voltage.max - TELEMETRY_LIMITS.voltage.min)) *
      100;

    // Instrument 02: Current direction & bipolar scale (-50A .. +50A ACS758-50B range)
    const currentDir: 'CHARGING' | 'DISCHARGING' | 'IDLE' | 'UNCONFIGURED' = !isDemo
      ? 'UNCONFIGURED'
      : telemetry.packCurrent < -0.3
      ? 'CHARGING'
      : telemetry.packCurrent > 0.3
      ? 'DISCHARGING'
      : 'IDLE';

    const currentTrend = computeTrend(currentSeries, 0.4);
    const powerTrend = computeTrend(powerSeries, 12);
    const socTrend = computeTrend(socSeries, 0.08);

    // Bipolar bar for ACS758-50B (-50A .. 0 .. +50A)
    const iRatio = isDemo ? Math.max(-1, Math.min(1, telemetry.packCurrent / 50)) : 0;
    const iBarLeft = iRatio >= 0 ? 50 : 50 + iRatio * 50;
    const iBarWidth = Math.abs(iRatio) * 50;

    // Instrument 04: Semicircular SoC Gauge geometry
    const socVal = isDemo ? telemetry.stateOfCharge : null;
    const remainingAh =
      socVal !== null ? ((socVal / 100) * BATTERY_PACK_SPEC.nominalCapacityAh).toFixed(1) : '--';
    const remainingWh =
      socVal !== null ? ((socVal / 100) * BATTERY_PACK_SPEC.nominalEnergyWh).toFixed(0) : '--';

    const radius = 58;
    const cx = 90;
    const cy = 80;
    const semiCircumference = Math.PI * radius;
    const socDashOffset =
      socVal !== null
        ? semiCircumference * (1 - Math.max(0, Math.min(100, socVal)) / 100)
        : semiCircumference;

    return (
      <section
        aria-label="Primary electrical measurement instruments"
        className="telemetry-4-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        <style>{`
          @media (max-width: 1320px) {
            .telemetry-4-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
          @media (max-width: 680px) {
            .telemetry-4-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}</style>

        {/* INSTRUMENT 01 — PACK VOLTAGE */}
        <article className="bv-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="bv-panel-header" style={{ padding: '8px 12px' }}>
            <div className="bv-panel-title-group">
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                INST-01
              </span>
              <h2 className="bv-panel-title">Pack Voltage</h2>
            </div>
            <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
              {isDemo ? 'DEMO' : 'N/A'}
            </span>
          </div>

          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    lineHeight: 1,
                    color: isDemo ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {isDemo ? telemetry.packVoltage.toFixed(2) : '--.--'}
                </span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--phosphor-green)' }}>
                  V
                </span>
              </div>
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                {freshnessLabel}
              </span>
            </div>

            {/* Oscilloscope-Inspired Graduated Voltage Scale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  position: 'relative',
                  height: '12px',
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '1px',
                  overflow: 'hidden',
                }}
              >
                {/* Scale ticks */}
                {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pct) => (
                  <div
                    key={pct}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: 0,
                      height: '4px',
                      width: '1px',
                      backgroundColor: '#3B4139',
                    }}
                  />
                ))}
                <div
                  style={{
                    width: `${vPct}%`,
                    height: '100%',
                    backgroundColor: 'var(--phosphor-green)',
                    opacity: 0.82,
                    transition: 'width 260ms ease',
                  }}
                />
                {/* Nominal 25.6V Reticle */}
                <div
                  title="Nominal pack voltage: 25.6 V"
                  style={{
                    position: 'absolute',
                    left: `${vNomPct}%`,
                    top: 0,
                    bottom: 0,
                    width: '1.5px',
                    backgroundColor: 'var(--warm-neutral)',
                  }}
                />
              </div>
              <div
                className="mono"
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'var(--text-muted)' }}
              >
                <span>20.0V CUT</span>
                <span>NOM 25.6V</span>
                <span>29.2V FULL</span>
              </div>
            </div>

            <SparklinePlot
              values={voltageSeries}
              color="var(--phosphor-green)"
              height={46}
              paused={!isDemo || displayPaused}
            />

            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span>
                SESSION MIN:{' '}
                <strong style={{ color: 'var(--warm-neutral)' }}>
                  {isDemo ? `${sessionStats.minVoltage.toFixed(2)}V` : '--'}
                </strong>
              </span>
              <span>
                MAX:{' '}
                <strong style={{ color: 'var(--warm-neutral)' }}>
                  {isDemo ? `${sessionStats.maxVoltage.toFixed(2)}V` : '--'}
                </strong>
              </span>
            </div>
          </div>
        </article>

        {/* INSTRUMENT 02 — PACK CURRENT */}
        <article className="bv-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="bv-panel-header" style={{ padding: '8px 12px' }}>
            <div className="bv-panel-title-group">
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                INST-02
              </span>
              <h2 className="bv-panel-title">Pack Current</h2>
            </div>
            <span
              className={`bv-badge ${
                currentDir === 'CHARGING'
                  ? 'bv-badge--amber'
                  : currentDir === 'DISCHARGING'
                  ? 'bv-badge--phosphor'
                  : 'bv-badge--muted'
              }`}
            >
              {currentDir === 'UNCONFIGURED' ? 'N/A' : currentDir}
            </span>
          </div>

          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    lineHeight: 1,
                    color: !isDemo
                      ? 'var(--text-muted)'
                      : currentDir === 'CHARGING'
                      ? 'var(--signal-amber)'
                      : 'var(--text-primary)',
                  }}
                >
                  {isDemo
                    ? `${telemetry.packCurrent >= 0 ? '+' : ''}${telemetry.packCurrent.toFixed(2)}`
                    : '--.--'}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '13px',
                    color: currentDir === 'CHARGING' ? 'var(--signal-amber)' : 'var(--phosphor-green)',
                  }}
                >
                  A
                </span>
              </div>
              <span className="mono" style={{ fontSize: '9.5px' }}>
                {renderTrendLabel(currentTrend, isDemo)}
              </span>
            </div>

            {/* Bipolar Zero-Centered Scale (±50A ACS758-50B Nominal Range) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  position: 'relative',
                  height: '12px',
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '1px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${iBarLeft}%`,
                    width: `${iBarWidth}%`,
                    top: 0,
                    bottom: 0,
                    backgroundColor:
                      currentDir === 'CHARGING' ? 'var(--signal-amber)' : 'var(--phosphor-green)',
                    opacity: 0.85,
                    transition: 'left 260ms ease, width 260ms ease',
                  }}
                />
                {/* Center 0A Reference */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '1.5px',
                    backgroundColor: 'var(--warm-neutral)',
                  }}
                />
              </div>
              <div
                className="mono"
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'var(--text-muted)' }}
              >
                <span>−50A CHG</span>
                <span>0A (ACS758-50B)</span>
                <span>+50A DSG</span>
              </div>
            </div>

            <SparklinePlot
              values={currentSeries}
              color={currentDir === 'CHARGING' ? 'var(--signal-amber)' : 'var(--phosphor-green)'}
              height={46}
              paused={!isDemo || displayPaused}
            />

            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span>
                PEAK |I|:{' '}
                <strong style={{ color: 'var(--warm-neutral)' }}>
                  {isDemo ? `${sessionStats.peakCurrentAbs.toFixed(2)}A` : '--'}
                </strong>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                {isDemo ? '+DSG / −CHG (DEMO)' : 'SIGN UNCONFIGURED'}
              </span>
            </div>
          </div>
        </article>

        {/* INSTRUMENT 03 — ELECTRICAL POWER (V × I) */}
        <article className="bv-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="bv-panel-header" style={{ padding: '8px 12px' }}>
            <div className="bv-panel-title-group">
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                INST-03
              </span>
              <h2 className="bv-panel-title">Electrical Power</h2>
            </div>
            <span className="bv-badge bv-badge--muted">V × I</span>
          </div>

          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    lineHeight: 1,
                    color: !isDemo
                      ? 'var(--text-muted)'
                      : computedPower !== null && computedPower < -5
                      ? 'var(--signal-amber)'
                      : 'var(--text-primary)',
                  }}
                >
                  {computedPower !== null ? computedPower.toFixed(1) : '--.-'}
                </span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--warm-neutral)' }}>
                  W
                </span>
              </div>
              <span className="mono" style={{ fontSize: '9.5px' }}>
                {renderTrendLabel(powerTrend, isDemo)}
              </span>
            </div>

            {/* Energy Flow Direction Readout Strip */}
            <div
              className="mono"
              style={{
                padding: '6px 8px',
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '2px',
                fontSize: '9.5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>FLOW:</span>
              <strong
                style={{
                  color: !isDemo
                    ? 'var(--text-muted)'
                    : computedPower !== null && computedPower < -5
                    ? 'var(--signal-amber)'
                    : computedPower !== null && computedPower > 5
                    ? 'var(--phosphor-green)'
                    : 'var(--text-secondary)',
                }}
              >
                {!isDemo
                  ? 'UNAVAILABLE'
                  : computedPower !== null && computedPower < -5
                  ? '← ENTERING PACK'
                  : computedPower !== null && computedPower > 5
                  ? 'LEAVING PACK →'
                  : 'STANDBY (0 W)'}
              </strong>
            </div>

            <SparklinePlot
              values={powerSeries}
              color="var(--warm-neutral)"
              height={46}
              paused={!isDemo || displayPaused}
            />

            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span>
                PEAK |P|:{' '}
                <strong style={{ color: 'var(--warm-neutral)' }}>
                  {isDemo ? `${sessionStats.peakPowerAbs.toFixed(0)}W` : '--'}
                </strong>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                P = V × I
              </span>
            </div>
          </div>
        </article>

        {/* INSTRUMENT 04 — STATE OF CHARGE (SEMICIRCULAR GAUGE) */}
        <article className="bv-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="bv-panel-header" style={{ padding: '8px 12px' }}>
            <div className="bv-panel-title-group">
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                INST-04
              </span>
              <h2 className="bv-panel-title">State of Charge</h2>
            </div>
            <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
              {isDemo ? 'ESTIMATE' : 'N/A'}
            </span>
          </div>

          <div
            className="bv-panel-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '6px',
              flex: 1,
            }}
          >
            {/* Semicircular Calibrated Instrument Gauge */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <svg
                viewBox="0 0 180 98"
                width="100%"
                style={{ maxWidth: '198px', height: 'auto', display: 'block' }}
                role="img"
                aria-label={`Estimated State of Charge gauge: ${
                  socVal !== null ? `${socVal.toFixed(1)} percent` : 'unavailable'
                }`}
              >
                {/* Background Track Arc */}
                <path
                  d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                  fill="none"
                  stroke="#131614"
                  strokeWidth="12"
                />
                <path
                  d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                  fill="none"
                  stroke="#3B4139"
                  strokeWidth="10"
                  strokeDasharray="2 3"
                />

                {/* Active Phosphor Arc */}
                <path
                  d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                  fill="none"
                  stroke={
                    socVal === null
                      ? '#4E564C'
                      : socVal <= 20
                      ? '#E69A42'
                      : '#B8D65A'
                  }
                  strokeWidth="8"
                  strokeDasharray={semiCircumference}
                  strokeDashoffset={socDashOffset}
                  style={{ transition: 'stroke-dashoffset 320ms ease' }}
                />

                {/* Scale Endpoints */}
                <text
                  x="16"
                  y="92"
                  fill="#6E756A"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="8"
                >
                  0%
                </text>
                <text
                  x="90"
                  y="11"
                  textAnchor="middle"
                  fill="#6E756A"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="8"
                >
                  50%
                </text>
                <text
                  x="164"
                  y="92"
                  textAnchor="end"
                  fill="#6E756A"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="8"
                >
                  100%
                </text>

                {/* Center Digital Readout */}
                <text
                  x="90"
                  y="66"
                  textAnchor="middle"
                  fill={socVal !== null ? '#F0F0E8' : '#6E756A'}
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="24"
                  fontWeight="600"
                >
                  {socVal !== null ? `${socVal.toFixed(1)}%` : '--.-%'}
                </text>
                <text
                  x="90"
                  y="81"
                  textAnchor="middle"
                  fill="#92998D"
                  fontFamily="IBM Plex Mono, monospace"
                  fontSize="7.5"
                  letterSpacing="0.8"
                >
                  ESTIMATED (NOT DIRECT)
                </text>
              </svg>
            </div>

            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span>
                REM:{' '}
                <strong style={{ color: 'var(--warm-neutral)' }}>
                  {remainingAh} Ah · {remainingWh} Wh
                </strong>
              </span>
              {renderTrendLabel(socTrend, isDemo)}
            </div>
          </div>
        </article>
      </section>
    );
  }
);
