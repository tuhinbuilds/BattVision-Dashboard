import React from 'react';
import { DataSourceMode, SeriesGroup } from '../../types/telemetry';

interface CellGroupConsistencyPanelProps {
  seriesGroups: SeriesGroup[];
  selectedGroupId: string;
  dataSourceMode: DataSourceMode;
  onSelectGroup: (groupId: string) => void;
}

export const CellGroupConsistencyPanel: React.FC<CellGroupConsistencyPanelProps> = ({
  seriesGroups,
  selectedGroupId,
  dataSourceMode,
  onSelectGroup,
}) => {
  const measuredGroups = seriesGroups.filter(
    (g) => g.measurement.available && g.measurement.voltageV !== null
  );
  const hasGroupData = measuredGroups.length === 8;

  if (!hasGroupData) {
    return (
      <section className="bv-panel" aria-label="Cell group consistency monitor">
        <div className="bv-panel-header">
          <div className="bv-panel-title-group">
            <span className="status-led status-led--offline" />
            <h2 className="bv-panel-title">CELL GROUP CONSISTENCY</h2>
          </div>
          <span className="bv-badge bv-badge--muted">DATA UNAVAILABLE</span>
        </div>

        <div className="bv-panel-body">
          <div
            className="scope-grid-bg"
            style={{
              border: '1px dashed var(--border-strong)',
              borderRadius: '2px',
              padding: '38px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--signal-amber)',
              }}
            >
              BMS GROUP DATA UNAVAILABLE
            </span>
            <p
              style={{
                margin: 0,
                maxWidth: '460px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              No live S1–S8 group voltage frames have been received from the JK Smart BMS
              (B1A8S10P). Group voltage spread and balance status are intentionally withheld in
              HARDWARE mode until valid BMS telemetry is connected.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const voltages = measuredGroups.map((g) => g.measurement.voltageV as number);
  const minV = Math.min(...voltages);
  const maxV = Math.max(...voltages);
  const meanV = voltages.reduce((a, b) => a + b, 0) / voltages.length;
  const spreadMv = Math.round((maxV - minV) * 1000);
  const highestGroup = measuredGroups.find((g) => g.measurement.voltageV === maxV);
  const lowestGroup = measuredGroups.find((g) => g.measurement.voltageV === minV);

  // Dynamic zoomed Y axis around mean so small mV differences are clearly visible
  const yMin = Math.max(2.5, Number((minV - 0.04).toFixed(2)));
  const yMax = Math.min(3.65, Number((maxV + 0.04).toFixed(2)));
  const yRange = yMax - yMin || 0.1;

  const chartH = 148;
  const padTop = 18;
  const padBottom = 26;
  const plotH = chartH - padTop - padBottom;
  const meanY = padTop + (1 - (meanV - yMin) / yRange) * plotH;

  return (
    <section className="bv-panel" aria-label="Cell group consistency comparison">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">CELL GROUP CONSISTENCY</h2>
          <span className="bv-badge bv-badge--amber">
            {dataSourceMode === 'DEMO' ? 'SIMULATED BMS TAPS' : 'LIVE BMS'}
          </span>
        </div>

        <span className="mono" style={{ fontSize: '10.5px', color: 'var(--warm-neutral)' }}>
          SPREAD ΔV:{' '}
          <strong style={{ color: 'var(--phosphor-green)' }}>{spreadMv} mV</strong>
        </span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Summary Metrics Row */}
        <div className="four-col-grid">
          {[
            { label: 'Mean Group V', value: `${meanV.toFixed(3)} V` },
            { label: 'Spread (ΔV)', value: `${spreadMv} mV` },
            {
              label: 'Max / Min Group',
              value: `${highestGroup?.id ?? '—'} / ${lowestGroup?.id ?? '—'}`,
            },
            {
              label: 'Balance Status',
              value: 'UNVALIDATED (BMS OFFLINE)',
              muted: true,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 10px',
                borderRadius: '2px',
              }}
            >
              <div className="micro-label" style={{ fontSize: '8.5px' }}>
                {stat.label}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: stat.muted ? '10px' : '13px',
                  fontWeight: 600,
                  marginTop: '3px',
                  color: stat.muted ? 'var(--signal-amber)' : 'var(--text-primary)',
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* 8-Group Precision SVG Bar Comparison Graph */}
        <div
          className="scope-grid-bg"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '2px',
            padding: '10px 8px 6px',
          }}
        >
          <svg
            viewBox={`0 0 640 ${chartH}`}
            width="100%"
            style={{ display: 'block', height: 'auto', maxHeight: '165px' }}
            role="img"
            aria-label="8-group series voltage comparison bar graph for S1 through S8"
          >
            {/* Y-Axis Scale Labels */}
            <text
              x="6"
              y={padTop + 4}
              fill="#6E756A"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="8.5"
            >
              {yMax.toFixed(2)}V
            </text>
            <text
              x="6"
              y={padTop + plotH}
              fill="#6E756A"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="8.5"
            >
              {yMin.toFixed(2)}V
            </text>

            {/* Mean Dashed Reference Line */}
            <line
              x1="48"
              y1={meanY}
              x2="626"
              y2={meanY}
              stroke="#D6D2C5"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.65"
            />
            <text
              x="626"
              y={meanY - 4}
              textAnchor="end"
              fill="#D6D2C5"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="8"
            >
              MEAN {meanV.toFixed(3)}V
            </text>

            {/* 8 Group Bars */}
            {measuredGroups.map((group, idx) => {
              const v = group.measurement.voltageV as number;
              const barSlotW = 70;
              const barW = 36;
              const x = 62 + idx * barSlotW;
              const topY = padTop + (1 - (v - yMin) / yRange) * plotH;
              const barH = Math.max(4, padTop + plotH - topY);
              const isSelected = group.id === selectedGroupId;

              return (
                <g
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Bar background well */}
                  <rect
                    x={x}
                    y={padTop}
                    width={barW}
                    height={plotH}
                    fill="rgba(16, 19, 17, 0.5)"
                    stroke={isSelected ? '#B8D65A' : '#2E342D'}
                    strokeWidth={isSelected ? '1.2' : '0.8'}
                  />
                  {/* Measured bar */}
                  <rect
                    x={x + 2}
                    y={topY}
                    width={barW - 4}
                    height={Math.max(2, barH - 1)}
                    fill={isSelected ? '#B8D65A' : '#7E9844'}
                    opacity={isSelected ? 0.95 : 0.78}
                  />
                  {/* Value above bar */}
                  <text
                    x={x + barW / 2}
                    y={Math.max(11, topY - 4)}
                    textAnchor="middle"
                    fill={isSelected ? '#F0F0E8' : '#D6D2C5'}
                    fontFamily="IBM Plex Mono, monospace"
                    fontSize="8.5"
                    fontWeight={isSelected ? '600' : '400'}
                  >
                    {v.toFixed(2)}
                  </text>
                  {/* Group ID Label */}
                  <text
                    x={x + barW / 2}
                    y={chartH - 7}
                    textAnchor="middle"
                    fill={isSelected ? '#B8D65A' : '#92998D'}
                    fontFamily="IBM Plex Mono, monospace"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {group.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Honest Availability Note */}
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
          <span>CLICK ANY BAR TO HIGHLIGHT SERIES GROUP IN 8S4P EXPLORER</span>
          <span>BALANCE VERDICT WITHHELD UNTIL JK BMS B1A8S10P CONNECTED</span>
        </div>
      </div>
    </section>
  );
};
