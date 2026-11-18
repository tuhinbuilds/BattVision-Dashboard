import React from 'react';
import { SystemSubsystemStatus, SubsystemStatusKind } from '../types/telemetry';

interface SystemHealthPanelProps {
  subsystems: SystemSubsystemStatus[];
  onOpenConfig?: () => void;
}

function badgeClassForStatus(status: SubsystemStatusKind): string {
  switch (status) {
    case 'CONNECTED':
      return 'bv-badge--phosphor';
    case 'SIMULATED':
    case 'DEMO':
    case 'WARNING':
      return 'bv-badge--amber';
    case 'FAULT':
      return 'bv-badge--red';
    case 'NOT_CONNECTED':
    default:
      return 'bv-badge--muted';
  }
}

function ledClassForStatus(status: SubsystemStatusKind): string {
  switch (status) {
    case 'CONNECTED':
      return 'status-led--phosphor status-led--pulse';
    case 'SIMULATED':
    case 'DEMO':
    case 'WARNING':
      return 'status-led--amber';
    case 'FAULT':
      return 'status-led--red';
    case 'NOT_CONNECTED':
    default:
      return 'status-led--offline';
  }
}

function labelForStatus(status: SubsystemStatusKind): string {
  return status.replace('_', ' ');
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({
  subsystems,
  onOpenConfig,
}) => {
  const simulatedCount = subsystems.filter(
    (s) => s.status === 'SIMULATED' || s.status === 'DEMO'
  ).length;
  const offlineCount = subsystems.filter((s) => s.status === 'NOT_CONNECTED').length;

  return (
    <section className="bv-panel" aria-label="Hardware and subsystem health matrix">
      <div className="bv-panel-header">
        <div className="bv-panel-title-group">
          <span className="status-led status-led--amber" />
          <h2 className="bv-panel-title">System Health // Node Matrix</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {simulatedCount} SIM/DEMO · {offlineCount} OFFLINE
          </span>
          {onOpenConfig && (
            <button type="button" className="bv-btn" onClick={onOpenConfig}>
              Config
            </button>
          )}
        </div>
      </div>

      <div className="bv-panel-body" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {subsystems.map((sub, idx) => (
            <div
              key={sub.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 0',
                borderBottom:
                  idx < subsystems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {sub.name}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    [{sub.interfaceBus}]
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={`${sub.hardwareSpec} - ${sub.detail}`}
                >
                  {sub.hardwareSpec}
                </div>
              </div>

              <span className={`bv-badge ${badgeClassForStatus(sub.status)}`}>
                <span className={`status-led ${ledClassForStatus(sub.status)}`} />
                {labelForStatus(sub.status)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
