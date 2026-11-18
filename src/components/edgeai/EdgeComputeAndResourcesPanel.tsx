import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EdgeNodeStatus } from '../../types/edgeai';

interface EdgeComputeAndResourcesPanelProps {
  edgeNode: EdgeNodeStatus;
}

type ResRange = '30' | '60' | 'ALL';

const TOOLTIP = {
  backgroundColor: '#121513',
  border: '1px solid #4E564C',
  borderRadius: '2px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10.5px',
  color: '#F0F0E8',
};

export const EdgeComputeAndResourcesPanel: React.FC<EdgeComputeAndResourcesPanelProps> = ({
  edgeNode,
}) => {
  const [range, setRange] = useState<ResRange>('ALL');
  const { resources } = edgeNode;

  const plotHistory = useMemo(() => {
    if (!resources.history.length) return [];
    if (range === '30') return resources.history.slice(-30);
    if (range === '60') return resources.history.slice(-60);
    return resources.history;
  }, [resources.history, range]);

  return (
    <section className="bv-panel" aria-label="Linux edge computing node and resource monitor">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              resources.isIllustrative ? 'status-led--amber' : 'status-led--offline'
            }`}
          />
          <h2 className="bv-panel-title">EDGE COMPUTING NODE // Linux SBC Monitor</h2>
          <span className={`bv-badge ${resources.isIllustrative ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {resources.isIllustrative ? 'ILLUSTRATIVE OS METRICS (DEMO)' : 'HARDWARE OFFLINE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="micro-label" style={{ fontSize: '9px', marginRight: '4px' }}>
            HISTORY:
          </span>
          {(['30', '60', 'ALL'] as ResRange[]).map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={!resources.isIllustrative}
              onClick={() => setRange(opt)}
              className={`bv-btn ${range === opt && resources.isIllustrative ? 'bv-btn--active' : ''}`}
              style={{ padding: '3px 7px', fontSize: '9.5px', opacity: resources.isIllustrative ? 1 : 0.4 }}
            >
              {opt === 'ALL' ? 'ALL' : `${opt}S`}
            </button>
          ))}
        </div>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Explicit Pending SBC Specification Plate */}
        <div
          className="mono"
          style={{
            padding: '8px 12px',
            backgroundColor: '#191D1A',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '18px',
            fontSize: '10.5px',
          }}
        >
          <span><span style={{ color: 'var(--text-muted)' }}>PLATFORM:</span> <strong>{edgeNode.platform}</strong></span>
          <span><span style={{ color: 'var(--text-muted)' }}>MODEL:</span> <strong style={{ color: 'var(--signal-amber)' }}>{edgeNode.model}</strong></span>
          <span><span style={{ color: 'var(--text-muted)' }}>RUNTIME:</span> <strong>{edgeNode.runtime}</strong></span>
          <span><span style={{ color: 'var(--text-muted)' }}>EXECUTION:</span> <strong style={{ color: 'var(--phosphor-green)' }}>{edgeNode.execution}</strong></span>
          <span><span style={{ color: 'var(--text-muted)' }}>INTERNET REQUIREMENT:</span> <strong style={{ color: 'var(--phosphor-green)' }}>{edgeNode.internetRequirement}</strong></span>
        </div>

        {/* 8 System Monitoring Gauges */}
        <div className="four-col-grid">
          {[
            {
              label: 'CPU Utilisation',
              value: resources.cpuPct !== null ? `${resources.cpuPct.toFixed(1)}%` : 'N/A',
              pct: resources.cpuPct,
              color: 'var(--phosphor-green)',
            },
            {
              label: 'Memory Utilisation',
              value: resources.memPct !== null ? `${resources.memPct.toFixed(1)}%` : 'N/A',
              pct: resources.memPct,
              color: 'var(--signal-amber)',
            },
            {
              label: 'Storage Usage',
              value: resources.storagePct !== null ? `${resources.storagePct.toFixed(1)}%` : 'N/A (NO SBC)',
              pct: resources.storagePct,
              color: 'var(--warm-neutral)',
            },
            {
              label: 'Processor Temp',
              value: resources.cpuTempC !== null ? `${resources.cpuTempC.toFixed(1)} °C` : 'N/A',
              pct: resources.cpuTempC !== null ? Math.min(100, (resources.cpuTempC / 85) * 100) : null,
              color: 'var(--signal-amber)',
            },
            { label: 'System Uptime', value: resources.uptimeLabel, pct: null, color: '' },
            { label: 'Process Health', value: resources.processHealth, pct: null, color: '' },
            { label: 'Network Interface', value: resources.networkStatus, pct: null, color: '' },
            { label: 'Local API Health', value: resources.localApiHealth, pct: null, color: '' },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                padding: '9px 11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span className="micro-label" style={{ fontSize: '8.5px' }}>
                {m.label}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: m.pct !== null ? '18px' : '11.5px',
                  fontWeight: 600,
                  color: m.value.startsWith('N/A') ? 'var(--text-muted)' : 'var(--text-primary)',
                }}
              >
                {m.value}
              </span>
              {m.pct !== null && (
                <div style={{ height: '5px', backgroundColor: '#101311', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, m.pct))}%`, height: '100%', backgroundColor: m.color }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* System Resource History Charts */}
        {plotHistory.length === 0 ? (
          <div className="scope-grid-bg mono" style={{ padding: '28px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', border: '1px dashed var(--border-strong)' }}>
            NO BACKEND OS RESOURCE METRICS RECEIVED IN HARDWARE MODE (LINUX SBC NOT CONNECTED)
          </div>
        ) : (
          <div className="two-col-grid">
            <div style={{ backgroundColor: '#131614', border: '1px solid var(--border-color)' }}>
              <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(32, 36, 32, 0.72)' }}>
                <span className="mono" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                  CPU &amp; MEMORY UTILISATION HISTORY (%) - ILLUSTRATIVE DEMO
                </span>
              </div>
              <div className="scope-grid-bg" style={{ height: '168px', padding: '8px 8px 4px 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={plotHistory}>
                    <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                    <XAxis dataKey="timeLabel" tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }} minTickGap={24} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }} width={36} unit="%" />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '9.5px' }} />
                    <Line type="monotone" dataKey="cpuPct" name="CPU (%)" stroke="#B8D65A" strokeWidth={1.7} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="memPct" name="Memory (%)" stroke="#E69A42" strokeWidth={1.7} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ backgroundColor: '#131614', border: '1px solid var(--border-color)' }}>
              <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(32, 36, 32, 0.72)' }}>
                <span className="mono" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
                  EDGE PROCESSOR TEMPERATURE (°C) - ILLUSTRATIVE DEMO
                </span>
              </div>
              <div className="scope-grid-bg" style={{ height: '168px', padding: '8px 8px 4px 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={plotHistory}>
                    <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                    <XAxis dataKey="timeLabel" tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }} minTickGap={24} />
                    <YAxis domain={[25, 75]} tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }} width={38} unit="°C" />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '9.5px' }} />
                    <Line type="monotone" dataKey="tempC" name="CPU Temp (°C)" stroke="#D6D2C5" strokeWidth={1.7} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
