import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, Search } from 'lucide-react';
import { DiagnosticEventCategory, SystemLogEntry } from '../../types/diagnostics';

interface SystemEventLogPanelProps {
  logs: SystemLogEntry[];
}

const LOG_CATEGORIES: ('ALL' | DiagnosticEventCategory)[] = [
  'ALL',
  'SYSTEM',
  'SENSOR',
  'TELEMETRY',
  'BMS',
  'COMMUNICATION',
  'DIAGNOSTICS',
  'ML',
];

export const SystemEventLogPanel: React.FC<SystemEventLogPanelProps> = ({ logs }) => {
  const [category, setCategory] = useState<'ALL' | DiagnosticEventCategory>('ALL');
  const [search, setSearch] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [pausedView, setPausedView] = useState<boolean>(false);
  const [frozenLogs, setFrozenLogs] = useState<SystemLogEntry[] | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLogs = pausedView && frozenLogs ? frozenLogs : logs;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeLogs.filter((entry) => {
      if (category !== 'ALL' && entry.category !== category) return false;
      if (
        q &&
        !entry.message.toLowerCase().includes(q) &&
        !entry.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activeLogs, category, search]);

  useEffect(() => {
    if (autoScroll && containerRef.current && !pausedView) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll, pausedView]);

  const togglePause = () => {
    if (pausedView) {
      setPausedView(false);
      setFrozenLogs(null);
    } else {
      setFrozenLogs(logs);
      setPausedView(true);
    }
  };

  const handleExportLogs = () => {
    const lines = filtered.map(
      (entry) =>
        `[${entry.timeLabel}] ${entry.category.padEnd(13, ' ')} ${entry.severity.padEnd(
          8,
          ' '
        )} ${entry.message}${entry.simulated ? ' (SIMULATED)' : ''}`
    );
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battvision_system_log_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bv-panel" aria-label="Technical system event log viewer">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              pausedView ? 'status-led--amber' : 'status-led--phosphor status-led--pulse'
            }`}
          />
          <h2 className="bv-panel-title">System Event Log // Bounded Console (Max 200)</h2>
          <span className="bv-badge bv-badge--amber">SIMULATED LOG ENTRIES</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`bv-btn ${autoScroll ? 'bv-btn--active' : ''}`}
            onClick={() => setAutoScroll((v) => !v)}
            style={{ padding: '4px 8px', fontSize: '9.5px' }}
          >
            Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`bv-btn ${pausedView ? 'bv-btn--amber' : ''}`}
            onClick={togglePause}
            style={{ padding: '4px 8px', fontSize: '9.5px' }}
          >
            {pausedView ? <Play size={11} /> : <Pause size={11} />}
            {pausedView ? 'Resume Log' : 'Pause Log'}
          </button>
          <button
            type="button"
            className="bv-btn"
            onClick={handleExportLogs}
            style={{ padding: '4px 8px', fontSize: '9.5px' }}
          >
            <Download size={11} />
            Export Logs
          </button>
        </div>
      </div>

      {/* Category & Search Bar */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 20, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {LOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`bv-btn ${category === cat ? 'bv-btn--active' : ''}`}
              style={{ padding: '3px 7px', fontSize: '9px' }}
            >
              {cat}
            </button>
          ))}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter log text..."
            aria-label="Search system logs"
            className="mono"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '10.5px',
              width: '150px',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Monospaced Terminal Viewport */}
      <div
        ref={containerRef}
        className="mono"
        style={{
          backgroundColor: '#111412',
          padding: '10px 14px',
          maxHeight: '220px',
          overflowY: 'auto',
          fontSize: '11px',
          lineHeight: 1.65,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>NO LOG ENTRIES MATCHING FILTER</div>
        ) : (
          filtered.map((entry) => {
            const catColor =
              entry.severity === 'CRITICAL'
                ? 'var(--warning-red)'
                : entry.severity === 'WARNING'
                ? 'var(--signal-amber)'
                : entry.severity === 'NORMAL'
                ? 'var(--phosphor-green)'
                : 'var(--warm-neutral)';
            return (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  [{entry.timeLabel}]
                </span>
                <span style={{ color: catColor, width: '102px', flexShrink: 0, fontWeight: 600 }}>
                  {entry.category}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
