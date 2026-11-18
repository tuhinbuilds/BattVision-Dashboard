import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  BatteryCell,
  DataSourceMode,
  SeriesGroup,
} from '../../types/telemetry';

interface PackExplorerVisualProps {
  seriesGroups: SeriesGroup[];
  selectedGroupId: string;
  selectedCellId: string | null;
  dataSourceMode: DataSourceMode;
  onSelectGroup: (groupId: string) => void;
  onSelectCell: (cell: BatteryCell | null) => void;
}

function statusAccent(status: SeriesGroup['measurement']['status']): string {
  switch (status) {
    case 'NOMINAL':
      return '#B8D65A';
    case 'ELEVATED':
      return '#E69A42';
    case 'LOW':
      return '#D75C4B';
    case 'UNAVAILABLE':
    default:
      return '#6E756A';
  }
}

export const PackExplorerVisual: React.FC<PackExplorerVisualProps> = ({
  seriesGroups,
  selectedGroupId,
  selectedCellId,
  dataSourceMode,
  onSelectGroup,
  onSelectCell,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    cell: BatteryCell;
    group: SeriesGroup;
  } | null>(null);

  const selectedCellEntry = (() => {
    if (!selectedCellId) return null;
    for (const grp of seriesGroups) {
      const found = grp.cells.find((c) => c.id === selectedCellId);
      if (found) return { cell: found, group: grp };
    }
    return null;
  })();

  const isDemo = dataSourceMode === 'DEMO';

  return (
    <section className="bv-panel" aria-label="Interactive 8S4P 32-cell battery pack CAD explorer">
      {/* Top CAD Toolbar */}
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              isDemo ? 'status-led--phosphor status-led--pulse' : 'status-led--offline'
            }`}
          />
          <h2 className="bv-panel-title">
            Interactive 8S4P Topology Explorer // 8 Series Groups × 4 Parallel 32700 Cells = 32 Cells
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            HOVER CELL FOR LIVE TOOLTIP · CLICK CELL OR GROUP HEADER TO INSPECT
          </span>
          <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {isDemo ? 'DEMO GROUP VOLTAGES' : 'HARDWARE OFFLINE'}
          </span>
        </div>
      </div>

      {/* Main Split: CAD Viewport + Optional Cell Inspection Drawer */}
      <div
        className={`pack-cad-split ${selectedCellEntry ? 'pack-cad-split--with-drawer' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: selectedCellEntry
            ? 'minmax(0, 1fr) 268px'
            : 'minmax(0, 1fr)',
          transition: 'grid-template-columns 180ms ease',
        }}
      >
        <style>{`
          @media (max-width: 1200px) {
            .pack-cad-split--with-drawer {
              grid-template-columns: minmax(0, 1fr) !important;
            }
            .cell-inspect-drawer {
              border-left: none !important;
              border-top: 1px solid var(--border-color) !important;
            }
          }
          .cad-8s-row {
            display: grid;
            grid-template-columns: 28px repeat(8, minmax(86px, 1fr)) 28px;
            align-items: stretch;
            gap: 0;
            min-width: 744px;
          }
          .cad-cell-btn {
            position: relative;
            width: 100%;
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 5px;
            background-color: #161A17;
            border: 1px solid #353B34;
            border-radius: 2px;
            text-align: left;
            transition: border-color 140ms ease, background-color 140ms ease;
          }
          .cad-cell-btn:hover {
            border-color: #B8D65A;
            background-color: #222822;
          }
          .cad-cell-btn--selected {
            border-color: #B8D65A !important;
            background-color: rgba(184, 214, 90, 0.12) !important;
            box-shadow: inset 0 0 0 1px rgba(184, 214, 90, 0.4);
          }
          .cad-cell-btn--group-active {
            border-color: #54624B;
            background-color: #1C221D;
          }
        `}</style>

        {/* Left: CAD Viewport */}
        <div
          className="scope-grid-bg"
          style={{
            padding: '14px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
            position: 'relative',
          }}
        >
          {/* Floating Live Hover Telemetry Strip inside CAD Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '7px 10px',
              backgroundColor: 'rgba(19, 22, 20, 0.88)',
              border: `1px solid ${
                hoveredCell ? 'var(--phosphor-green-border)' : 'var(--border-color)'
              }`,
              borderRadius: '2px',
              minHeight: '34px',
            }}
          >
            {hoveredCell ? (
              <div
                className="mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  fontSize: '10.5px',
                }}
              >
                <span style={{ color: 'var(--phosphor-green)', fontWeight: 600 }}>
                  CELL {hoveredCell.cell.id}
                </span>
                <span style={{ color: 'var(--warm-neutral)' }}>
                  GROUP {hoveredCell.group.id} (4P PARALLEL · 24 Ah)
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  FORMAT: 32700 · NOM 3.2 V / 6 Ah
                </span>
                <span style={{ color: 'var(--text-primary)' }}>
                  GROUP V:{' '}
                  <strong
                    style={{
                      color: hoveredCell.group.measurement.available
                        ? 'var(--phosphor-green)'
                        : 'var(--text-muted)',
                    }}
                  >
                    {hoveredCell.group.measurement.available &&
                    hoveredCell.group.measurement.voltageV !== null
                      ? `${hoveredCell.group.measurement.voltageV.toFixed(3)} V (SIM)`
                      : 'UNAVAILABLE'}
                  </strong>
                </span>
                <span style={{ color: 'var(--signal-amber)', fontSize: '9.5px' }}>
                  [INDIVIDUAL CELL V NOT METERED - PARALLEL NODE]
                </span>
              </div>
            ) : (
              <div
                className="mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: '12px',
                  flexWrap: 'wrap',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>
                  ELECTRICAL TOPOLOGY: <strong style={{ color: 'var(--warm-neutral)' }}>8 SERIES GROUPS (S1→S8)</strong> ·{' '}
                  EACH GROUP = <strong style={{ color: 'var(--warm-neutral)' }}>4 CELLS IN PARALLEL (4P · 3.2V · 24Ah)</strong>
                </span>
                <span style={{ color: 'var(--phosphor-green)' }}>
                  PACK STACK: 8 × 3.2 V = 25.6 V NOM · 24 Ah · 614.4 Wh
                </span>
              </div>
            )}
          </div>

          {/* Scroll-safe CAD Container for standard laptop/tablet screens */}
          <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            <div className="cad-8s-row">
              {/* Left Pack Terminal: B- */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  paddingRight: '4px',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '86px',
                    backgroundColor: '#1E231F',
                    border: '1px solid #92998D',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--warm-neutral)' }}
                  >
                    B−
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '8px',
                      color: 'var(--text-muted)',
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    0V REF
                  </span>
                </div>
                {/* Busbar lead into S1 */}
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    width: '8px',
                    height: '2px',
                    backgroundColor: '#92998D',
                  }}
                />
              </div>

              {/* 8 Series Groups (S1..S8) */}
              {seriesGroups.map((group, idx) => {
                const isGroupSelected = selectedGroupId === group.id;
                const isGroupHovered = hoveredCell?.group.id === group.id;
                const accent = statusAccent(group.measurement.status);
                const cumulativeNomV = ((idx + 1) * 3.2).toFixed(1);

                return (
                  <div
                    key={group.id}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      position: 'relative',
                      padding: '0 3px',
                    }}
                  >
                    {/* Series Inter-Group Bridge Connector (between S(n) and S(n+1)) */}
                    {idx < seriesGroups.length - 1 && (
                      <div
                        title={`Series link: ${group.id}+ → S${idx + 2}− (cumulative nominal ${cumulativeNomV} V)`}
                        style={{
                          position: 'absolute',
                          right: '-5px',
                          top: idx % 2 === 0 ? '26%' : '74%',
                          width: '10px',
                          height: '4px',
                          backgroundColor: isDemo ? '#6F7D56' : '#4E564C',
                          borderTop: '1px solid #B8D65A',
                          borderBottom: '1px solid #202420',
                          zIndex: 4,
                        }}
                      />
                    )}

                    {/* Series Group Enclosure Box */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor:
                          isGroupSelected || isGroupHovered
                            ? 'rgba(39, 46, 39, 0.92)'
                            : 'rgba(24, 28, 25, 0.88)',
                        border: `1px solid ${
                          isGroupSelected
                            ? 'var(--phosphor-green)'
                            : isGroupHovered
                            ? 'var(--phosphor-green-border)'
                            : 'var(--border-color)'
                        }`,
                        borderRadius: '2px',
                        overflow: 'hidden',
                        transition: 'border-color 150ms ease, background-color 150ms ease',
                      }}
                    >
                      {/* Group Header Button (Selects Series Group) */}
                      <button
                        type="button"
                        onClick={() => onSelectGroup(group.id)}
                        style={{
                          width: '100%',
                          padding: '6px 6px',
                          backgroundColor: isGroupSelected
                            ? 'rgba(184, 214, 90, 0.12)'
                            : 'rgba(19, 22, 20, 0.65)',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          textAlign: 'left',
                        }}
                        title={`Inspect Series Group ${group.id} (4 parallel 32700 cells, 3.2V nom / 24Ah)`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <span
                            className="mono"
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isGroupSelected
                                ? 'var(--phosphor-green)'
                                : 'var(--warm-neutral)',
                            }}
                          >
                            {group.id}
                          </span>
                          <span
                            className="mono"
                            style={{
                              fontSize: '8px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            4P·24Ah
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '2px',
                          }}
                        >
                          <span
                            className="mono"
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: group.measurement.available
                                ? accent
                                : 'var(--text-muted)',
                            }}
                          >
                            {group.measurement.available && group.measurement.voltageV !== null
                              ? `${group.measurement.voltageV.toFixed(3)}V`
                              : '-- V'}
                          </span>
                          <span
                            className="mono"
                            style={{ fontSize: '8.5px', color: 'var(--text-secondary)' }}
                          >
                            {group.measurement.available &&
                            group.measurement.deltaFromMeanMv !== null
                              ? `${group.measurement.deltaFromMeanMv >= 0 ? '+' : ''}${
                                  group.measurement.deltaFromMeanMv
                                }mV`
                              : 'N/A'}
                          </span>
                        </div>
                      </button>

                      {/* 4 Parallel Cells Container with Explicit Left (−) & Right (+) Parallel Collector Busbars */}
                      <div
                        style={{
                          position: 'relative',
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          flex: 1,
                        }}
                      >
                        {/* Vertical Left Parallel (−) Collector Busbar */}
                        <div
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            left: '4px',
                            top: '14px',
                            bottom: '14px',
                            width: '2px',
                            backgroundColor: isGroupSelected || isGroupHovered ? '#92998D' : '#434B41',
                          }}
                        />
                        {/* Vertical Right Parallel (+) Collector Busbar */}
                        <div
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            right: '4px',
                            top: '14px',
                            bottom: '14px',
                            width: '2px',
                            backgroundColor: isGroupSelected || isGroupHovered ? accent : '#4E5B42',
                          }}
                        />

                        {group.cells.map((cell) => {
                          const isCellSelected = selectedCellId === cell.id;
                          return (
                            <div
                              key={cell.id}
                              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                            >
                              {/* Left parallel branch stub (−) */}
                              <span
                                aria-hidden="true"
                                style={{
                                  position: 'absolute',
                                  left: '-5px',
                                  width: '6px',
                                  height: '1.5px',
                                  backgroundColor:
                                    isGroupSelected || isGroupHovered ? '#92998D' : '#434B41',
                                }}
                              />

                              <button
                                type="button"
                                className={`cad-cell-btn ${
                                  isCellSelected
                                    ? 'cad-cell-btn--selected'
                                    : isGroupSelected || isGroupHovered
                                    ? 'cad-cell-btn--group-active'
                                    : ''
                                }`}
                                onMouseEnter={() => setHoveredCell({ cell, group })}
                                onMouseLeave={() => setHoveredCell(null)}
                                onFocus={() => setHoveredCell({ cell, group })}
                                onBlur={() => setHoveredCell(null)}
                                onClick={() => {
                                  onSelectGroup(group.id);
                                  onSelectCell(cell);
                                }}
                                aria-label={`Cell ${cell.id}, Series Group ${group.id}, 32700 LiFePO4 3.2V nominal`}
                              >
                                {/* Machined 32700 Cylindrical Cell Icon */}
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  style={{ flexShrink: 0 }}
                                  aria-hidden="true"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    fill="#121513"
                                    stroke={isCellSelected ? '#B8D65A' : '#4E564C'}
                                    strokeWidth="1.3"
                                  />
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="6.2"
                                    fill="#1B201C"
                                    stroke={accent}
                                    strokeWidth="1.2"
                                    strokeOpacity={group.measurement.available ? 0.85 : 0.35}
                                  />
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="2.4"
                                    fill={accent}
                                    fillOpacity={group.measurement.available ? 0.95 : 0.4}
                                  />
                                </svg>

                                <div style={{ minWidth: 0, flex: 1, lineHeight: 1.15 }}>
                                  <div
                                    className="mono"
                                    style={{
                                      fontSize: '9.5px',
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                      color: isCellSelected
                                        ? 'var(--phosphor-green)'
                                        : 'var(--text-primary)',
                                    }}
                                  >
                                    {cell.id}
                                  </div>
                                  <div
                                    className="mono"
                                    style={{
                                      fontSize: '7.5px',
                                      color: 'var(--text-muted)',
                                      marginTop: '1px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    32700
                                  </div>
                                </div>
                              </button>

                              {/* Right parallel branch stub (+) */}
                              <span
                                aria-hidden="true"
                                style={{
                                  position: 'absolute',
                                  right: '-5px',
                                  width: '6px',
                                  height: '1.5px',
                                  backgroundColor:
                                    isGroupSelected || isGroupHovered ? accent : '#4E5B42',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Group Footer Topology Tag */}
                      <div
                        className="mono"
                        style={{
                          padding: '4px 6px',
                          borderTop: '1px solid var(--border-subtle)',
                          backgroundColor: 'rgba(15, 18, 16, 0.72)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '7.5px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>−4P+</span>
                        <span>Σ{cumulativeNomV}V</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Right Pack Terminal: B+ */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  paddingLeft: '4px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    width: '8px',
                    height: '2px',
                    backgroundColor: '#B8D65A',
                  }}
                />
                <div
                  style={{
                    width: '26px',
                    height: '86px',
                    backgroundColor: '#1E231F',
                    border: '1px solid #B8D65A',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: '12px', fontWeight: 700, color: 'var(--phosphor-green)' }}
                  >
                    B+
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '8px',
                      color: 'var(--warm-neutral)',
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    25.6V NOM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend Strip */}
          <div
            className="mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '9.5px',
              color: 'var(--text-secondary)',
              paddingTop: '4px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="status-led status-led--phosphor" />
                NOMINAL (DEMO)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="status-led status-led--amber" />
                ELEVATED
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="status-led status-led--red" />
                LOW / FAULT
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="status-led status-led--offline" />
                UNAVAILABLE
              </span>
            </div>
            <span>
              SERIES BRIDGE: S1+→S2−…→S8+ · PARALLEL RAILS: 4 CELLS TIED PER GROUP
            </span>
          </div>
        </div>

        {/* Right: Interactive Cell Inspection Drawer (Opens when a cell is clicked) */}
        {selectedCellEntry && (
          <aside
            className="cell-inspect-drawer"
            aria-label={`Cell ${selectedCellEntry.cell.id} inspection panel`}
            style={{
              borderLeft: '1px solid var(--border-color)',
              backgroundColor: '#1B1F1C',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '8px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '10px',
              }}
            >
              <div>
                <div className="micro-label" style={{ color: 'var(--phosphor-green)' }}>
                  CELL INSPECTOR
                </div>
                <div
                  className="mono"
                  style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}
                >
                  {selectedCellEntry.cell.id}
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  PARENT GROUP: {selectedCellEntry.group.id} · BRANCH {selectedCellEntry.cell.parallelIndex} OF 4
                </div>
              </div>
              <button
                type="button"
                className="bv-btn"
                onClick={() => onSelectCell(null)}
                aria-label="Close cell inspection panel"
                style={{ padding: '4px 6px' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Individual Cell Measurement Honesty Notice */}
            <div
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px dashed var(--signal-amber-border)',
                padding: '10px',
                borderRadius: '2px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--signal-amber)', fontWeight: 600 }}>
                INDIVIDUAL CELL VOLTAGE: UNAVAILABLE
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {selectedCellEntry.cell.measurement.note}
              </span>
            </div>

            {/* Parent Group Shared Node Measurement */}
            <div
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-color)',
                padding: '10px',
                borderRadius: '2px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="micro-label">SHARED {selectedCellEntry.group.id} NODE VOLTAGE</span>
                <span
                  className={`bv-badge ${
                    selectedCellEntry.group.measurement.available
                      ? 'bv-badge--amber'
                      : 'bv-badge--muted'
                  }`}
                >
                  {selectedCellEntry.group.measurement.available ? 'DEMO SIM' : 'OFFLINE'}
                </span>
              </div>
              <div className="mono" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedCellEntry.group.measurement.available &&
                selectedCellEntry.group.measurement.voltageV !== null
                  ? `${selectedCellEntry.group.measurement.voltageV.toFixed(3)} V`
                  : 'BMS DATA UNAVAILABLE'}
              </div>
              <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {selectedCellEntry.group.measurement.available &&
                selectedCellEntry.group.measurement.deltaFromMeanMv !== null
                  ? `Δ FROM PACK MEAN: ${
                      selectedCellEntry.group.measurement.deltaFromMeanMv >= 0 ? '+' : ''
                    }${selectedCellEntry.group.measurement.deltaFromMeanMv} mV`
                  : 'Awaiting JK Smart BMS B1A8S10P telemetry'}
              </div>
            </div>

            {/* Cell Nominal Specs */}
            <div
              className="mono"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '11px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px',
              }}
            >
              {[
                ['CELL IDENTIFIER', selectedCellEntry.cell.id],
                ['SERIES GROUP', `${selectedCellEntry.group.id} (4P Parallel)`],
                ['CHEMISTRY', 'LiFePO4'],
                ['CELL FORMAT', selectedCellEntry.cell.format],
                ['NOMINAL VOLTAGE', `${selectedCellEntry.cell.nominalVoltageV.toFixed(1)} V`],
                ['NOMINAL CAPACITY', `${selectedCellEntry.cell.nominalCapacityAh.toFixed(1)} Ah`],
                ['CELL ENERGY', '19.2 Wh'],
                ['DATA SOURCE', isDemo ? 'SIMULATION (DEMO)' : 'HARDWARE (OFFLINE)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: 'var(--warm-neutral)', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};
