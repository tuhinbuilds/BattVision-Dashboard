import React, { useMemo, useState } from 'react';
import { ActiveAlertsCommandPanel } from '../components/diagnostics/ActiveAlertsCommandPanel';
import { BatteryConditionAndRulesPanel } from '../components/diagnostics/BatteryConditionAndRulesPanel';
import { DiagnosticEventTimeline } from '../components/diagnostics/DiagnosticEventTimeline';
import { DiagnosticStatusOverview } from '../components/diagnostics/DiagnosticStatusOverview';
import { SensorAndCommDiagnostics } from '../components/diagnostics/SensorAndCommDiagnostics';
import { SystemEventLogPanel } from '../components/diagnostics/SystemEventLogPanel';
import { BATTERY_PACK_SPEC } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import {
  buildBaselineAlerts,
  buildCommunicationStatuses,
  buildSensorHealthList,
  DEFAULT_DIAGNOSTIC_THRESHOLDS,
  evaluateDiagnosticRules,
} from '../services/diagnosticsEngine';
import { formatTimeShort } from '../services/simulationService';
import {
  AlertAcknowledgement,
  AlertLifecycleStatus,
  DiagnosticAlert,
  DiagnosticEvent,
  DiagnosticEventCategory,
  DiagnosticSeverity,
  DiagnosticThresholdsConfig,
  SystemLogEntry,
} from '../types/diagnostics';

interface AlertOverrideRecord {
  status: AlertLifecycleStatus;
  acknowledgement?: AlertAcknowledgement;
  resolvedAt?: string;
  archivedAlert?: DiagnosticAlert;
}

function seedDiagnosticEvents(): DiagnosticEvent[] {
  const now = Date.now();
  return [
    {
      id: 'EVT-1005',
      timestamp: new Date(now - 1000).toISOString(),
      epochMs: now - 1000,
      timeLabel: formatTimeShort(now - 1000),
      category: 'DIAGNOSTICS',
      severity: 'INFO',
      source: 'RULE ENGINE',
      title: 'Diagnostic rules evaluated',
      description: '10 local monitoring rules evaluated against current telemetry snapshot.',
      supportingDetail: 'Rule engine running locally; JK BMS checks marked pending verification.',
      simulated: true,
    },
    {
      id: 'EVT-1004',
      timestamp: new Date(now - 2200).toISOString(),
      epochMs: now - 2200,
      timeLabel: formatTimeShort(now - 2200),
      category: 'BMS',
      severity: 'WARNING',
      source: 'JK SMART BMS',
      title: 'BMS communication not configured',
      description: 'JK Smart BMS (B1A8S10P) interface awaiting physical verification.',
      supportingDetail: 'Protocol and pinout remain configurable; no fabricated BMS connectivity.',
      simulated: true,
    },
    {
      id: 'EVT-1003',
      timestamp: new Date(now - 3400).toISOString(),
      epochMs: now - 3400,
      timeLabel: formatTimeShort(now - 3400),
      category: 'TELEMETRY',
      severity: 'NORMAL',
      source: 'SIMULATOR',
      title: 'Simulation stream started',
      description: 'Centralized 8S4P LiFePO4 demo data stream active at 1.0 Hz.',
      supportingDetail: 'BV-PACK-8S4P · 32 × 32700 · 25.6 V nominal · 24 Ah.',
      simulated: true,
    },
    {
      id: 'EVT-1002',
      timestamp: new Date(now - 4600).toISOString(),
      epochMs: now - 4600,
      timeLabel: formatTimeShort(now - 4600),
      category: 'SENSOR',
      severity: 'INFO',
      source: 'SENSOR BUS',
      title: 'Sensor channels loaded (DEMO)',
      description: '8 planned channels registered: INA226, ACS758-50B, ADS1115, TEMP-01..04, MPU6050.',
      supportingDetail: 'Channels marked SIMULATED in DEMO mode (never ONLINE without hardware).',
      simulated: true,
    },
    {
      id: 'EVT-1001',
      timestamp: new Date(now - 5800).toISOString(),
      epochMs: now - 5800,
      timeLabel: formatTimeShort(now - 5800),
      category: 'SYSTEM',
      severity: 'INFO',
      source: 'BATTVISION',
      title: 'System initialised',
      description: 'Diagnostics & Alert Command Centre initialized in local monitoring mode.',
      supportingDetail: 'Monitoring-only workstation; independent BMS retains protection authority.',
      simulated: true,
    },
  ];
}

function seedSystemLogs(): SystemLogEntry[] {
  const now = Date.now();
  return [
    {
      id: 'log-1',
      epochMs: now - 5800,
      timeLabel: formatTimeShort(now - 5800),
      category: 'SYSTEM',
      severity: 'INFO',
      message: 'MONITOR INITIALISED (BV-PACK-8S4P · LOCAL DIAGNOSTIC ENGINE)',
      simulated: true,
    },
    {
      id: 'log-2',
      epochMs: now - 4600,
      timeLabel: formatTimeShort(now - 4600),
      category: 'SENSOR',
      severity: 'INFO',
      message: 'DEMO CHANNELS LOADED: INA226, ACS758-50B, ADS1115, TEMP-01..04, MPU6050',
      simulated: true,
    },
    {
      id: 'log-3',
      epochMs: now - 3400,
      timeLabel: formatTimeShort(now - 3400),
      category: 'TELEMETRY',
      severity: 'NORMAL',
      message: 'DEMO STREAM STARTED (1.0 Hz SHARED TELEMETRY BUS)',
      simulated: true,
    },
    {
      id: 'log-4',
      epochMs: now - 2400,
      timeLabel: formatTimeShort(now - 2400),
      category: 'BMS',
      severity: 'WARNING',
      message: 'JK SMART BMS B1A8S10P INTERFACE NOT CONFIGURED - VERIFICATION PENDING',
      simulated: true,
    },
    {
      id: 'log-5',
      epochMs: now - 1600,
      timeLabel: formatTimeShort(now - 1600),
      category: 'ML',
      severity: 'INFO',
      message: 'EDGE INFERENCE ENGINE OFFLINE - NO DEPLOYED MODEL ARTIFACT',
      simulated: true,
    },
    {
      id: 'log-6',
      epochMs: now - 1000,
      timeLabel: formatTimeShort(now - 1000),
      category: 'DIAGNOSTICS',
      severity: 'NORMAL',
      message: 'RULE EVALUATION COMPLETE (10 RULES CHECKED)',
      simulated: true,
    },
  ];
}

export const DiagnosticsPage: React.FC = () => {
  const { telemetry, dataSourceMode, setDataSourceMode, demoScenario, logEvent } = useTelemetry();

  const [thresholds, setThresholds] = useState<DiagnosticThresholdsConfig>(
    DEFAULT_DIAGNOSTIC_THRESHOLDS
  );
  const [simulateTemp3Stale, setSimulateTemp3Stale] = useState<boolean>(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>('ALM-BMS-001');
  const [alertOverrides, setAlertOverrides] = useState<Record<string, AlertOverrideRecord>>({});
  const [timelineEvents, setTimelineEvents] = useState<DiagnosticEvent[]>(() =>
    seedDiagnosticEvents()
  );
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>(() => seedSystemLogs());

  const isDemo = dataSourceMode === 'DEMO';

  const appendEventAndLog = (
    category: DiagnosticEventCategory,
    severity: DiagnosticSeverity,
    source: string,
    title: string,
    description: string,
    supportingDetail: string,
    logMsg: string
  ) => {
    const now = Date.now();
    const timeLabel = formatTimeShort(now);
    const idNum = Math.floor(1100 + (now % 8800));
    const evt: DiagnosticEvent = {
      id: `EVT-${idNum}`,
      timestamp: new Date(now).toISOString(),
      epochMs: now,
      timeLabel,
      category,
      severity,
      source,
      title,
      description,
      supportingDetail,
      simulated: isDemo,
    };
    setTimelineEvents((prev) => [evt, ...prev].slice(0, 150));

    const logEntry: SystemLogEntry = {
      id: `log-${now}-${Math.random().toString(36).slice(2, 5)}`,
      epochMs: now,
      timeLabel,
      category,
      severity,
      message: logMsg,
      simulated: isDemo,
    };
    setSystemLogs((prev) => [...prev, logEntry].slice(-200));
  };

  const effectiveTemp3Stale =
    simulateTemp3Stale || (isDemo && demoScenario === 'SENSOR_DISCONNECTION');

  const engineCtx = useMemo(
    () => ({
      telemetry,
      dataSourceMode,
      thresholds,
      simulateTemp3Stale: effectiveTemp3Stale,
    }),
    [telemetry, dataSourceMode, thresholds, effectiveTemp3Stale]
  );

  const evaluations = useMemo(() => evaluateDiagnosticRules(engineCtx), [engineCtx]);
  const sensors = useMemo(() => buildSensorHealthList(engineCtx), [engineCtx]);
  const commLinks = useMemo(
    () => buildCommunicationStatuses(telemetry, dataSourceMode),
    [telemetry, dataSourceMode]
  );

  // Merge live rule-generated alerts with user acknowledge/resolve records (preserving resolved records!)
  const mergedAlerts: DiagnosticAlert[] = useMemo(() => {
    const live = buildBaselineAlerts(engineCtx);
    const liveIds = new Set(live.map((a) => a.id));

    const updatedLive = live.map((alert) => {
      const ov = alertOverrides[alert.id];
      if (!ov) return alert;
      return {
        ...alert,
        status: ov.status,
        acknowledgement: ov.acknowledgement,
        resolvedAt: ov.resolvedAt,
      };
    });

    // Preserve any resolved/acknowledged alerts that are no longer actively triggering
    const archived: DiagnosticAlert[] = [];
    for (const [id, ov] of Object.entries(alertOverrides)) {
      if (!liveIds.has(id) && ov.archivedAlert) {
        archived.push({
          ...ov.archivedAlert,
          status: ov.status,
          acknowledgement: ov.acknowledgement,
          resolvedAt: ov.resolvedAt,
        });
      }
    }

    return [...updatedLive, ...archived];
  }, [engineCtx, alertOverrides]);

  const handleAcknowledgeAlert = (alertId: string) => {
    const target = mergedAlerts.find((a) => a.id === alertId);
    if (!target) return;
    const nowLabel = formatTimeShort(Date.now());
    setAlertOverrides((prev) => ({
      ...prev,
      [alertId]: {
        ...(prev[alertId] ?? {}),
        status: 'ACKNOWLEDGED',
        acknowledgement: {
          acknowledgedAt: nowLabel,
          acknowledgedBy: 'LAB OPERATOR',
        },
        archivedAlert: target,
      },
    }));
    appendEventAndLog(
      'DIAGNOSTICS',
      'INFO',
      target.sourceComponent,
      `Alert acknowledged (${alertId})`,
      `Operator acknowledged "${target.title}".`,
      `Acknowledged at ${nowLabel} · Record preserved in history.`,
      `ALERT ACKNOWLEDGED ${alertId} (${target.sourceComponent})`
    );
    logEvent('ACK-ALM', 'DIAGNOSTICS', `Alert ${alertId} acknowledged by operator.`, 'INFO');
  };

  const handleResolveAlert = (alertId: string) => {
    const target = mergedAlerts.find((a) => a.id === alertId);
    if (!target) return;
    const nowLabel = formatTimeShort(Date.now());
    setAlertOverrides((prev) => ({
      ...prev,
      [alertId]: {
        ...(prev[alertId] ?? {}),
        status: 'RESOLVED',
        acknowledgement: prev[alertId]?.acknowledgement ?? {
          acknowledgedAt: nowLabel,
          acknowledgedBy: 'LAB OPERATOR',
        },
        resolvedAt: nowLabel,
        archivedAlert: target,
      },
    }));
    appendEventAndLog(
      'DIAGNOSTICS',
      'NORMAL',
      target.sourceComponent,
      `Alert marked resolved (${alertId})`,
      `Operator resolved "${target.title}". Historical record retained.`,
      `Resolved at ${nowLabel} · Dashboard record only (BMS independent).`,
      `ALERT RESOLVED ${alertId} (${target.sourceComponent})`
    );
    logEvent('RES-ALM', 'DIAGNOSTICS', `Alert ${alertId} marked resolved by operator.`, 'NOMINAL');
  };

  const handleToggleTemp3Stale = () => {
    setSimulateTemp3Stale((prev) => {
      const next = !prev;
      appendEventAndLog(
        'SENSOR',
        next ? 'WARNING' : 'NORMAL',
        'TEMP-03 (DS18B20)',
        next ? 'TEMP-03 stale condition simulated' : 'TEMP-03 freshness restored (demo)',
        next
          ? 'Simulated stale 1-Wire channel on TEMP-03; TEMP-01, TEMP-02, TEMP-04 remain nominal.'
          : 'Simulated TEMP-03 update freshness restored to 1.0 Hz.',
        'Per-probe fault isolation test (RULE SENSOR-001).',
        next
          ? 'SENSOR TEMP-03 MARKED STALE (DEMO ISOLATION TEST)'
          : 'SENSOR TEMP-03 RESTORED (DEMO)'
      );
      return next;
    });
  };

  const handleChangeThresholds = (next: DiagnosticThresholdsConfig) => {
    setThresholds(next);
    appendEventAndLog(
      'DIAGNOSTICS',
      'INFO',
      'RULE ENGINE',
      'Illustrative monitoring thresholds updated',
      `Updated UI monitoring thresholds (Temp > ${next.tempWarnC.toFixed(
        1
      )}°C, V: ${next.packVoltageLowV.toFixed(1)}-${next.packVoltageHighV.toFixed(
        1
      )}V, I > ${next.currentHighA.toFixed(0)}A).`,
      'Dashboard UI rule thresholds only; BMS hardware limits untouched.',
      `THRESHOLDS UPDATED: T>${next.tempWarnC.toFixed(1)}C V[${next.packVoltageLowV.toFixed(
        1
      )}..${next.packVoltageHighV.toFixed(1)}] I>${next.currentHighA}A`
    );
  };

  const handleResetThresholds = () => {
    setThresholds(DEFAULT_DIAGNOSTIC_THRESHOLDS);
    appendEventAndLog(
      'DIAGNOSTICS',
      'INFO',
      'RULE ENGINE',
      'Illustrative thresholds reset to defaults',
      'Restored default demo rule thresholds.',
      'Dashboard rule defaults restored.',
      'DIAGNOSTIC THRESHOLDS RESET TO DEFAULTS'
    );
  };

  const handleClearDemoHistory = () => {
    const now = Date.now();
    const label = formatTimeShort(now);
    setTimelineEvents([
      {
        id: 'EVT-CLR',
        timestamp: new Date(now).toISOString(),
        epochMs: now,
        timeLabel: label,
        category: 'SYSTEM',
        severity: 'INFO',
        source: 'OPERATOR',
        title: 'Demo event history cleared',
        description: 'Operator cleared previous simulated diagnostic timeline records.',
        supportingDetail: 'Bounded session history reset.',
        simulated: true,
      },
    ]);
    setSystemLogs((prev) => [
      ...prev.slice(-199),
      {
        id: `log-clr-${now}`,
        epochMs: now,
        timeLabel: label,
        category: 'SYSTEM',
        severity: 'INFO',
        message: 'DEMO EVENT HISTORY CLEARED BY OPERATOR',
        simulated: true,
      },
    ]);
  };

  const handleExportEventsCsv = (visibleEvents: DiagnosticEvent[]) => {
    const header = 'event_id,timestamp,time,category,severity,source,title,description,simulated\n';
    const rows = visibleEvents
      .map(
        (e) =>
          `${e.id},${e.timestamp},${e.timeLabel},${e.category},${e.severity},"${e.source.replace(
            /"/g,
            '""'
          )}","${e.title.replace(/"/g, '""')}","${e.description.replace(/"/g, '""')}",${
            e.simulated ? 'SIMULATED' : 'HARDWARE'
          }`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battvision_diagnostic_events_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    appendEventAndLog(
      'SYSTEM',
      'INFO',
      'EXPORTER',
      'Diagnostic events exported as CSV',
      `Exported ${visibleEvents.length} filtered timeline events.`,
      'Local browser CSV export.',
      `EXPORTED ${visibleEvents.length} DIAGNOSTIC EVENTS TO CSV`
    );
  };

  const lastUpdateLabel = isDemo ? formatTimeShort(telemetry.epochMs) : 'OFFLINE';

  return (
    <div className="canvas-container page-enter">
      {/* SECTION 3: PAGE HEADER */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">DIAGNOSTICS &amp; ALERT COMMAND CENTRE</span>
            <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
              <span
                className={`status-led ${
                  isDemo ? 'status-led--amber status-led--pulse' : 'status-led--offline'
                }`}
              />
              {isDemo ? 'SIMULATION MODE' : 'HARDWARE MODE (OFFLINE)'}
            </span>
          </div>

          <h1 className="page-header__title">DIAGNOSTICS &amp; ALERTS</h1>
          <p className="page-header__subtitle">
            Battery system health, fault monitoring and diagnostic event intelligence.
          </p>
        </div>

        {/* DEMO / HARDWARE Mode Toggle */}
        <div className="page-header__controls">
          <div
            role="group"
            aria-label="Diagnostics data source mode"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setDataSourceMode('DEMO');
                appendEventAndLog(
                  'COMMUNICATION',
                  'INFO',
                  'MODE SWITCH',
                  'Switched to DEMO mode',
                  'Simulated telemetry and diagnostic alerts active.',
                  'No physical hardware claimed.',
                  'SWITCHED DIAGNOSTICS TO DEMO MODE'
                );
              }}
              className={`bv-btn ${isDemo ? 'bv-btn--amber' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor: isDemo ? 'var(--signal-amber-dim)' : 'transparent',
              }}
            >
              DEMO MODE
            </button>
            <button
              type="button"
              onClick={() => {
                setDataSourceMode('HARDWARE');
                appendEventAndLog(
                  'COMMUNICATION',
                  'WARNING',
                  'MODE SWITCH',
                  'Switched to HARDWARE mode',
                  'Backend disconnected - missing measurements marked NOT EVALUATED.',
                  'Zero fabricated faults or zero-substitutions.',
                  'SWITCHED DIAGNOSTICS TO HARDWARE MODE (BACKEND OFFLINE)'
                );
              }}
              className={`bv-btn ${!isDemo ? 'bv-btn--active' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor: !isDemo ? 'var(--phosphor-green-dim)' : 'transparent',
              }}
            >
              HARDWARE MODE
            </button>
          </div>
        </div>
      </div>

      {/* METADATA & SAFETY BOUNDARY STRIP */}
      <div
        className="bv-panel mono"
        style={{
          padding: '8px 14px',
          backgroundColor: '#1B1F1C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>PACK ID: </span>
            <strong style={{ color: 'var(--phosphor-green)' }}>{BATTERY_PACK_SPEC.packId}</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>DIAGNOSTIC ENGINE: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>LOCAL</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>MONITORING SOURCE: </span>
            <strong style={{ color: isDemo ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
              {isDemo ? 'SIMULATION' : 'HARDWARE (OFFLINE)'}
            </strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>ALERT ENGINE: </span>
            <strong style={{ color: isDemo ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
              {isDemo ? 'DEMO' : 'HARDWARE STANDBY'}
            </strong>
          </span>
        </div>

        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
          MONITORING ONLY · INDEPENDENT JK BMS RETAINS ALL HARDWARE PROTECTION AUTHORITY
        </span>
      </div>

      {/* SECTION 4: DIAGNOSTIC STATUS OVERVIEW */}
      <DiagnosticStatusOverview
        alerts={mergedAlerts}
        sensors={sensors}
        commLinks={commLinks}
        lastUpdateLabel={lastUpdateLabel}
        dataSourceMode={dataSourceMode}
      />

      {/* SECTIONS 5, 11, 12: ACTIVE ALERTS COMMAND PANEL + INSPECTION DRAWER */}
      <ActiveAlertsCommandPanel
        alerts={mergedAlerts}
        selectedAlertId={selectedAlertId}
        onSelectAlert={setSelectedAlertId}
        onAcknowledgeAlert={handleAcknowledgeAlert}
        onResolveAlert={handleResolveAlert}
      />

      {/* SECTION 6: CHRONOLOGICAL DIAGNOSTIC EVENT TIMELINE */}
      <DiagnosticEventTimeline
        events={timelineEvents}
        onExportCsv={handleExportEventsCsv}
        onClearDemoHistory={handleClearDemoHistory}
      />

      {/* SECTIONS 8 & 10: BATTERY CONDITION MONITORING & DIAGNOSTIC RULE ENGINE */}
      <BatteryConditionAndRulesPanel
        evaluations={evaluations}
        thresholds={thresholds}
        onChangeThresholds={handleChangeThresholds}
        onResetThresholds={handleResetThresholds}
      />

      {/* SECTIONS 7 & 9: SENSOR NETWORK DIAGNOSTICS & COMMUNICATION CONNECTIVITY */}
      <SensorAndCommDiagnostics
        sensors={sensors}
        commLinks={commLinks}
        dataSourceMode={dataSourceMode}
        simulateTemp3Stale={simulateTemp3Stale}
        onToggleSimulateTemp3Stale={handleToggleTemp3Stale}
      />

      {/* SECTION 13: TECHNICAL SYSTEM EVENT LOG VIEWER */}
      <SystemEventLogPanel logs={systemLogs} />
    </div>
  );
};
