import React, { useState } from 'react';
import { PipelineStageState, TelemetryPipelineStage } from '../../types/edgeai';
import { DataSourceMode } from '../../types/telemetry';

interface TelemetryPipelineMonitorProps {
  stages: TelemetryPipelineStage[];
  dataSourceMode: DataSourceMode;
}

function stageBadge(status: PipelineStageState) {
  switch (status) {
    case 'ACTIVE':
      return <span className="bv-badge bv-badge--phosphor">ACTIVE</span>;
    case 'SIMULATED':
      return <span className="bv-badge bv-badge--amber">SIMULATED</span>;
    case 'WAITING_FOR_CONNECTION':
      return <span className="bv-badge bv-badge--muted">WAITING FOR CONNECTION</span>;
    case 'FAULT':
      return <span className="bv-badge bv-badge--red">FAULT</span>;
    case 'NOT_IMPLEMENTED':
    default:
      return <span className="bv-badge bv-badge--muted">NOT IMPLEMENTED</span>;
  }
}

export const TelemetryPipelineMonitor: React.FC<TelemetryPipelineMonitorProps> = ({
  stages,
  dataSourceMode,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id ?? 'pipe-1');
  const selected = stages.find((s) => s.id === selectedStageId) ?? stages[0];
  const isDemo = dataSourceMode === 'DEMO';

  return (
    <section className="bv-panel" aria-label="9-stage telemetry processing pipeline monitor">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              isDemo ? 'status-led--phosphor status-led--pulse' : 'status-led--offline'
            }`}
          />
          <h2 className="bv-panel-title">TELEMETRY PROCESSING PIPELINE // 9-Stage Flow</h2>
        </div>
        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
          CLICK ANY STAGE TO INSPECT THROUGHPUT &amp; LATENCY
        </span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 9 Selectable Pipeline Stage Cards */}
        <div
          className="pipeline-9-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
            gap: '6px',
          }}
        >
          <style>{`
            @media (max-width: 1280px) {
              .pipeline-9-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              }
            }
            @media (max-width: 640px) {
              .pipeline-9-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
          `}</style>
          {stages.map((st) => {
            const active = st.id === selected.id;
            const dotClass =
              st.status === 'ACTIVE'
                ? 'status-led--phosphor'
                : st.status === 'SIMULATED'
                ? 'status-led--amber status-led--pulse'
                : 'status-led--offline';
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStageId(st.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  backgroundColor: active ? 'rgba(184, 214, 90, 0.1)' : 'var(--bg-recessed)',
                  border: `1px solid ${active ? 'var(--phosphor-green)' : 'var(--border-subtle)'}`,
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    {st.order}
                  </span>
                  <span className={`status-led ${dotClass}`} />
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: active ? 'var(--phosphor-green)' : 'var(--text-primary)', lineHeight: 1.25 }}>
                  {st.name}
                </div>
                <div className="mono" style={{ fontSize: '8.5px', color: 'var(--text-secondary)' }}>
                  {st.latencyMs !== null ? `${st.latencyMs} ms` : st.status === 'NOT_IMPLEMENTED' ? 'NOT IMPL' : 'WAITING'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Inspector Bar */}
        {selected && (
          <div
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              padding: '11px 13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span className="mono" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--phosphor-green)' }}>
                  STAGE {selected.order} // {selected.name.toUpperCase()}
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                  {selected.description}
                </span>
              </div>
              {stageBadge(selected.status)}
            </div>

            <div className="mono" style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '10.5px', borderTop: '1px solid var(--border-subtle)', paddingTop: '7px' }}>
              <span><span style={{ color: 'var(--text-muted)' }}>INPUT RECORDS:</span> <strong>{selected.inputRecords ?? 'N/A'}</strong></span>
              <span><span style={{ color: 'var(--text-muted)' }}>OUTPUT RECORDS:</span> <strong>{selected.outputRecords ?? 'N/A'}</strong></span>
              <span><span style={{ color: 'var(--text-muted)' }}>LAST PROCESSED:</span> <strong>{selected.lastProcessed}</strong></span>
              <span><span style={{ color: 'var(--text-muted)' }}>ERRORS:</span> <strong>{selected.errorCount ?? 'N/A'}</strong></span>
              <span><span style={{ color: 'var(--text-muted)' }}>LATENCY:</span> <strong>{selected.latencyMs !== null ? `${selected.latencyMs} ms (SIM)` : 'N/A'}</strong></span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
