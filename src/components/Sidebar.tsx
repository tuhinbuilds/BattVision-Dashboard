import React from 'react';
import {
  Activity,
  BatteryCharging,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  LucideIcon,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { NAV_ITEMS, SYSTEM_IDENTITY } from '../config/systemConfig';
import { NavSectionId } from '../types/telemetry';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isPaused: boolean;
}

const NAV_ICONS: Record<NavSectionId, LucideIcon> = {
  overview: LayoutDashboard,
  'battery-pack': BatteryCharging,
  'live-telemetry': Activity,
  intelligence: BrainCircuit,
  diagnostics: ShieldAlert,
  'data-lab': FlaskConical,
  'edge-ai': Cpu,
  'system-config': SlidersHorizontal,
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  isPaused,
}) => {
  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      aria-label="Primary instrumentation navigation"
    >
      {/* Top Identity */}
      <div className="sidebar__brand">
        <BrandLogo collapsed={collapsed} />
        {!collapsed && (
          <button
            type="button"
            className="sidebar__collapse-btn"
            onClick={onToggleCollapse}
            title="Collapse navigation rail"
            aria-label="Collapse navigation rail"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {collapsed ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0 4px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            className="sidebar__collapse-btn"
            onClick={onToggleCollapse}
            title="Expand navigation rail"
            aria-label="Expand navigation rail"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <div className="sidebar__lab-strip">
          <span>{SYSTEM_IDENTITY.labLabel}</span>
          <span>REV 01</span>
        </div>
      )}

      {/* Navigation Modules */}
      <nav className="sidebar__nav">
        {!collapsed && <div className="sidebar__nav-label">Instrumentation Modules</div>}

        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.id];
          const isActive = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => onSelectSection(item.id)}
              title={collapsed ? `${item.label} - ${item.subtitle}` : item.subtitle}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} className="sidebar__nav-icon" />
              {!collapsed && (
                <span className="sidebar__nav-text">
                  <span className="sidebar__nav-name">{item.label}</span>
                  <span className="sidebar__nav-code">{item.shortCode}</span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Edge Node & Source Telemetry Strip */}
      <div className="sidebar__footer">
        {collapsed ? (
          <>
            <span
              className={`status-led ${isPaused ? 'status-led--amber' : 'status-led--amber status-led--pulse'}`}
              title="Edge Node: SIMULATED | Source: DEMO"
            />
            <span
              className="mono"
              style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}
            >
              R01
            </span>
          </>
        ) : (
          <>
            <div className="sidebar__meta-row">
              <span className="sidebar__meta-key">Edge Node</span>
              <span className="sidebar__meta-val" style={{ color: 'var(--signal-amber)' }}>
                <span className="status-led status-led--amber" />
                SIMULATED
              </span>
            </div>
            <div className="sidebar__meta-row">
              <span className="sidebar__meta-key">Data Source</span>
              <span className="sidebar__meta-val">
                <span
                  className={`status-led ${isPaused ? 'status-led--offline' : 'status-led--phosphor status-led--pulse'}`}
                />
                {isPaused ? 'DEMO (PAUSED)' : 'DEMO STREAM'}
              </span>
            </div>
            <div className="sidebar__meta-row">
              <span className="sidebar__meta-key">Build</span>
              <span className="sidebar__meta-val" style={{ color: 'var(--text-secondary)' }}>
                {SYSTEM_IDENTITY.softwareVersion}
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
