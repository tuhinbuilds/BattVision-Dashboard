import React, { useMemo, useState } from 'react';
import { EventSeverity, SystemEvent } from '../types/telemetry';

interface ActivityTimelineProps {
  events: SystemEvent[];
  maxVisible?: number;
}

type FilterMode = 'ALL' | 'WARNING' | 'SYSTEM';

function severityDot(severity: EventSeverity) {
  switch (severity) {
    case 'NOMINAL':
      return 'status-led--phosphor';
    case 'WARNING':
      return 'status-led--amber';
    case 'ALERT':
      return 'status-led--red';
    case 'INFO':
    default:
      return 'status-led--offline';
  }
}

function severityColor(severity: EventSeverity): string {
  switch (severity) {
    case 'NOMINAL':
      return 'var(--phosphor-green)';
    case 'WARNING':
      return 'var(--signal-amber)';
    case 'ALERT':
      return 'var(--warning-red)';
    case 'INFO':
    default:
      return 'var(--text-secondary)';
  }
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events,
  maxVisible = 8,
}) => {
  const [filter, setFilter] = useState<FilterMode>('ALL');

  const filtered = useMemo(() => {
    const base = events.filter((evt) => {
      if (filter === 'WARNING') return evt.severity === 'WARNING' || evt.severity === 'ALERT';
      if (filter === 'SYSTEM') return evt.subsystem === 'SYSTEM' || evt.subsystem === 'PACK SPEC';
      return true;
    });
    return base.slice(0, maxVisible);
  }, [events, filter, maxVisible]);

  return (
    <section className="bv-panel" aria-label="Recent simulated system activity">
      <div className="bv-panel-header">
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">Recent Activity // Event Log</h2>
          <span className="bv-badge bv-badge--amber">SIMULATED EVENTS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(['ALL', 'WARNING', 'SYSTEM'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`bv-btn ${filter === mode ? 'bv-btn--active' : ''}`}
              style={{ padding: '3px 7px', fontSize: '9.5px' }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div
        className="bv-panel-body"
        style={{
          padding: '10px 14px',
          maxHeight: '296px',
          overflowY: 'auto',
        }}
      >
        {filtered.length === 0 ? (
          <div
            className="mono"
            style={{
              padding: '20px 8px',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            NO SIMULATED EVENTS MATCHING FILTER
          </div>
        ) : (
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {filtered.map((evt, idx) => (
              <li
                key={evt.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '68px 66px minmax(0, 1fr)',
                  alignItems: 'baseline',
                  gap: '10px',
                  padding: '8px 0',
                  borderBottom:
                    idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}
                >
                  {evt.timeLabel}
                </span>

                <span
                  className="mono"
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: severityColor(evt.severity),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span className={`status-led ${severityDot(evt.severity)}`} />
                  {evt.code}
                </span>

                <div style={{ minWidth: 0 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '9.5px',
                      color: 'var(--warm-neutral)',
                      marginRight: '6px',
                      letterSpacing: '0.07em',
                    }}
                  >
                    [{evt.subsystem}]
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    {evt.message}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};
