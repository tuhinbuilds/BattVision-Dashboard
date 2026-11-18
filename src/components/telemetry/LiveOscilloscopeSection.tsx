import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DataSourceMode,
  TelemetryHistoryPoint,
  TelemetryTimeWindowSec,
} from '../../types/telemetry';

interface LiveOscilloscopeSectionProps {
  visibleHistory: TelemetryHistoryPoint[];
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
  displayPaused: boolean;
  bufferedWhilePaused: number;
  timeWindowSec: TelemetryTimeWindowSec;
}

const SCOPE_TOOLTIP_STYLE = {
  backgroundColor: '#121513',
  border: '1px solid #4E564C',
  borderRadius: '2px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  color: '#F0F0E8',
};

const WINDOW_LABELS: Record<TelemetryTimeWindowSec, string> = {
  30: '30 SEC',
  60: '1 MIN',
  300: '5 MIN',
  900: '15 MIN',
};

export const LiveOscilloscopeSection: React.FC<LiveOscilloscopeSectionProps> = React.memo(
  ({ visibleHistory, dataSourceMode, hasLiveData, displayPaused, bufferedWhilePaused, timeWindowSec }) => {
    const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';
    const latest = visibleHistory[visibleHistory.length - 1];

    const channels = [
      {
        id: 'ch-v',
        tag: 'TRACE 01 // CH-V',
        title: 'Pack Voltage over Time',
        dataKey: 'packVoltage' as const,
        unit: 'V',
        color: '#B8D65A',
        domain: [20, 30] as [number, number],
        refY: 25.6,
        refLabel: 'NOM 25.6V',
        latestText: isDemo && latest ? `${latest.packVoltage.toFixed(2)} V` : '--.-- V',
      },
      {
        id: 'ch-i',
        tag: 'TRACE 02 // CH-I',
        title: 'Pack Current over Time',
        dataKey: 'packCurrent' as const,
        unit: 'A',
        color: '#E69A42',
        domain: [-18, 45] as [number, number],
        refY: 0,
        refLabel: '0A ZERO',
        latestText: isDemo && latest ? `${latest.packCurrent.toFixed(2)} A` : '--.-- A',
      },
      {
        id: 'ch-p',
        tag: 'TRACE 03 // CH-P',
        title: 'Electrical Power over Time (V × I)',
        dataKey: 'power' as const,
        unit: 'W',
        color: '#D6D2C5',
        domain: [-400, 1100] as [number, number],
        refY: 0,
        refLabel: '0W',
        latestText: isDemo && latest ? `${latest.power.toFixed(1)} W` : '--.- W',
      },
    ];

    return (
      <section className="bv-panel" aria-label="Live electrical oscilloscope waveforms">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span
              className={`status-led ${
                !isDemo
                  ? 'status-led--offline'
                  : displayPaused
                  ? 'status-led--amber'
                  : 'status-led--phosphor status-led--pulse'
              }`}
            />
            <h2 className="bv-panel-title">
              Live Oscilloscope // Synchronized Electrical Waveforms
            </h2>
            <span className="bv-badge bv-badge--muted">WINDOW: {WINDOW_LABELS[timeWindowSec]}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isDemo && displayPaused && (
              <span className="bv-badge bv-badge--amber">
                DISPLAY FROZEN · UNDERLYING STREAM ACTIVE (+{bufferedWhilePaused})
              </span>
            )}
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {isDemo ? `${visibleHistory.length} PLOTTED SAMPLES` : 'HARDWARE FEED OFFLINE'}
            </span>
          </div>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!isDemo ? (
            <div
              className="scope-grid-bg"
              style={{
                border: '1px dashed var(--border-strong)',
                borderRadius: '2px',
                padding: '44px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                className="mono"
                style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--signal-amber)' }}
              >
                NO HARDWARE SIGNAL - OSCILLOSCOPE STANDBY
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '480px' }}>
                HARDWARE MODE is active and no ESP32-S3 or local Edge API telemetry frames are
                connected. Switch to DEMO MODE to observe simulated oscilloscope waveforms.
              </span>
            </div>
          ) : (
            <div
              className="scope-3-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '12px',
              }}
            >
              <style>{`
                @media (max-width: 1240px) {
                  .scope-3-grid {
                    grid-template-columns: minmax(0, 1fr) !important;
                  }
                }
              `}</style>
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    backgroundColor: '#131614',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(32, 36, 32, 0.72)',
                    }}
                  >
                    <div>
                      <div className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.09em' }}>
                        {ch.tag}
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                        {ch.title}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: ch.color }}>
                      {ch.latestText}
                    </span>
                  </div>

                  <div className="scope-grid-bg" style={{ height: '196px', padding: '10px 8px 4px 0' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={visibleHistory}>
                        <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fill: '#92998D', fontSize: 9.5, fontFamily: 'IBM Plex Mono' }}
                          minTickGap={28}
                          stroke="#3B4139"
                        />
                        <YAxis
                          domain={ch.domain}
                          tick={{ fill: '#92998D', fontSize: 9.5, fontFamily: 'IBM Plex Mono' }}
                          width={44}
                          stroke="#3B4139"
                          unit={ch.unit === 'W' ? '' : ch.unit}
                        />
                        <ReferenceLine
                          y={ch.refY}
                          stroke="#5E665B"
                          strokeDasharray="4 4"
                          label={{
                            value: ch.refLabel,
                            position: 'insideTopRight',
                            fill: '#92998D',
                            fontSize: 8.5,
                            fontFamily: 'IBM Plex Mono',
                          }}
                        />
                        <Tooltip
                          contentStyle={SCOPE_TOOLTIP_STYLE}
                          formatter={(val: number) => [`${val} ${ch.unit}`, ch.title]}
                        />
                        <Line
                          type="monotone"
                          dataKey={ch.dataKey}
                          stroke={ch.color}
                          strokeWidth={1.8}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }
);
