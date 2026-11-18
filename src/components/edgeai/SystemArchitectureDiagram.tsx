import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import {
  ArchitectureBlock,
  ArchitectureLayerId,
  EdgeBlockStatus,
} from '../../types/edgeai';
import { DataSourceMode } from '../../types/telemetry';

interface SystemArchitectureDiagramProps {
  blocks: ArchitectureBlock[];
  selectedBlockId: string | null;
  dataSourceMode: DataSourceMode;
  onSelectBlock: (id: string | null) => void;
}

const LAYERS: { id: ArchitectureLayerId; num: string; title: string; subtitle: string }[] = [
  { id: 'sensing', num: 'L1', title: 'BATTERY & SENSING', subtitle: '8S4P Pack · BMS · Sensors' },
  { id: 'embedded', num: 'L2', title: 'EMBEDDED ACQUISITION', subtitle: 'ESP32-S3 · Conditioning' },
  { id: 'edge', num: 'L3', title: 'EDGE COMPUTING', subtitle: 'Linux SBC · Python · ML · DB' },
  { id: 'application', num: 'L4', title: 'OFFLINE APPLICATION', subtitle: 'Dashboard · Prognostics' },
];

export function edgeStatusBadge(status: EdgeBlockStatus) {
  switch (status) {
    case 'CONNECTED':
      return <span className="bv-badge bv-badge--phosphor">CONNECTED</span>;
    case 'SIMULATED':
      return <span className="bv-badge bv-badge--amber">SIMULATED</span>;
    case 'FAULT':
      return <span className="bv-badge bv-badge--red">FAULT</span>;
    case 'NOT_CONFIGURED':
      return <span className="bv-badge bv-badge--muted">NOT CONFIGURED</span>;
    case 'NOT_CONNECTED':
      return <span className="bv-badge bv-badge--muted">NOT CONNECTED</span>;
    case 'UNKNOWN':
    default:
      return <span className="bv-badge bv-badge--muted">UNKNOWN</span>;
  }
}

function statusDotColor(status: EdgeBlockStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'var(--phosphor-green)';
    case 'SIMULATED':
      return 'var(--signal-amber)';
    case 'FAULT':
      return 'var(--warning-red)';
    default:
      return 'var(--text-muted)';
  }
}

export const SystemArchitectureDiagram: React.FC<SystemArchitectureDiagramProps> = ({
  blocks,
  selectedBlockId,
  dataSourceMode,
  onSelectBlock,
}) => {
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;
  const isDemo = dataSourceMode === 'DEMO';

  return (
    <section className="bv-panel" aria-label="Interactive BattVision 4-layer system architecture">
      <style>{`
        @keyframes bv-arch-flow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .bv-arch-signal-active {
          animation: bv-arch-flow 1.8s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .bv-arch-signal-active {
            animation: none !important;
          }
        }
        .arch-layers-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 22px minmax(0, 1fr) 22px minmax(0, 1.12fr) 22px minmax(0, 0.92fr);
          gap: 0;
          align-items: stretch;
        }
        @media (max-width: 1200px) {
          .arch-layers-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .arch-connector-col {
            display: none !important;
          }
        }
        @media (max-width: 680px) {
          .arch-layers-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              isDemo ? 'status-led--phosphor status-led--pulse' : 'status-led--offline'
            }`}
          />
          <h2 className="bv-panel-title">
            System Architecture Visualiser // 4-Layer Offline Edge Topology
          </h2>
          <span className="bv-badge bv-badge--muted">CLICK ANY BLOCK TO INSPECT</span>
        </div>

        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
          DATA FLOW: SENSING → ESP32-S3 → LINUX SBC (OFFLINE) → DASHBOARD
        </span>
      </div>

      {/* Main Split: 4-Layer Interactive Schematic + Component Inspector Drawer */}
      <div
        className={`arch-split ${selectedBlock ? 'arch-split--open' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: selectedBlock ? 'minmax(0, 1fr) 316px' : 'minmax(0, 1fr)',
        }}
      >
        <style>{`
          @media (max-width: 1120px) {
            .arch-split--open {
              grid-template-columns: minmax(0, 1fr) !important;
            }
            .arch-inspector-drawer {
              border-left: none !important;
              border-top: 1px solid var(--border-color) !important;
            }
          }
        `}</style>

        {/* Left: 4-Layer Interactive Diagram */}
        <div className="scope-grid-bg" style={{ padding: '14px', minWidth: 0 }}>
          <div className="arch-layers-grid">
            {LAYERS.map((layer, layerIdx) => {
              const layerBlocks = blocks.filter((b) => b.layer === layer.id);
              return (
                <React.Fragment key={layer.id}>
                  <div
                    style={{
                      backgroundColor: 'rgba(23, 26, 24, 0.84)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Layer Column Header */}
                    <div
                      style={{
                        padding: '8px 9px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(32, 36, 32, 0.85)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--phosphor-green)' }}>
                          {layer.num} · {layer.title}
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: '8.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {layer.subtitle}
                      </div>
                    </div>

                    {/* Selectable Blocks inside Layer */}
                    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
                      {layerBlocks.map((blk) => {
                        const isSelected = blk.id === selectedBlockId;
                        const dotColor = statusDotColor(blk.status);
                        return (
                          <button
                            key={blk.id}
                            type="button"
                            onClick={() => onSelectBlock(blk.id)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 9px',
                              backgroundColor: isSelected
                                ? 'rgba(184, 214, 90, 0.11)'
                                : '#171B18',
                              border: `1px solid ${
                                isSelected ? 'var(--phosphor-green)' : 'var(--border-subtle)'
                              }`,
                              borderRadius: '2px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              transition: 'border-color 140ms ease, background-color 140ms ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: isSelected ? 'var(--phosphor-green)' : 'var(--text-primary)',
                                  lineHeight: 1.25,
                                }}
                              >
                                {blk.name}
                              </span>
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '1px',
                                  backgroundColor: dotColor,
                                  flexShrink: 0,
                                  marginTop: '3px',
                                }}
                              />
                            </div>
                            <div
                              className="mono"
                              style={{
                                fontSize: '8.5px',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '4px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span>{blk.shortTag}</span>
                              <span style={{ color: dotColor }}>{blk.status.replace('_', ' ')}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Animated Directional Flow Connector between Layers */}
                  {layerIdx < LAYERS.length - 1 && (
                    <div
                      className="arch-connector-col"
                      aria-hidden="true"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '26px',
                      }}
                    >
                      {[0, 1].map((idx) => (
                        <svg key={idx} width="22" height="16" viewBox="0 0 22 16">
                          <line x1="0" y1="8" x2="17" y2="8" stroke="#3B4139" strokeWidth="2.5" />
                          <line
                            x1="0"
                            y1="8"
                            x2="17"
                            y2="8"
                            stroke={isDemo ? '#B8D65A' : '#4E564C'}
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                            className={isDemo ? 'bv-arch-signal-active' : undefined}
                          />
                          <polygon
                            points="15,4 21,8 15,12"
                            fill={isDemo ? '#B8D65A' : '#4E564C'}
                          />
                        </svg>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Safety Architecture Boundary Note */}
          <div
            className="mono"
            style={{
              marginTop: '10px',
              padding: '7px 10px',
              backgroundColor: 'rgba(19, 22, 20, 0.85)',
              border: '1px solid var(--border-subtle)',
              borderLeft: '2px solid var(--signal-amber)',
              fontSize: '9.5px',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span>
              SAFETY BOUNDARY: ESP32-S3 &amp; Linux SBC provide offline diagnostics/prognostics only - JK Smart BMS remains the independent hardware safety layer.
            </span>
            <span style={{ color: 'var(--phosphor-green)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              ZERO CLOUD DEPENDENCY <ArrowRight size={10} /> LOCAL EXECUTION
            </span>
          </div>
        </div>

        {/* Right: Component Inspection Drawer */}
        {selectedBlock && (
          <aside
            className="arch-inspector-drawer"
            aria-label={`Architecture block inspector for ${selectedBlock.name}`}
            style={{
              borderLeft: '1px solid var(--border-color)',
              backgroundColor: '#1B1F1C',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '11px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <div className="micro-label" style={{ color: 'var(--phosphor-green)' }}>
                  COMPONENT INSPECTOR
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '3px', color: 'var(--text-primary)' }}>
                  {selectedBlock.name}
                </div>
                <div style={{ marginTop: '6px' }}>{edgeStatusBadge(selectedBlock.status)}</div>
              </div>
              <button
                type="button"
                className="bv-btn"
                onClick={() => onSelectBlock(null)}
                aria-label="Close component inspector"
                style={{ padding: '4px 6px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="micro-label">FUNCTIONAL RESPONSIBILITY</span>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {selectedBlock.responsibility}
              </p>
            </div>

            <div
              className="mono"
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                padding: '10px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '8.5px' }}>INPUTS</div>
                <div style={{ color: 'var(--warm-neutral)' }}>{selectedBlock.inputs}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '8.5px' }}>OUTPUTS</div>
                <div style={{ color: 'var(--warm-neutral)' }}>{selectedBlock.outputs}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '8.5px' }}>COMMUNICATION INTERFACE</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedBlock.interfaceLabel}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '8.5px' }}>DATA SOURCE</div>
                <div style={{ color: 'var(--signal-amber)' }}>{selectedBlock.dataSource}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '8.5px' }}>INTEGRATION STATE</div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {selectedBlock.integrationState}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};
