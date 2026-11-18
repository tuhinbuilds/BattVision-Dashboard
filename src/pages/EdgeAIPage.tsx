import React, { useMemo, useState } from 'react';
import { EdgeComputeAndResourcesPanel } from '../components/edgeai/EdgeComputeAndResourcesPanel';
import { EdgeSystemEventLog } from '../components/edgeai/EdgeSystemEventLog';
import { EmbeddedControllerPanel } from '../components/edgeai/EmbeddedControllerPanel';
import { MlRuntimeAndLifecyclePanel } from '../components/edgeai/MlRuntimeAndLifecyclePanel';
import { StorageOfflineAndCommPanel } from '../components/edgeai/StorageOfflineAndCommPanel';
import { SystemArchitectureDiagram } from '../components/edgeai/SystemArchitectureDiagram';
import { TelemetryPipelineMonitor } from '../components/edgeai/TelemetryPipelineMonitor';
import { useTelemetry } from '../services/dataService';
import {
  buildArchitectureBlocks,
  buildControllerStatus,
  buildDatabaseStatus,
  buildEdgeCommunicationLinks,
  buildEdgeNodeStatus,
  buildMLRuntimeStatus,
  buildModelLifecycleStatus,
  buildSensorInterfaces,
  buildTelemetryPipelineStages,
  seedEdgeSystemLogs,
} from '../services/edgeAiService';
import { formatTimeShort } from '../services/simulationService';
import { EdgeSystemLogEntry } from '../types/edgeai';

export const EdgeAIPage: React.FC = () => {
  const {
    telemetry,
    history,
    sampleCount,
    sessionStartMs,
    dataSourceMode,
    setDataSourceMode,
    hardwareConnected,
    backendHealth,
    backendPacketSeq,
  } = useTelemetry();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('blk-esp32');
  const [edgeLogs, setEdgeLogs] = useState<EdgeSystemLogEntry[]>(() => seedEdgeSystemLogs());

  const isDemo = dataSourceMode === 'DEMO';

  const architectureBlocks = useMemo(
    () => buildArchitectureBlocks(dataSourceMode),
    [dataSourceMode]
  );

  const controllerStatus = useMemo(
    () => buildControllerStatus(telemetry, dataSourceMode),
    [telemetry, dataSourceMode]
  );

  const sensorInterfaces = useMemo(
    () => buildSensorInterfaces(dataSourceMode),
    [dataSourceMode]
  );

  const edgeNode = useMemo(
    () => buildEdgeNodeStatus(history, sessionStartMs, dataSourceMode),
    [history, sessionStartMs, dataSourceMode]
  );

  const pipelineStages = useMemo(
    () => buildTelemetryPipelineStages(telemetry, sampleCount, dataSourceMode),
    [telemetry, sampleCount, dataSourceMode]
  );

  const mlRuntime = useMemo(() => buildMLRuntimeStatus(dataSourceMode), [dataSourceMode]);
  const modelLifecycle = useMemo(() => buildModelLifecycleStatus(), []);
  const databaseStatus = useMemo(
    () => buildDatabaseStatus(telemetry, sampleCount, dataSourceMode),
    [telemetry, sampleCount, dataSourceMode]
  );
  const commLinks = useMemo(
    () => buildEdgeCommunicationLinks(telemetry, dataSourceMode),
    [telemetry, dataSourceMode]
  );

  const handleSwitchMode = (target: 'DEMO' | 'HARDWARE') => {
    setDataSourceMode(target);
    const now = Date.now();
    setEdgeLogs((prev) => [
      ...prev.slice(-199),
      {
        id: `elog-${now}`,
        epochMs: now,
        timeLabel: formatTimeShort(now),
        category: 'SYSTEM',
        severity: target === 'HARDWARE' ? 'WARNING' : 'INFO',
        message:
          target === 'HARDWARE'
            ? 'SWITCHED TO HARDWARE MODE — NO PHYSICAL ESP32-S3 OR LINUX SBC BACKEND DETECTED'
            : 'SWITCHED TO DEMO MODE — ILLUSTRATIVE ARCHITECTURE & TELEMETRY PIPELINE ACTIVE',
        simulated: target === 'DEMO',
      },
    ]);
  };

  return (
    <div className="canvas-container page-enter">
      {/* SECTION 3: PAGE HEADER */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">MODULE 07 // EMBEDDED COMPUTING &amp; EDGE AI</span>
            <span className="bv-badge bv-badge--phosphor">OFFLINE EDGE ARCHITECTURE</span>
            <span
              className={`bv-badge ${
                isDemo
                  ? 'bv-badge--amber'
                  : hardwareConnected
                  ? 'bv-badge--phosphor'
                  : backendHealth?.reachable
                  ? 'bv-badge--amber'
                  : 'bv-badge--muted'
              }`}
            >
              <span
                className={`status-led ${
                  isDemo
                    ? 'status-led--amber status-led--pulse'
                    : hardwareConnected
                    ? 'status-led--phosphor status-led--pulse'
                    : backendHealth?.reachable
                    ? 'status-led--amber'
                    : 'status-led--offline'
                }`}
              />
              {isDemo
                ? 'SIMULATION'
                : hardwareConnected
                ? `EDGE BACKEND LIVE (#${backendPacketSeq ?? 0})`
                : backendHealth?.reachable
                ? 'EDGE API READY (NO PACKETS)'
                : 'HARDWARE (OFFLINE)'}
            </span>
          </div>

          <h1 className="page-header__title">EDGE AI &amp; SYSTEM INTELLIGENCE</h1>
          <p className="page-header__subtitle">
            Local computing, embedded telemetry processing, machine-learning inference and system
            orchestration.
          </p>
          {backendHealth?.reachable && (
            <div
              className="mono"
              style={{
                marginTop: '8px',
                display: 'inline-flex',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--phosphor-green-border)',
                borderRadius: '2px',
                fontSize: '10px',
                color: 'var(--text-secondary)',
              }}
            >
              <span>
                FASTAPI: <strong style={{ color: 'var(--phosphor-green)' }}>ONLINE</strong>
              </span>
              <span>
                SQLITE:{' '}
                <strong style={{ color: 'var(--warm-neutral)' }}>
                  {backendHealth.databaseConnected ? `${backendHealth.telemetryRecordsCount} RECS` : 'OFFLINE'}
                </strong>
              </span>
              <span>
                SOURCE:{' '}
                <strong style={{ color: 'var(--signal-amber)' }}>
                  {backendHealth.activeSource ?? 'AWAITING_PACKETS'}
                </strong>
              </span>
              <span>
                ML: <strong style={{ color: 'var(--text-secondary)' }}>{backendHealth.mlStatus}</strong>
              </span>
              <span>
                BMS: <strong style={{ color: 'var(--text-secondary)' }}>{backendHealth.bmsStatus}</strong>
              </span>
            </div>
          )}
        </div>

        {/* DEMO / HARDWARE Mode Switch */}
        <div className="page-header__controls">
          <div
            role="group"
            aria-label="Edge AI data source mode"
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
              onClick={() => handleSwitchMode('DEMO')}
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
              onClick={() => handleSwitchMode('HARDWARE')}
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

      {/* HEADER TECHNICAL METADATA STRIP */}
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
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>SYSTEM ID: </span>
            <strong style={{ color: 'var(--phosphor-green)' }}>BATTVISION-EDGE-01</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>CONTROLLER: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>ESP32-S3</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>EDGE PLATFORM: </span>
            <strong style={{ color: 'var(--signal-amber)' }}>LINUX SBC (PENDING)</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>INFERENCE MODE: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>LOCAL</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>NETWORK DEPENDENCY: </span>
            <strong style={{ color: 'var(--phosphor-green)' }}>NONE</strong>
          </span>
        </div>

        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
          COMPLEMENTARY DIAGNOSTIC LAYER · INDEPENDENT JK BMS RETAINS SAFETY PROTECTION
        </span>
      </div>

      {/* SECTION 4: CENTRAL 4-LAYER SYSTEM ARCHITECTURE VISUALISATION */}
      <SystemArchitectureDiagram
        blocks={architectureBlocks}
        selectedBlockId={selectedBlockId}
        dataSourceMode={dataSourceMode}
        onSelectBlock={setSelectedBlockId}
      />

      {/* SECTION 7: 9-STAGE TELEMETRY PROCESSING PIPELINE */}
      <TelemetryPipelineMonitor stages={pipelineStages} dataSourceMode={dataSourceMode} />

      {/* SECTION 5: EMBEDDED CONTROLLER PANEL — PCBCUPID GLYPH ESP32-S3 */}
      <EmbeddedControllerPanel
        controller={controllerStatus}
        sensorInterfaces={sensorInterfaces}
      />

      {/* SECTIONS 6 & 14: LINUX EDGE COMPUTER NODE & RESOURCE VISUALISATION */}
      <EdgeComputeAndResourcesPanel edgeNode={edgeNode} />

      {/* SECTIONS 8 & 9: LOCAL ML INFERENCE ENGINE & 8-STAGE MODEL LIFECYCLE */}
      <MlRuntimeAndLifecyclePanel runtime={mlRuntime} lifecycle={modelLifecycle} />

      {/* SECTIONS 10, 11, 12: OFFLINE AUTONOMY, LOCAL SQLITE STORAGE & COMM INTERFACES */}
      <StorageOfflineAndCommPanel database={databaseStatus} commLinks={commLinks} />

      {/* SECTION 13: EMBEDDED & EDGE SYSTEM EVENT LOG */}
      <EdgeSystemEventLog logs={edgeLogs} />
    </div>
  );
};
