import React, { useEffect, useState } from 'react';
import { Menu, MonitorPlay, SlidersHorizontal, X } from 'lucide-react';
import { BATTERY_PACK_SPEC, DEMO_SCENARIOS, SYSTEM_IDENTITY } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { NavSectionId, SubsystemStatusKind } from '../types/telemetry';
import { BrandLogo } from './BrandLogo';

interface TopStatusStripProps {
  presentationMode: boolean;
  showPresentationOverview: boolean;
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  onSelectPresentationOverview: () => void;
  onTogglePresentationMode: () => void;
  onOpenDemoControls: () => void;
  onOpenMobileDrawer: () => void;
}

function renderStatusDot(status: SubsystemStatusKind) {
  switch (status) {
    case 'CONNECTED':
      return <span className="status-led status-led--phosphor status-led--pulse" />;
    case 'SIMULATED':
    case 'DEMO':
    case 'WARNING':
      return <span className="status-led status-led--amber" />;
    case 'FAULT':
      return <span className="status-led status-led--red status-led--pulse" />;
    case 'NOT_CONNECTED':
    default:
      return <span className="status-led status-led--offline" />;
  }
}

function formatStatusLabel(status: SubsystemStatusKind): string {
  return status.replace('_', ' ');
}

function statusTextColor(status: SubsystemStatusKind): string {
  switch (status) {
    case 'CONNECTED':
      return 'var(--phosphor-green)';
    case 'SIMULATED':
    case 'DEMO':
    case 'WARNING':
      return 'var(--signal-amber)';
    case 'FAULT':
      return 'var(--warning-red)';
    case 'NOT_CONNECTED':
    default:
      return 'var(--text-secondary)';
  }
}

const PRESENTER_TABS: { id: NavSectionId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'battery-pack', label: 'Battery Pack' },
  { id: 'live-telemetry', label: 'Live Telemetry' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'data-lab', label: 'Data Lab' },
  { id: 'edge-ai', label: 'Edge AI' },
];

export const TopStatusStrip: React.FC<TopStatusStripProps> = ({
  presentationMode,
  showPresentationOverview,
  activeSection,
  onSelectSection,
  onSelectPresentationOverview,
  onTogglePresentationMode,
  onOpenDemoControls,
  onOpenMobileDrawer,
}) => {
  const {
    telemetry,
    isPaused,
    dataSourceMode,
    demoScenario,
    backendHealth,
    hardwareConnected,
    backendPacketSeq,
  } = useTelemetry();
  const [clockText, setClockText] = useState<string>(() => formatClock(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockText(formatClock(new Date()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sys = telemetry.systemStatus;
  const isDemo = dataSourceMode === 'DEMO';

  if (presentationMode) {
    return (
      <header
        className="top-strip"
        role="banner"
        aria-label="Presentation mode navigation bar"
        style={{
          minHeight: '54px',
          backgroundColor: '#161A17',
          borderBottom: '1px solid var(--phosphor-green-border)',
          flexWrap: 'wrap',
          padding: '8px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <BrandLogo collapsed={false} />
          <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {isDemo
              ? `SIMULATION · ${DEMO_SCENARIOS[demoScenario].shortLabel}`
              : 'HARDWARE OFFLINE'}
          </span>
        </div>

        <nav
          aria-label="Presentation quick module switcher"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={onSelectPresentationOverview}
            className={`bv-btn ${showPresentationOverview ? 'bv-btn--active' : ''}`}
            style={{ padding: '4px 8px', fontSize: '9.5px' }}
          >
            Demo Brief
          </button>
          {PRESENTER_TABS.map((t) => {
            const active = !showPresentationOverview && activeSection === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectSection(t.id)}
                className={`bv-btn ${active ? 'bv-btn--active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '9.5px' }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="bv-btn"
            onClick={onOpenDemoControls}
            style={{ padding: '5px 8px', fontSize: '9.5px' }}
          >
            <SlidersHorizontal size={12} /> Scenarios
          </button>
          <button
            type="button"
            className="bv-btn bv-btn--amber"
            onClick={onTogglePresentationMode}
            style={{ padding: '5px 9px', fontSize: '9.5px' }}
          >
            <X size={12} /> Exit Presentation
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="top-strip" role="banner" aria-label="System hardware status strip">
      <div className="top-strip__group" style={{ gap: '10px', minWidth: 0 }}>
        {/* Smartphone Menu Button */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileDrawer}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="top-strip__cell">
          <span className="top-strip__cell-label">System</span>
          <span className="top-strip__cell-value" style={{ color: 'var(--warm-neutral)' }}>
            {SYSTEM_IDENTITY.productName} // {BATTERY_PACK_SPEC.packId}
          </span>
        </div>

        <div className="top-strip__desktop-only">
          <div className="top-strip__divider" />

          <div className="top-strip__cell">
            <span className="top-strip__cell-label">Operating Mode</span>
            <span
              className="top-strip__cell-value"
              style={{
                color: isDemo
                  ? 'var(--signal-amber)'
                  : hardwareConnected
                  ? 'var(--phosphor-green)'
                  : 'var(--warm-neutral)',
              }}
            >
              <span
                className={`status-led ${
                  isDemo
                    ? 'status-led--amber status-led--pulse'
                    : hardwareConnected
                    ? 'status-led--phosphor status-led--pulse'
                    : 'status-led--offline'
                }`}
              />
              {isDemo
                ? 'SIMULATION MODE'
                : hardwareConnected
                ? `EDGE BACKEND LIVE (#${backendPacketSeq ?? 0})`
                : backendHealth?.reachable
                ? 'EDGE API READY (NO PACKETS)'
                : 'HARDWARE (OFFLINE)'}
            </span>
          </div>

          <div className="top-strip__divider" />

          <div className="top-strip__cell">
            <span className="top-strip__cell-label">Monitoring</span>
            <span
              className="top-strip__cell-value"
              style={{ color: isPaused ? 'var(--signal-amber)' : 'var(--phosphor-green)' }}
            >
              <span
                className={`status-led ${
                  isPaused ? 'status-led--amber' : 'status-led--phosphor status-led--pulse'
                }`}
              />
              {isPaused ? 'PAUSED (DEMO)' : isDemo ? 'ACTIVE (DEMO)' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      <div className="top-strip__group" style={{ gap: '10px' }}>
        <div className="top-strip__tablet-hide">
          <div className="top-strip__cell">
            <span className="top-strip__cell-label">ESP32-S3</span>
            <span
              className="top-strip__cell-value"
              style={{ color: statusTextColor(sys.esp32Status) }}
            >
              {renderStatusDot(sys.esp32Status)}
              {formatStatusLabel(sys.esp32Status)}
            </span>
          </div>

          <div className="top-strip__divider" />

          <div className="top-strip__cell">
            <span className="top-strip__cell-label">Edge SBC</span>
            <span
              className="top-strip__cell-value"
              style={{ color: statusTextColor(sys.edgeComputerStatus) }}
            >
              {renderStatusDot(sys.edgeComputerStatus)}
              {formatStatusLabel(sys.edgeComputerStatus)}
            </span>
          </div>

          <div className="top-strip__divider" />

          <div className="top-strip__cell">
            <span className="top-strip__cell-label">JK BMS</span>
            <span
              className="top-strip__cell-value"
              style={{ color: statusTextColor(sys.bmsStatus) }}
            >
              {renderStatusDot(sys.bmsStatus)}
              {formatStatusLabel(sys.bmsStatus)}
            </span>
          </div>

          <div className="top-strip__divider" />

          <div className="top-strip__cell" style={{ textAlign: 'right' }}>
            <span className="top-strip__cell-label">System Clock</span>
            <span className="top-strip__cell-value mono" style={{ color: 'var(--warm-neutral)' }}>
              {clockText}
            </span>
          </div>

          <div className="top-strip__divider" />
        </div>

        <button
          type="button"
          className={`bv-btn ${demoScenario !== 'NORMAL_OPERATION' && isDemo ? 'bv-btn--amber' : ''}`}
          onClick={onOpenDemoControls}
          title="Open Demo Scenarios & Global Preferences"
          style={{ padding: '4px 8px', fontSize: '9.5px' }}
        >
          <SlidersHorizontal size={12} />
          <span className="top-strip__desktop-only" style={{ gap: 0 }}>
            {demoScenario !== 'NORMAL_OPERATION' && isDemo
              ? DEMO_SCENARIOS[demoScenario].shortLabel
              : 'Demo Controls'}
          </span>
        </button>

        <button
          type="button"
          className="bv-btn bv-btn--active"
          onClick={onTogglePresentationMode}
          title="Enter Presentation Mode (Shift+P)"
          style={{ padding: '4px 8px', fontSize: '9.5px' }}
        >
          <MonitorPlay size={12} />
          <span className="top-strip__desktop-only" style={{ gap: 0 }}>
            Presentation
          </span>
        </button>
      </div>
    </header>
  );
};

function formatClock(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}
