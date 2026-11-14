import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Minus } from 'lucide-react';
import { formatTimeShort } from '../../services/simulationService';
import {
  DataSourceMode,
  TelemetryHistoryPoint,
  TemperatureSensor,
} from '../../types/telemetry';

interface ThermalMonitoringSectionProps {
  sensors: TemperatureSensor[];
  history: TelemetryHistoryPoint[];
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
  displayPaused: boolean;
}

export const ThermalMonitoringSection: React.FC<ThermalMonitoringSectionProps> = React.memo(
  ({ sensors, history, dataSourceMode, hasLiveData, displayPaused }) => {
    // Configurable UI warning threshold (explicitly labelled as user-configured UI reference, not manufacturer safety limit)
    const [warnThresholdC, setWarnThresholdC] = useState<number>(38);
    const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';

    const recent = history.slice(-16);

    const getProbeTrend = (idx: number): 'UP' | 'DOWN' | 'FLAT' => {
      if (!isDemo || recent.length < 4) return 'FLAT';
      const key = `temp${idx + 1}` as 'temp1' | 'temp2' | 'temp3' | 'temp4';
      const diff = recent[recent.length - 1][key] - recent[Math.max(0, recent.length - 6)][key];
      if (diff > 0.15) return 'UP';
      if (diff < -0.15) return 'DOWN';
      return 'FLAT';
    };

    return (
      <section className="bv-panel" aria-label="4-channel DS18B20 thermal monitoring">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span
              className={`status-led ${isDemo ? 'status-led--amber' : 'status-led--offline'}`}
            />
            <h2 className="bv-panel-title">Thermal Monitoring // 4× DS18B20 Waterproof Probes</h2>
          </div>

          {/* Configurable UI Warning Threshold */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label
              htmlFor="thermal-warn-slider"
              className="mono"
              style={{ fontSize: '9.5px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>UI WARN MARKER:</span>
              <strong style={{ color: 'var(--signal-amber)' }}>{warnThresholdC} °C</strong>
              <input
                id="thermal-warn-slider"
                type="range"
                min={30}
                max={50}
                step={1}
                value={warnThresholdC}
                onChange={(e) => setWarnThresholdC(Number(e.target.value))}
                style={{ width: '74px', accentColor: '#E69A42', cursor: 'pointer' }}
                aria-label="Configurable UI thermal warning threshold in degrees Celsius"
              />
            </label>
            <span className="bv-badge bv-badge--muted">4 ZONES ≠ 32 CELLS</span>
          </div>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            className="mono"
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-subtle)',
              borderLeft: '2px solid var(--signal-amber)',
              fontSize: '9.5px',
              color: 'var(--text-secondary)',
            }}
          >
            SCOPE NOTE: Four DS18B20 probes monitor selected enclosure/module zones and do not
            individually measure all 32 cells. The configurable warning marker is a UI indicator,
            not a manufacturer-certified battery safety cutoff.
          </div>

          <div
            className="thermal-4-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            <style>{`
              @media (max-width: 1180px) {
                .thermal-4-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                }
              }
              @media (max-width: 620px) {
                .thermal-4-grid {
                  grid-template-columns: minmax(0, 1fr) !important;
                }
              }
            `}</style>

            {sensors.map((sensor, idx) => {
              const temp = isDemo ? sensor.temperatureC : null;
              const isWarn = temp !== null && temp >= warnThresholdC;
              const isCritical = temp !== null && temp >= warnThresholdC + 8;
              const barColor =
                temp === null
                  ? '#4E564C'
                  : isCritical
                  ? 'var(--warning-red)'
                  : isWarn
                  ? 'var(--signal-amber)'
                  : 'var(--phosphor-green)';

              const pct =
                temp !== null ? Math.max(0, Math.min(100, ((temp - 10) / (60 - 10)) * 100)) : 0;
              const markerPct = Math.max(0, Math.min(100, ((warnThresholdC - 10) / (60 - 10)) * 100));
              const trend = getProbeTrend(idx);

              const statusLabel =
                temp === null
                  ? 'NOT CONNECTED'
                  : isCritical
                  ? 'HIGH (UI)'
                  : isWarn
                  ? 'WARN (UI)'
                  : 'NOMINAL';

              const badgeClass =
                temp === null
                  ? 'bv-badge--muted'
                  : isCritical
                  ? 'bv-badge--red'
                  : isWarn
                  ? 'bv-badge--amber'
                  : 'bv-badge--phosphor';

              const lastUpdated =
                !isDemo || !sensor.timestamp
                  ? 'N/A'
                  : displayPaused
                  ? `FROZEN ${formatTimeShort(Date.parse(sensor.timestamp))}`
                  : formatTimeShort(Date.parse(sensor.timestamp));

              return (
                <div
                  key={sensor.id}
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: `1px solid ${
                      isCritical
                        ? 'var(--warning-red-border)'
                        : isWarn
                        ? 'var(--signal-amber-border)'
                        : 'var(--border-color)'
                    }`,
                    borderRadius: '2px',
                    padding: '11px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                      {sensor.id}
                    </span>
                    <span className={`bv-badge ${badgeClass}`} style={{ fontSize: '8.5px', padding: '1px 5px' }}>
                      {statusLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: '26px',
                          fontWeight: 600,
                          lineHeight: 1,
                          color: temp === null ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}
                      >
                        {temp !== null ? temp.toFixed(1) : '--.-'}
                      </span>
                      <span className="mono" style={{ fontSize: '12px', color: barColor }}>
                        °C
                      </span>
                    </div>

                    <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      {temp === null ? (
                        '--'
                      ) : trend === 'UP' ? (
                        <>
                          <ArrowUpRight size={11} style={{ color: 'var(--signal-amber)' }} /> +ΔT
                        </>
                      ) : trend === 'DOWN' ? (
                        <>
                          <ArrowDownLeft size={11} style={{ color: 'var(--phosphor-green)' }} /> −ΔT
                        </>
                      ) : (
                        <>
                          <Minus size={11} /> FLAT
                        </>
                      )}
                    </span>
                  </div>

                  {/* Horizontal Instrument Temperature Scale (10°C – 60°C) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div
                      style={{
                        position: 'relative',
                        height: '9px',
                        backgroundColor: '#101311',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '1px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: barColor,
                          transition: 'width 280ms ease',
                        }}
                      />
                      {/* Configurable UI warning threshold marker */}
                      <div
                        title={`UI warning marker: ${warnThresholdC}°C`}
                        style={{
                          position: 'absolute',
                          left: `${markerPct}%`,
                          top: 0,
                          bottom: 0,
                          width: '1.5px',
                          backgroundColor: 'var(--signal-amber)',
                        }}
                      />
                    </div>
                    <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)' }}>
                      <span>10°C</span>
                      <span>WARN {warnThresholdC}°C</span>
                      <span>60°C</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    {sensor.zoneTitle}
                  </div>

                  <div
                    className="mono"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '9px',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '5px',
                    }}
                  >
                    <span>SRC: {isDemo ? 'SIMULATED' : 'OFFLINE'}</span>
                    <span>UPD: {lastUpdated}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
);
