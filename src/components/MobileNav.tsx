import React from 'react';
import {
  Activity,
  BatteryCharging,
  BrainCircuit,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  LucideIcon,
  Menu,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { NAV_ITEMS, SYSTEM_IDENTITY } from '../config/systemConfig';
import { NavSectionId } from '../types/telemetry';
import { BrandLogo } from './BrandLogo';

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

interface MobileDrawerProps {
  open: boolean;
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  onClose: () => void;
  onOpenDemoControls: () => void;
  onTogglePresentation: () => void;
}

export const MobileNavDrawer: React.FC<MobileDrawerProps> = ({
  open,
  activeSection,
  onSelectSection,
  onClose,
  onOpenDemoControls,
  onTogglePresentation,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation drawer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 180,
        backgroundColor: 'rgba(10, 12, 11, 0.78)',
        display: 'flex',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        style={{
          width: 'min(290px, 86vw)',
          height: '100vh',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#1B1F1C',
          }}
        >
          <BrandLogo />
          <button
            type="button"
            className="bv-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{ padding: '5px 7px' }}
          >
            <X size={16} />
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const active = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar__nav-item ${active ? 'sidebar__nav-item--active' : ''}`}
                onClick={() => {
                  onSelectSection(item.id);
                  onClose();
                }}
                style={{ minHeight: '42px' }}
              >
                <Icon size={17} className="sidebar__nav-icon" />
                <span className="sidebar__nav-text">
                  <span className="sidebar__nav-name">{item.label}</span>
                  <span className="sidebar__nav-code">{item.shortCode}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: '#191D1A',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <button
            type="button"
            className="bv-btn bv-btn--amber"
            onClick={() => {
              onClose();
              onOpenDemoControls();
            }}
          >
            Demo Scenarios &amp; Preferences
          </button>
          <button
            type="button"
            className="bv-btn bv-btn--active"
            onClick={() => {
              onClose();
              onTogglePresentation();
            }}
          >
            Enter Presentation Mode
          </button>
          <div className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
            {SYSTEM_IDENTITY.productName} · {SYSTEM_IDENTITY.softwareVersion}
          </div>
        </div>
      </aside>
    </div>
  );
};

interface MobileBottomNavProps {
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  onSelectSection,
  onOpenDrawer,
}) => {
  const quickItems: { id: NavSectionId; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'battery-pack', label: 'Pack', icon: BatteryCharging },
    { id: 'live-telemetry', label: 'Telemetry', icon: Activity },
    { id: 'diagnostics', label: 'Alerts', icon: ShieldAlert },
  ];

  const isMoreActive = !quickItems.some((q) => q.id === activeSection);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
      {quickItems.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeSection;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-nav__btn ${active ? 'mobile-bottom-nav__btn--active' : ''}`}
            onClick={() => onSelectSection(item.id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`mobile-bottom-nav__btn ${isMoreActive ? 'mobile-bottom-nav__btn--active' : ''}`}
        onClick={onOpenDrawer}
        aria-label="Open all modules menu"
      >
        <Menu size={16} />
        <span>Modules</span>
      </button>
    </nav>
  );
};
