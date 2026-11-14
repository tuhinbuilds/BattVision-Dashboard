import React, { useEffect, useState } from 'react';
import { Download, Pause, Play, Radio, RotateCcw } from 'lucide-react';
import { DataSourceMode, TelemetryTimeWindowSec } from '../../types/telemetry';
import { formatTimeShort } from '../../services/simulationService';

interface StreamControlStripProps {
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
  displayPaused: boolean;
  bufferedWhilePaused: number;
  timeWindowSec: TelemetryTimeWindowSec;
  sessionStartMs: number;
  sampleCount: number;
  sampleRateMs: number;
  latestEpochMs: number;
  visibleFrameCount: number;
  onStartDemo: () => void;
  onPauseDisplay: () => void;
  onResumeDisplay: () => void;
  onResetSession: () => void;
  onSelectTimeWindow: (sec: TelemetryTimeWindowSec) => void;
  onExportCsv: () => void;
}

const WINDOWS: { sec: TelemetryTimeWindowSec; label: string }[] = [
  { sec: 30, label: '30S' },
  { sec: 60, label: '1M' },
  { sec: 300, label: '5M' },
  { sec: 900, label: '15M' },
];

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const StreamControlStrip: React.FC<StreamControlStripProps> = ({
  dataSourceMode,
  hasLiveData,
  displayPaused,
  bufferedWhilePaused,
  timeWindowSec,
  sessionStartMs,
  sampleCount,
  sampleRateMs,
  latestEpochMs,
  visibleFrameCount,
  onStartDemo,
  onPauseDisplay,
  onResumeDisplay,
  onResetSession,
  onSelectTimeWindow,
  onExportCsv,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const durationText = isDemo ? formatDuration(nowMs - sessionStartMs) : '--:--:--';
  const freqHz = (1000 / sampleRateMs).toFixed(1);
  const latestTimestamp = isDemo ? formatTimeShort(latestEpochMs) : 'N/A';

  return (
    <section
      className="bv-panel"
      aria-label="Telemetry display and demo stream controls"
      style={{ overflow: 'hidden' }}
    >
      {/* Top Action Controls Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(23, 26, 24, 0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`bv-btn ${isDemo && !displayPaused ? 'bv-btn--active' : ''}`}
            onClick={onStartDemo}
            title="Ensure DEMO simulation stream is active and live display is running"
          >
            <Radio size={12} />
            Start Demo Stream
          </button>

          {displayPaused ? (
            <button
              type="button"
              className="bv-btn bv-btn--amber"
              onClick={onResumeDisplay}
              title="Resume live display updates (catch up to underlying stream)"
            >
              <Play size={12} />
              Resume Display
            </button>
          ) : (
            <button
              type="button"
              className="bv-btn"
              onClick={onPauseDisplay}
              disabled={!isDemo}
              title="Freeze displayed charts & instruments while underlying demo stream continues"
              style={{ opacity: isDemo ? 1 : 0.45 }}
            >
              <Pause size={12} />
              Pause Display
            </button>
          )}

          <button
            type="button"
            className="bv-btn"
            onClick={onResetSession}
            title="Clear bounded telemetry ring buffer and reset demo session statistics"
          >
            <RotateCcw size={12} />
            Reset Demo Session
          </button>

          <button
            type="button"
            className="bv-btn"
            onClick={onExportCsv}
            disabled={!isDemo || visibleFrameCount === 0}
            title="Export currently visible time-window frames to CSV"
            style={{ opacity: isDemo && visibleFrameCount > 0 ? 1 : 0.45 }}
          >
            <Download size={12} />
            Export Visible CSV ({isDemo ? visibleFrameCount : 0})
          </button>
        </div>

        {/* Time Window Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="micro-label" style={{ fontSize: '9.5px' }}>
            TIME WINDOW
          </span>
          <div
            role="group"
            aria-label="Oscilloscope time window"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '2px',
              gap: '2px',
            }}
          >
            {WINDOWS.map((w) => {
              const active = timeWindowSec === w.sec;
              return (
                <button
                  key={w.sec}
                  type="button"
                  onClick={() => onSelectTimeWindow(w.sec)}
                  className={`bv-btn ${active ? 'bv-btn--active' : ''}`}
                  style={{
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '10px',
                    backgroundColor: active ? 'var(--phosphor-green-dim)' : 'transparent',
                  }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Engineering Session Metadata Strip */}
      <div
        className="mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '8px 14px',
          backgroundColor: '#1B1F1C',
          fontSize: '10.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>SESSION DURATION: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>{durationText}</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>SAMPLES: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>
              {isDemo ? sampleCount : 0}
            </strong>{' '}
            <span style={{ color: 'var(--text-muted)' }}>(RING MAX 900)</span>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>UPDATE FREQ: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>
              {isDemo ? `${freqHz} Hz (DEMO)` : '--'}
            </strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>LATEST FRAME: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>{latestTimestamp}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isDemo ? (
            <span className="bv-badge bv-badge--muted">
              MISSING DATA: BACKEND NOT CONNECTED
            </span>
          ) : displayPaused ? (
            <span className="bv-badge bv-badge--amber">
              DISPLAY PAUSED · STREAM RUNNING (+{bufferedWhilePaused} BUFFERED)
            </span>
          ) : (
            <span className="bv-badge bv-badge--phosphor">
              <span className="status-led status-led--phosphor status-led--pulse" />
              FRESHNESS: LIVE (DEMO)
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>
            MONITORING CONTROLS ONLY (NO BMS WRITE)
          </span>
        </div>
      </div>
    </section>
  );
};
