import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computeChargeDischargeMetrics } from '../../services/dataQualityService';
import { TelemetryRecord } from '../../types/datalab';
import { DataSourceMode } from '../../types/telemetry';

interface ChargeDischargeAnalysisPanelProps {
  records: TelemetryRecord[];
  dataSourceMode: DataSourceMode;
}

const TOOLTIP = {
  backgroundColor: '#121513',
  border: '1px solid #4E564C',
  borderRadius: '2px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10.5px',
  color: '#F0F0E8',
};

export const ChargeDischargeAnalysisPanel: React.FC<ChargeDischargeAnalysisPanelProps> = ({
  records,
  dataSourceMode,
}) => {
  const [signConfigured, setSignConfigured] = useState<boolean>(true);
  const isDemo = dataSourceMode === 'DEMO';

  const metrics = useMemo(
    () => computeChargeDischargeMetrics(records, signConfigured),
    [records, signConfigured]
  );

  const plots = [
    { title: 'Voltage vs. Time (V)', key: 'packVoltage', color: '#B8D65A', unit: 'V' },
    { title: 'Current vs. Time (A)', key: 'packCurrent', color: '#E69A42', unit: 'A' },
    { title: 'Power vs. Time (W)', key: 'power', color: '#D6D2C5', unit: 'W' },
    { title: 'Zone Temp (TEMP-03) vs. Time (°C)', key: 'temperature3', color: '#D75C4B', unit: '°C' },
    { title: 'Estimated SoC vs. Time (%)', key: 'stateOfCharge', color: '#8FB593', unit: '%' },
  ];

  const stateBadgeClass =
    metrics.state === 'DISCHARGING'
      ? 'bv-badge--phosphor'
      : metrics.state === 'CHARGING'
      ? 'bv-badge--amber'
      : 'bv-badge--muted';

  return (
    <section className="bv-panel" aria-label="Charge and discharge cycler analysis">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className={`status-led ${records.length ? 'status-led--phosphor' : 'status-led--offline'}`} />
          <h2 className="bv-panel-title">CHARGE &amp; DISCHARGE ANALYSIS // Battery Cycler View</h2>
          <span className={`bv-badge ${stateBadgeClass}`}>STATE: {metrics.state}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`bv-btn ${signConfigured ? 'bv-btn--active' : 'bv-btn--amber'}`}
            onClick={() => setSignConfigured((s) => !s)}
            style={{ padding: '4px 8px', fontSize: '9.5px' }}
          >
            Sign Convention: {signConfigured ? '+DSG / −CHG' : 'UNCONFIGURED'}
          </button>
          <span className="bv-badge bv-badge--muted">ANALYSIS ONLY (NO CYCLER CONTROL)</span>
        </div>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!signConfigured && (
          <div className="mono" style={{ padding: '7px 10px', backgroundColor: 'var(--signal-amber-dim)', border: '1px solid var(--signal-amber-border)', fontSize: '10px', color: 'var(--signal-amber)' }}>
            CURRENT SIGN CONVENTION UNCONFIGURED: Direction is reported as UNKNOWN rather than inferred solely from raw numerical sign.
          </div>
        )}

        {/* Session Metrics Integrated from Actual Timestamps */}
        <div
          className="cd-stats-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}
        >
          <style>{`
            @media (max-width: 1020px) {
              .cd-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            }
          `}</style>
          {[
            { k: 'Session Start', v: metrics.startLabel },
            { k: 'Session Duration', v: `${metrics.durationSec} s (${metrics.sampleCount} samples)` },
            {
              k: 'Initial / Final Voltage',
              v:
                metrics.initialVoltageV !== null && metrics.finalVoltageV !== null
                  ? `${metrics.initialVoltageV.toFixed(2)} V → ${metrics.finalVoltageV.toFixed(2)} V`
                  : 'N/A',
            },
            {
              k: 'Min / Max Voltage',
              v:
                metrics.minVoltageV !== null && metrics.maxVoltageV !== null
                  ? `${metrics.minVoltageV.toFixed(2)} V / ${metrics.maxVoltageV.toFixed(2)} V`
                  : 'N/A',
            },
            {
              k: 'Average Current',
              v: metrics.avgCurrentA !== null ? `${metrics.avgCurrentA.toFixed(2)} A` : 'N/A',
            },
            {
              k: 'Integrated Energy (∫ P dt)',
              v:
                metrics.energyEstimateWh !== null
                  ? `${metrics.energyEstimateWh.toFixed(3)} Wh (${metrics.hasSamplingGaps ? 'EST · GAPS' : 'TS INTEGRAL'})`
                  : 'N/A',
              accent: true,
            },
            {
              k: 'Sampling Continuity',
              v: metrics.hasSamplingGaps ? `${metrics.gapCount} GAP(S) DETECTED` : 'CONTINUOUS TIMESTAMPS',
            },
            {
              k: 'Data Source',
              v: isDemo ? 'SIMULATED / DEMO' : records.length ? 'IMPORTED CSV' : 'HARDWARE OFFLINE',
            },
          ].map((stat) => (
            <div
              key={stat.k}
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 10px',
              }}
            >
              <div className="micro-label" style={{ fontSize: '8.5px' }}>
                {stat.k}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '3px',
                  color: stat.accent ? 'var(--phosphor-green)' : 'var(--warm-neutral)',
                }}
              >
                {stat.v}
              </div>
            </div>
          ))}
        </div>

        {/* 5 Cycler Waveforms */}
        {records.length === 0 ? (
          <div className="scope-grid-bg mono" style={{ padding: '38px', textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', border: '1px dashed var(--border-strong)' }}>
            NO TELEMETRY RECORDS AVAILABLE FOR CHARGE/DISCHARGE ANALYSIS IN HARDWARE MODE
          </div>
        ) : (
          <div className="two-col-grid">
            {plots.map((plot) => (
              <div
                key={plot.key}
                style={{
                  backgroundColor: '#131614',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2px',
                }}
              >
                <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(32, 36, 32, 0.7)' }}>
                  <span className="mono" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                    {plot.title}
                  </span>
                </div>
                <div className="scope-grid-bg" style={{ height: '166px', padding: '8px 8px 4px 0' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={records}>
                      <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                      <XAxis dataKey="timeLabel" tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }} minTickGap={26} />
                      <YAxis tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }} width={42} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v} ${plot.unit}`, plot.title]} />
                      <Line type="monotone" dataKey={plot.key} stroke={plot.color} strokeWidth={1.7} dot={false} isAnimationActive={false} />
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
};
