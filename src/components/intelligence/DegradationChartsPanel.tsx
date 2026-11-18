import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CapacityTestRecord } from '../../types/intelligence';
import { DataSourceMode } from '../../types/telemetry';

interface DegradationChartsPanelProps {
  records: CapacityTestRecord[];
  dataSourceMode: DataSourceMode;
  eolThresholdPct: number;
}

type CycleZoom = 'ALL' | '200' | '320';

const CHART_TOOLTIP = {
  backgroundColor: '#121513',
  border: '1px solid #4E564C',
  borderRadius: '2px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10.5px',
  color: '#F0F0E8',
};

export const DegradationChartsPanel: React.FC<DegradationChartsPanelProps> = ({
  records,
  dataSourceMode,
  eolThresholdPct,
}) => {
  const [zoom, setZoom] = useState<CycleZoom>('ALL');
  const isDemo = dataSourceMode === 'DEMO';

  const visibleRecords = useMemo(() => {
    if (zoom === '200') return records.filter((r) => r.cycle <= 200);
    return records;
  }, [records, zoom]);

  return (
    <section className="bv-panel" aria-label="Battery degradation analysis charts">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className={`status-led ${isDemo ? 'status-led--amber' : 'status-led--offline'}`} />
          <h2 className="bv-panel-title">Battery Degradation Analysis // Capacity &amp; SoH Profile</h2>
          <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {isDemo ? 'ILLUSTRATIVE DEMO RECORDS' : '0 VALIDATED RECORDS'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="micro-label" style={{ fontSize: '9px' }}>
            CYCLE SPAN
          </span>
          {(['200', 'ALL'] as CycleZoom[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setZoom(opt)}
              disabled={!isDemo}
              className={`bv-btn ${zoom === opt && isDemo ? 'bv-btn--active' : ''}`}
              style={{ padding: '3px 8px', fontSize: '9.5px', opacity: isDemo ? 1 : 0.45 }}
            >
              {opt === '200' ? '0-200 CYC' : '0-320 CYC'}
            </button>
          ))}
        </div>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!isDemo || visibleRecords.length === 0 ? (
          <div
            className="scope-grid-bg"
            style={{
              border: '1px dashed var(--border-strong)',
              borderRadius: '2px',
              padding: '40px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              className="mono"
              style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--signal-amber)' }}
            >
              NO VALIDATED CAPACITY-TEST RECORDS AVAILABLE
            </span>
            <p style={{ margin: 0, maxWidth: '520px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Live telemetry samples are not automatically labelled battery ageing records. Historical
              degradation curves populate in HARDWARE mode only after validated discharge capacity-test
              records are stored in the local database.
            </p>
          </div>
        ) : (
          <div className="two-col-grid">
            {/* CHART 1: CAPACITY DEGRADATION PROFILE */}
            <div
              style={{
                backgroundColor: '#131614',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  padding: '8px 11px',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'rgba(32, 36, 32, 0.72)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="mono" style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                  CAPACITY DEGRADATION PROFILE (Ah)
                </span>
                <span className="mono" style={{ fontSize: '9px', color: 'var(--signal-amber)' }}>
                  DEMO DATASET
                </span>
              </div>
              <div className="scope-grid-bg" style={{ height: '236px', padding: '12px 10px 6px 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleRecords}>
                    <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="cycle"
                      tick={{ fill: '#92998D', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      stroke="#3B4139"
                      label={{
                        value: 'Cycle Number',
                        position: 'insideBottomRight',
                        offset: -4,
                        fill: '#92998D',
                        fontSize: 9.5,
                        fontFamily: 'IBM Plex Mono',
                      }}
                    />
                    <YAxis
                      domain={[21.5, 24.5]}
                      tick={{ fill: '#92998D', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      stroke="#3B4139"
                      width={46}
                      unit="Ah"
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP}
                      formatter={(val: number, name: string) => [`${val} Ah`, name]}
                      labelFormatter={(lbl) => `Cycle ${lbl} (Illustrative)`}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', paddingTop: '4px' }}
                    />
                    <ReferenceLine
                      y={24.0}
                      stroke="#92998D"
                      strokeDasharray="4 4"
                      label={{
                        value: 'REF 24.0 Ah',
                        position: 'insideTopRight',
                        fill: '#D6D2C5',
                        fontSize: 8.5,
                        fontFamily: 'IBM Plex Mono',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="measuredCapacityAh"
                      name="Illustrative Discharge Cap (Ah)"
                      stroke="#B8D65A"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#B8D65A', stroke: '#131614' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: SOH TREND */}
            <div
              style={{
                backgroundColor: '#131614',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  padding: '8px 11px',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'rgba(32, 36, 32, 0.72)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="mono" style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                  SOH TREND OVER CYCLES (%)
                </span>
                <span className="mono" style={{ fontSize: '9px', color: 'var(--signal-amber)' }}>
                  DEMO DATASET
                </span>
              </div>
              <div className="scope-grid-bg" style={{ height: '236px', padding: '12px 10px 6px 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleRecords}>
                    <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="cycle"
                      tick={{ fill: '#92998D', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      stroke="#3B4139"
                      label={{
                        value: 'Cycle Number',
                        position: 'insideBottomRight',
                        offset: -4,
                        fill: '#92998D',
                        fontSize: 9.5,
                        fontFamily: 'IBM Plex Mono',
                      }}
                    />
                    <YAxis
                      domain={[Math.min(74, eolThresholdPct - 4), 102]}
                      tick={{ fill: '#92998D', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      stroke="#3B4139"
                      width={46}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP}
                      formatter={(val: number, name: string) => [`${val}%`, name]}
                      labelFormatter={(lbl) => `Cycle ${lbl} (Illustrative)`}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', paddingTop: '4px' }}
                    />
                    <ReferenceLine
                      y={eolThresholdPct}
                      stroke="#D75C4B"
                      strokeDasharray="4 4"
                      label={{
                        value: `EoL ${eolThresholdPct}% (CONFIG)`,
                        position: 'insideBottomRight',
                        fill: '#D75C4B',
                        fontSize: 8.5,
                        fontFamily: 'IBM Plex Mono',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sohPct"
                      name="Illustrative SoH (%)"
                      stroke="#E69A42"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#E69A42', stroke: '#131614' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
