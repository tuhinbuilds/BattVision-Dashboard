import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { EdgeSystemLogCategory, EdgeSystemLogEntry } from '../../types/edgeai';

interface EdgeSystemEventLogProps {
  logs: EdgeSystemLogEntry[];
}

const CATEGORIES: ('ALL' | EdgeSystemLogCategory)[] = [
  'ALL',
  'FIRMWARE',
  'SENSOR',
  'TELEMETRY',
  'COMMUNICATION',
  'EDGE PROCESSING',
  'DATABASE',
  'ML INFERENCE',
  'SYSTEM',
];

export const EdgeSystemEventLog: React.FC<EdgeSystemEventLogProps> = ({ logs }) => {
  const [cat, setCat] = useState<'ALL' | EdgeSystemLogCategory>('ALL');
  const [sev, setSev] = useState<'ALL' | 'INFO' | 'NORMAL' | 'WARNING'>('ALL');
  const [query, setQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (cat !== 'ALL' && entry.category !== cat) return false;
      if (sev !== 'ALL' && entry.severity !== sev) return false;
      if (
        q &&
        !entry.message.toLowerCase().includes(q) &&
        !entry.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [logs, cat, sev, query]);

  useEffect(() => {
    if (autoScroll && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const exportLog = () => {
    const text = filtered
      .map(
        (l) =>
          `[${l.timeLabel}] ${l.category.padEnd(15, ' ')} ${l.severity.padEnd(8, ' ')} ${l.message}`
      )
      .join('\n');
    const blob = new Blob([text + '\n'], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battvision_edge_system_log_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bv-panel" aria-label="Embedded and edge system event log">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor status-led--pulse" />
          <h2 className="bv-panel-title">Embedded &amp; Edge System Event Log</h2>
          <span className="bv-badge bv-badge--amber">SIMULATED LOGS</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
            className="bv-btn"
            onClick={exportLog}
            style={{ padding: '4px 8px', fontSize: '9.5px' }}
          >
            <Download size={11} /> Export Logs
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 20, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`bv-btn ${cat === c ? 'bv-btn--active' : ''}`}
              style={{ padding: '3px 6px', fontSize: '8.5px' }}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            aria-label="Filter edge logs by severity"
            value={sev}
            onChange={(e) => setSev(e.target.value as 'ALL' | 'INFO' | 'NORMAL' | 'WARNING')}
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              padding: '4px 7px',
              fontSize: '9.5px',
              color: 'var(--text-primary)',
            }}
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="INFO">INFO</option>
            <option value="NORMAL">NORMAL</option>
            <option value="WARNING">WARNING</option>
          </select>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              padding: '3px 7px',
            }}
          >
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search edge logs..."
              aria-label="Search edge system logs"
              className="mono"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '10px',
                width: '140px',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      <div
        ref={boxRef}
        className="mono"
        style={{
          backgroundColor: '#111412',
          padding: '10px 14px',
          maxHeight: '215px',
          overflowY: 'auto',
          fontSize: '11px',
          lineHeight: 1.65,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>NO EDGE SYSTEM LOGS MATCHING FILTER</div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} style={{ display: 'flex', gap: '10px', whiteSpace: 'pre-wrap' }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{entry.timeLabel}]</span>
              <span
                style={{
                  width: '124px',
                  flexShrink: 0,
                  fontWeight: 600,
                  color:
                    entry.severity === 'WARNING'
                      ? 'var(--signal-amber)'
                      : entry.severity === 'NORMAL'
                      ? 'var(--phosphor-green)'
                      : 'var(--warm-neutral)',
                }}
              >
                {entry.category}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
