import React from 'react';
import { BatteryCell, DataSourceMode, SeriesGroup } from '../../types/telemetry';

interface SeriesGroupInspectorProps {
  seriesGroups: SeriesGroup[];
  selectedGroupId: string;
  selectedCellId: string | null;
  dataSourceMode: DataSourceMode;
  onSelectGroup: (groupId: string) => void;
  onSelectCell: (cell: BatteryCell) => void;
}

export const SeriesGroupInspector: React.FC<SeriesGroupInspectorProps> = ({
  seriesGroups,
  selectedGroupId,
  selectedCellId,
  dataSourceMode,
  onSelectGroup,
  onSelectCell,
}) => {
  const activeGroup =
    seriesGroups.find((g) => g.id === selectedGroupId) ?? seriesGroups[0];
  const isDemo = dataSourceMode === 'DEMO';

  return (
    <section className="bv-panel" aria-label="Series group S1 through S8 inspection">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              activeGroup.measurement.available ? 'status-led--phosphor' : 'status-led--offline'
            }`}
          />
          <h2 className="bv-panel-title">Series Group Inspection // S1 - S8</h2>
        </div>

        <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
          {isDemo ? 'SIMULATED GROUP NODES' : 'BMS OFFLINE'}
        </span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* S1..S8 Selectable Group Strip */}
        <div
          role="tablist"
          aria-label="Select series group S1 through S8"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
            gap: '6px',
          }}
          className="group-selector-grid"
        >
          <style>{`
            @media (max-width: 780px) {
              .group-selector-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
            }
          `}</style>
          {seriesGroups.map((group) => {
            const active = group.id === activeGroup.id;
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectGroup(group.id)}
                style={{
                  padding: '8px 6px',
                  backgroundColor: active ? 'rgba(184, 214, 90, 0.12)' : 'var(--bg-recessed)',
                  border: `1px solid ${
                    active ? 'var(--phosphor-green)' : 'var(--border-color)'
                  }`,
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'border-color 140ms ease, background-color 140ms ease',
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: active ? 'var(--phosphor-green)' : 'var(--warm-neutral)',
                  }}
                >
                  {group.id}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '10.5px',
                    color: group.measurement.available
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                  }}
                >
                  {group.measurement.available && group.measurement.voltageV !== null
                    ? `${group.measurement.voltageV.toFixed(2)}V`
                    : '--'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Group Engineering Detail Grid */}
        <div
          style={{
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-color)',
            borderRadius: '2px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '8px',
            }}
          >
            <div>
              <span className="micro-label">ACTIVE SERIES GROUP</span>
              <div
                className="mono"
                style={{ fontSize: '16px', fontWeight: 700, color: 'var(--phosphor-green)' }}
              >
                GROUP {activeGroup.id} · 4P PARALLEL MODULE
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className={`bv-badge ${
                  activeGroup.measurement.status === 'NOMINAL'
                    ? 'bv-badge--phosphor'
                    : activeGroup.measurement.status === 'ELEVATED'
                    ? 'bv-badge--amber'
                    : activeGroup.measurement.status === 'LOW'
                    ? 'bv-badge--red'
                    : 'bv-badge--muted'
                }`}
              >
                STATUS: {activeGroup.measurement.status}
              </span>
              <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                SOURCE: {activeGroup.measurement.dataSource}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '10px',
            }}
            className="group-detail-stats"
          >
            <style>{`
              @media (max-width: 780px) {
                .group-detail-stats {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                }
              }
            `}</style>
            {[
              { label: 'Group ID', value: activeGroup.id },
              { label: 'Parallel Cells', value: `${activeGroup.parallelCellCount} × 32700` },
              { label: 'Nominal Voltage', value: `${activeGroup.nominalVoltageV.toFixed(1)} V` },
              { label: 'Nominal Capacity', value: `${activeGroup.nominalCapacityAh.toFixed(0)} Ah` },
              {
                label: 'Measured Group V',
                value:
                  activeGroup.measurement.available &&
                  activeGroup.measurement.voltageV !== null
                    ? `${activeGroup.measurement.voltageV.toFixed(3)} V`
                    : 'UNAVAILABLE',
                accent: activeGroup.measurement.available,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '2px',
                }}
              >
                <div className="micro-label" style={{ fontSize: '9px' }}>
                  {stat.label}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    marginTop: '3px',
                    color: stat.accent ? 'var(--phosphor-green)' : 'var(--text-primary)',
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Clickable 4 Parallel Cells belonging to this group */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <span className="micro-label">PARALLEL CELL MEMBERS (CLICK TO INSPECT CELL)</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {activeGroup.cells.map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => onSelectCell(cell)}
                  className={`bv-btn ${selectedCellId === cell.id ? 'bv-btn--active' : ''}`}
                  style={{ padding: '4px 9px', fontSize: '10.5px' }}
                >
                  {cell.id} · 32700
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
