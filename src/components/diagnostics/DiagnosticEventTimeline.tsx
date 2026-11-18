import React, { useMemo, useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import {
  DiagnosticEvent,
  DiagnosticEventCategory,
  DiagnosticSeverity,
} from '../../types/diagnostics';
import { SeverityPill } from './DiagnosticStatusOverview';

interface DiagnosticEventTimelineProps {
  events: DiagnosticEvent[];
  onExportCsv: (visibleEvents: DiagnosticEvent[]) => void;
  onClearDemoHistory: () => void;
}

type TimeRangeFilter = 'ALL' | '60' | '300';

const CATEGORIES: ('ALL' | DiagnosticEventCategory)[] = [
  'ALL',
  'SYSTEM',
  'SENSOR',
  'TELEMETRY',
  'BMS',
  'COMMUNICATION',
  'DIAGNOSTICS',
  'ML',
];

export const DiagnosticEventTimeline: React.FC<DiagnosticEventTimelineProps> = ({
  events,
  onExportCsv,
  onClearDemoHistory,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | DiagnosticEventCategory>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | DiagnosticSeverity>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = searchQuery.trim().toLowerCase();
    return events.filter((evt) => {
      if (categoryFilter !== 'ALL' && evt.category !== categoryFilter) return false;
      if (severityFilter !== 'ALL' && evt.severity !== severityFilter) return false;
      if (timeRange !== 'ALL') {
        const windowMs = Number(timeRange) * 1000;
        if (now - evt.epochMs > windowMs) return false;
      }
      if (
        q &&
        !evt.id.toLowerCase().includes(q) &&
        !evt.title.toLowerCase().includes(q) &&
        !evt.description.toLowerCase().includes(q) &&
        !evt.source.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [events, categoryFilter, severityFilter, timeRange, searchQuery]);

  return (
    <section className="bv-panel" aria-label="Chronological diagnostic event timeline">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">Diagnostic Event Timeline // Chronological Recorder</h2>
          <span className="bv-badge bv-badge--muted">{filtered.length} EVENTS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bv-btn bv-btn--active"
            onClick={() => onExportCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={12} />
            Export Events CSV
          </button>
          <button type="button" className="bv-btn" onClick={onClearDemoHistory}>
            <Trash2 size={12} />
            Clear Demo History
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 20, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <select
            aria-label="Filter timeline by event category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | DiagnosticEventCategory)}
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '4px 8px',
              fontSize: '10px',
              color: 'var(--text-primary)',
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'ALL CATEGORIES' : c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter timeline by severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | DiagnosticSeverity)}
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '4px 8px',
              fontSize: '10px',
              color: 'var(--text-primary)',
            }}
          >
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO', 'NORMAL'] as const).map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'ALL SEVERITIES' : s}
              </option>
            ))}
          </select>

          <div style={{ display: 'inline-flex', gap: '3px' }}>
            {(
              [
                ['ALL', 'ALL TIME'],
                ['60', '1 MIN'],
                ['300', '5 MIN'],
              ] as [TimeRangeFilter, string][]
            ).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTimeRange(val)}
                className={`bv-btn ${timeRange === val ? 'bv-btn--active' : ''}`}
                style={{ padding: '4px 7px', fontSize: '9.5px' }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-color)',
            borderRadius: '2px',
            padding: '4px 8px',
          }}
        >
          <Search size={12} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event ID or text..."
            aria-label="Search timeline events by ID or keyword"
            className="mono"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '10.5px',
              width: '165px',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Vertical Technical Timeline */}
      <div className="bv-panel-body" style={{ maxHeight: '340px', overflowY: 'auto', padding: '12px 14px' }}>
        {filtered.length === 0 ? (
          <div className="mono" style={{ textAlign: 'center', padding: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
            NO EVENTS MATCHING TIMELINE FILTERS
          </div>
        ) : (
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '0 0 0 14px',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {filtered.map((evt) => {
              const isExpanded = expandedEventId === evt.id;
              return (
                <li key={evt.id} style={{ position: 'relative' }}>
                  {/* Timeline Node Marker */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '-18px',
                      top: '11px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '1px',
                      backgroundColor:
                        evt.severity === 'CRITICAL'
                          ? 'var(--warning-red)'
                          : evt.severity === 'WARNING'
                          ? 'var(--signal-amber)'
                          : evt.severity === 'NORMAL'
                          ? 'var(--phosphor-green)'
                          : 'var(--text-secondary)',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      backgroundColor: isExpanded ? 'var(--bg-panel-hover)' : 'var(--bg-recessed)',
                      border: `1px solid ${
                        isExpanded ? 'var(--border-strong)' : 'var(--border-subtle)'
                      }`,
                      borderRadius: '2px',
                      padding: '8px 11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {evt.timeLabel}
                        </span>
                        <span className="mono" style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                          {evt.id}
                        </span>
                        <span className="bv-badge bv-badge--muted" style={{ fontSize: '8.5px', padding: '1px 5px' }}>
                          {evt.category}
                        </span>
                        <SeverityPill severity={evt.severity} />
                      </div>

                      <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                        SRC: {evt.source} {evt.simulated ? '· SIM' : ''}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {evt.title} - <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{evt.description}</span>
                    </div>

                    {isExpanded && (
                      <div
                        className="mono"
                        style={{
                          marginTop: '4px',
                          paddingTop: '6px',
                          borderTop: '1px dashed var(--border-color)',
                          fontSize: '10px',
                          color: 'var(--warm-neutral)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                      >
                        <span>DETAIL: {evt.supportingDetail}</span>
                        <span>ISO: {evt.timestamp}</span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
};
