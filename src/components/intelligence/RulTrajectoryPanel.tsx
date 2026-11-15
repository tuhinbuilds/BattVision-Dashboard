import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DegradationRecord, RemainingUsefulLifeEstimate } from '../../types/intelligence';
import { DataSourceMode } from '../../types/telemetry';

interface RulTrajectoryPanelProps {
  trajectory: DegradationRecord[];
  rul: RemainingUsefulLifeEstimate;
  dataSourceMode: DataSourceMode;
}

const RUL_TOOLTIP = {
  backgroundColor: '#121513',
  border: '1px solid #4E564C',
  borderRadius: '2px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10.5px',
  color: '#F0F0E8',
};

export const RulTrajectoryPanel: React.FC<RulTrajectoryPanelProps> = ({
  trajectory,
  rul,
  dataSourceMode,
}) => {
  const isDemo = dataSourceMode === 'DEMO';

  return (
    <section className="bv-panel" aria-label="Remaining Useful Life trajectory projection">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className={`status-led ${isDemo ? 'status-led--amber' : 'status-led--offline'}`} />
          <h2 className="bv-panel-title">
            RUL Prediction Visualisation // Observed vs. Modelled Trajectory
          </h2>
          <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {isDemo
              ? 'ILLUSTRATIVE TRAJECTORY — NOT VALIDATED'
              : 'NO PREDICTION (MODEL OFFLINE)'}
          </span>
        </div>

        <div className="mono" style={{ fontSize: '10px', color: 'var(--warm-neutral)' }}>
          EoL THRESHOLD: <strong style={{ color: 'var(--warning-red)' }}>{rul.eolThresholdPct}% ({rul.eolCapacityAh.toFixed(2)} Ah)</strong>
          {isDemo && rul.projectedCrossingCycle !== null && (
            <>
              {' '}· PROJECTED CROSSING:{' '}
              <strong style={{ color: 'var(--signal-amber)' }}>~CYC {rul.projectedCrossingCycle}</strong>
            </>
          )}
        </div>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isDemo || trajectory.length === 0 ? (
          <div
            className="scope-grid-bg"
            style={{
              border: '1px dashed var(--border-strong)',
              borderRadius: '2px',
              padding: '42px 20px',
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
              INSUFFICIENT AGEING DATA FOR VALIDATED RUL
            </span>
            <p style={{ margin: 0, maxWidth: '540px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              In HARDWARE mode, BattVision never invents a degradation trajectory or end-of-life
              crossing. A validated RUL trajectory will render once experimental ageing records and a
              deployed Edge-AI prognostic model are available.
            </p>
          </div>
        ) : (
          <>
            <div
              className="scope-grid-bg"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                height: '266px',
                padding: '12px 12px 6px 0',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trajectory}>
                  <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="cycle"
                    type="number"
                    domain={[0, 'dataMax']}
                    tick={{ fill: '#92998D', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                    stroke="#3B4139"
                    label={{
                      value: 'Cumulative Equivalent Cycles',
                      position: 'insideBottomRight',
                      offset: -4,
                      fill: '#92998D',
                      fontSize: 9.5,
                      fontFamily: 'IBM Plex Mono',
                    }}
                  />
                  <YAxis
                    domain={[16, 24.8]}
                    tick={{ fill: '#92998D', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                    stroke="#3B4139"
                    width={48}
                    unit="Ah"
                  />
                  <Tooltip
                    contentStyle={RUL_TOOLTIP}
                    labelFormatter={(lbl) => `Cycle ${lbl} (Demo)`}
                    formatter={(val: unknown, name: string) => {
                      if (Array.isArray(val)) {
                        return [`${val[0]} – ${val[1]} Ah`, name];
                      }
                      return [`${val} Ah`, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', paddingTop: '4px' }}
                  />

                  {/* Configured EoL Capacity Threshold */}
                  <ReferenceLine
                    y={rul.eolCapacityAh}
                    stroke="#D75C4B"
                    strokeWidth={1.4}
                    strokeDasharray="5 4"
                    label={{
                      value: `CONFIGURED EoL: ${rul.eolThresholdPct}% (${rul.eolCapacityAh.toFixed(1)} Ah)`,
                      position: 'insideTopRight',
                      fill: '#D75C4B',
                      fontSize: 9,
                      fontFamily: 'IBM Plex Mono',
                    }}
                  />

                  {/* Projected Threshold Crossing Marker */}
                  {rul.projectedCrossingCycle !== null && (
                    <ReferenceLine
                      x={rul.projectedCrossingCycle}
                      stroke="#E69A42"
                      strokeDasharray="3 3"
                      label={{
                        value: `DEMO CROSSING ~CYC ${rul.projectedCrossingCycle}`,
                        position: 'insideTopLeft',
                        fill: '#E69A42',
                        fontSize: 9,
                        fontFamily: 'IBM Plex Mono',
                      }}
                    />
                  )}

                  {/* Shaded Uncalibrated Demo Uncertainty Band */}
                  <Area
                    type="monotone"
                    dataKey="intervalBandAh"
                    name="Illustrative Interval (Uncalibrated)"
                    fill="#E69A42"
                    fillOpacity={0.16}
                    stroke="none"
                    isAnimationActive={false}
                  />

                  {/* Solid Line: Observed Illustrative Historical Measurements */}
                  <Line
                    type="monotone"
                    dataKey="observedCapacityAh"
                    name="Observed Historical Capacity (Demo)"
                    stroke="#B8D65A"
                    strokeWidth={2.2}
                    dot={{ r: 3, fill: '#B8D65A', stroke: '#131614' }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />

                  {/* Dashed Line: Modelled Future Trajectory */}
                  <Line
                    type="monotone"
                    dataKey="predictedCapacityAh"
                    name="Modelled Trajectory (Demo Dashed)"
                    stroke="#E69A42"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '9.5px',
                color: 'var(--text-muted)',
              }}
            >
              <span>SOLID GREEN = ILLUSTRATIVE OBSERVED · DASHED AMBER = MODELLED TRAJECTORY · SHADED = DEMO INTERVAL</span>
              <span>ADJUST EoL THRESHOLD (75% / 80% / 85%) IN RUL INSTRUMENT ABOVE TO RE-PROJECT</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
