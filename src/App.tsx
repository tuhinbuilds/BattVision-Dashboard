import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BootSequence } from './components/BootSequence';
import { DemoControlDrawer } from './components/DemoControlDrawer';
import { EngineeringStatePanel } from './components/EngineeringStatePanel';
import { MobileBottomNav, MobileNavDrawer } from './components/MobileNav';
import { PresentationOverview } from './components/PresentationOverview';
import { Sidebar } from './components/Sidebar';
import { TopStatusStrip } from './components/TopStatusStrip';
import { OverviewPage } from './pages/OverviewPage';
import { TelemetryProvider, useTelemetry } from './services/dataService';
import { PreferencesProvider, usePreferences } from './services/preferencesService';
import { NavSectionId } from './types/telemetry';

// Lazy-loaded instrumentation modules for lean initial bundle & smooth performance
const BatteryPackPage = lazy(() =>
  import('./pages/BatteryPackPage').then((m) => ({ default: m.BatteryPackPage }))
);
const LiveTelemetryPage = lazy(() =>
  import('./pages/LiveTelemetryPage').then((m) => ({ default: m.LiveTelemetryPage }))
);
const IntelligencePage = lazy(() =>
  import('./pages/IntelligencePage').then((m) => ({ default: m.IntelligencePage }))
);
const DiagnosticsPage = lazy(() =>
  import('./pages/DiagnosticsPage').then((m) => ({ default: m.DiagnosticsPage }))
);
const DataLabPage = lazy(() =>
  import('./pages/DataLabPage').then((m) => ({ default: m.DataLabPage }))
);
const EdgeAIPage = lazy(() =>
  import('./pages/EdgeAIPage').then((m) => ({ default: m.EdgeAIPage }))
);
const SystemConfigPage = lazy(() =>
  import('./pages/SystemConfigPage').then((m) => ({ default: m.SystemConfigPage }))
);

const BOOT_SESSION_KEY = 'battvision.boot.seen';

const DashboardShell: React.FC = () => {
  const { isPaused } = useTelemetry();
  const { prefs } = usePreferences();

  const [activeSection, setActiveSection] = useState<NavSectionId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [demoDrawerOpen, setDemoDrawerOpen] = useState<boolean>(false);
  const [presentationMode, setPresentationMode] = useState<boolean>(
    prefs.startInPresentationMode
  );
  const [showPresentationOverview, setShowPresentationOverview] = useState<boolean>(
    prefs.startInPresentationMode
  );

  // Run brief boot sequence once per session unless disabled or reduced-motion active
  const [showBoot, setShowBoot] = useState<boolean>(() => {
    if (!prefs.bootAnimationEnabled || prefs.reducedMotion) return false;
    try {
      return window.sessionStorage.getItem(BOOT_SESSION_KEY) !== '1';
    } catch {
      return false;
    }
  });

  const handleBootComplete = useCallback(() => {
    setShowBoot(false);
    try {
      window.sessionStorage.setItem(BOOT_SESSION_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }, []);

  // Auto-collapse navigation rail on tablet viewports for unobstructed instrument canvas
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handleResize = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setSidebarCollapsed(true);
      }
    };
    handleResize(mq);
    mq.addEventListener('change', handleResize);
    return () => mq.removeEventListener('change', handleResize);
  }, []);

  // Keyboard shortcuts: Shift+P toggles Presentation Mode; Esc closes drawers or exits presentation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPresentationMode((prev) => {
          const next = !prev;
          setShowPresentationOverview(next);
          return next;
        });
      } else if (e.key === 'Escape') {
        if (demoDrawerOpen) setDemoDrawerOpen(false);
        else if (mobileDrawerOpen) setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [demoDrawerOpen, mobileDrawerOpen]);

  const handleSelectSection = useCallback((section: NavSectionId) => {
    setActiveSection(section);
    setShowPresentationOverview(false);
  }, []);

  const handleTogglePresentation = useCallback(() => {
    setPresentationMode((prev) => {
      const next = !prev;
      setShowPresentationOverview(next);
      return next;
    });
  }, []);

  const renderPage = () => {
    if (presentationMode && showPresentationOverview) {
      return <PresentationOverview onNavigate={handleSelectSection} />;
    }

    switch (activeSection) {
      case 'overview':
        return <OverviewPage onNavigate={handleSelectSection} />;
      case 'battery-pack':
        return <BatteryPackPage />;
      case 'live-telemetry':
        return <LiveTelemetryPage />;
      case 'intelligence':
        return <IntelligencePage />;
      case 'diagnostics':
        return <DiagnosticsPage />;
      case 'data-lab':
        return <DataLabPage />;
      case 'edge-ai':
        return <EdgeAIPage />;
      case 'system-config':
        return <SystemConfigPage />;
      default:
        return <OverviewPage onNavigate={handleSelectSection} />;
    }
  };

  return (
    <>
      {showBoot && <BootSequence onComplete={handleBootComplete} />}

      <div
        className={`app-shell ${sidebarCollapsed ? 'app-shell--collapsed' : ''} ${
          presentationMode ? 'app-shell--presentation' : ''
        }`}
      >
        <Sidebar
          activeSection={activeSection}
          onSelectSection={handleSelectSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          isPaused={isPaused}
        />

        <div className="workspace-column">
          <TopStatusStrip
            presentationMode={presentationMode}
            showPresentationOverview={showPresentationOverview}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            onSelectPresentationOverview={() => setShowPresentationOverview(true)}
            onTogglePresentationMode={handleTogglePresentation}
            onOpenDemoControls={() => setDemoDrawerOpen(true)}
            onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          />

          <main className="main-canvas" role="main">
            <Suspense
              fallback={
                <div className="canvas-container">
                  <EngineeringStatePanel
                    kind="loading"
                    title="LOADING INSTRUMENTATION MODULE"
                    code="LOCAL BUNDLE"
                    description="Initialising module layout and connecting to shared BattVision telemetry state."
                  />
                </div>
              }
            >
              {renderPage()}
            </Suspense>
          </main>
        </div>
      </div>

      {/* Smartphone Navigation Drawer & Bottom Bar (hidden on desktop/presentation) */}
      {!presentationMode && (
        <>
          <MobileNavDrawer
            open={mobileDrawerOpen}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            onClose={() => setMobileDrawerOpen(false)}
            onOpenDemoControls={() => setDemoDrawerOpen(true)}
            onTogglePresentation={handleTogglePresentation}
          />
          <MobileBottomNav
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            onOpenDrawer={() => setMobileDrawerOpen(true)}
          />
        </>
      )}

      {/* Unified Demo Scenarios & User Preferences Drawer */}
      <DemoControlDrawer open={demoDrawerOpen} onClose={() => setDemoDrawerOpen(false)} />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <PreferencesProvider>
      <TelemetryProvider>
        <DashboardShell />
      </TelemetryProvider>
    </PreferencesProvider>
  );
};

export default App;
