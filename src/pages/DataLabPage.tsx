import React, { useMemo, useState } from 'react';
import { CapacityTestingLabPanel } from '../components/datalab/CapacityTestingLabPanel';
import { ChargeDischargeAnalysisPanel } from '../components/datalab/ChargeDischargeAnalysisPanel';
import { DataQualityInspectorPanel } from '../components/datalab/DataQualityInspectorPanel';
import { DatasetManagerAndImporter } from '../components/datalab/DatasetManagerAndImporter';
import { ExperimentRegistryPanel } from '../components/datalab/ExperimentRegistryPanel';
import { ExportReportsPanel } from '../components/datalab/ExportReportsPanel';
import { HistoricalTelemetryExplorer } from '../components/datalab/HistoricalTelemetryExplorer';
import { LabOverviewStrip } from '../components/datalab/LabOverviewStrip';
import { BATTERY_PACK_SPEC } from '../config/systemConfig';
import {
  exportCapacityTestsCsv,
  exportExperimentSessionCsv,
  exportTelemetryRecordsCsv,
} from '../services/dataExportService';
import {
  buildDemoCapacityTests,
  buildDemoDatasetRegistry,
  buildDemoExperimentSessions,
} from '../services/datalabSeedService';
import {
  analyzeDataQuality,
  historyToTelemetryRecords,
} from '../services/dataQualityService';
import { useTelemetry } from '../services/dataService';
import { formatTimeShort } from '../services/simulationService';
import {
  DatasetMetadata,
  ExperimentSession,
  LabCapacityTestRecord,
  LabSectionTab,
  TelemetryRecord,
} from '../types/datalab';

const LAB_TABS: { id: LabSectionTab; code: string; label: string }[] = [
  { id: 'historical', code: '01', label: 'Historical Telemetry' },
  { id: 'experiments', code: '02', label: 'Experiment Sessions' },
  { id: 'charge-discharge', code: '03', label: 'Charge/Discharge Analysis' },
  { id: 'capacity', code: '04', label: 'Capacity Testing' },
  { id: 'datasets', code: '05', label: 'Dataset Manager' },
  { id: 'quality', code: '06', label: 'Data Quality' },
  { id: 'exports', code: '07', label: 'Export & Reports' },
];

export const DataLabPage: React.FC = () => {
  const {
    history,
    sampleCount,
    dataSourceMode,
    setDataSourceMode,
    logEvent,
  } = useTelemetry();

  const [activeTab, setActiveTab] = useState<LabSectionTab>('historical');
  const [userSessions, setUserSessions] = useState<ExperimentSession[]>([]);
  const [demoSessionOverrides, setDemoSessionOverrides] = useState<
    Record<string, ExperimentSession>
  >({});
  const [userCapacityTests, setUserCapacityTests] = useState<LabCapacityTestRecord[]>([]);
  const [importedDatasets, setImportedDatasets] = useState<DatasetMetadata[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>('DS-DEMO-LIVE');
  const [lastImportLabel, setLastImportLabel] = useState<string>('NONE');

  const isDemo = dataSourceMode === 'DEMO';

  // Demo records are strictly withheld in HARDWARE mode
  const demoSessions = useMemo(
    () => (isDemo ? buildDemoExperimentSessions(sampleCount) : []),
    [isDemo, sampleCount]
  );

  const allSessions = useMemo(() => {
    const mergedDemo = demoSessions.map((s) => demoSessionOverrides[s.id] ?? s);
    return [...userSessions, ...mergedDemo];
  }, [userSessions, demoSessions, demoSessionOverrides]);

  const demoCapacityTests = useMemo(
    () => (isDemo ? buildDemoCapacityTests() : []),
    [isDemo]
  );

  const allCapacityTests = useMemo(
    () => [...userCapacityTests, ...demoCapacityTests],
    [userCapacityTests, demoCapacityTests]
  );

  const allDatasets = useMemo(() => {
    const base = isDemo
      ? buildDemoDatasetRegistry(history.length)
      : buildDemoDatasetRegistry(0).filter((d) => !d.simulated);
    return [...importedDatasets, ...base];
  }, [isDemo, history.length, importedDatasets]);

  // Active dataset records: either a user-imported CSV dataset OR the shared live demo buffer (empty in HARDWARE mode)
  const { activeRecords, activeDatasetName } = useMemo(() => {
    const imported = importedDatasets.find((d) => d.id === activeDatasetId);
    if (imported && imported.records) {
      return { activeRecords: imported.records, activeDatasetName: imported.name };
    }
    if (isDemo) {
      return {
        activeRecords: historyToTelemetryRecords(history),
        activeDatasetName: 'BattVision Live Simulation Buffer (DEMO)',
      };
    }
    return {
      activeRecords: [] as TelemetryRecord[],
      activeDatasetName: 'No Hardware Dataset Connected',
    };
  }, [importedDatasets, activeDatasetId, isDemo, history]);

  const qualityReport = useMemo(
    () => analyzeDataQuality(activeRecords, activeDatasetName),
    [activeRecords, activeDatasetName]
  );

  const handleCreateSession = (session: ExperimentSession) => {
    setUserSessions((prev) => [session, ...prev]);
    logEvent('LAB-EXP', 'DATA LAB', `Experiment session created: ${session.id} (${session.title}).`, 'INFO');
  };

  const handleUpdateSession = (updated: ExperimentSession) => {
    if (userSessions.some((s) => s.id === updated.id)) {
      setUserSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      setDemoSessionOverrides((prev) => ({ ...prev, [updated.id]: updated }));
    }
    logEvent('LAB-UPD', 'DATA LAB', `Experiment session updated: ${updated.id} (${updated.status}).`, 'INFO');
  };

  const handleImportDataset = (dataset: DatasetMetadata) => {
    setImportedDatasets((prev) => [dataset, ...prev]);
    setActiveDatasetId(dataset.id);
    setLastImportLabel(formatTimeShort(Date.now()));
    logEvent(
      'LAB-IMP',
      'DATA LAB',
      `Imported CSV dataset ${dataset.id} (${dataset.recordCount} rows).`,
      'NOMINAL'
    );
  };

  const handleAddCapacityTest = (test: LabCapacityTestRecord) => {
    setUserCapacityTests((prev) => [test, ...prev]);
    logEvent(
      'LAB-CAP',
      'DATA LAB',
      `Logged capacity test ${test.testId} (${test.measuredCapacityAh.toFixed(2)} Ah).`,
      'INFO'
    );
  };

  const lastSessionLabel = isDemo
    ? history.length
      ? formatTimeShort(history[history.length - 1].epochMs)
      : 'ACTIVE'
    : 'NONE';

  return (
    <div className="canvas-container page-enter">
      {/* SECTION 3: PAGE HEADER */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">MODULE 06 // RESEARCH &amp; EXPERIMENTATION WORKSTATION</span>
            <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
              <span
                className={`status-led ${
                  isDemo ? 'status-led--amber status-led--pulse' : 'status-led--offline'
                }`}
              />
              {isDemo ? 'DEMO DATASET' : 'HARDWARE MODE (OFFLINE)'}
            </span>
          </div>

          <h1 className="page-header__title">BATTERY DATA LABORATORY</h1>
          <p className="page-header__subtitle">
            Experimental records, historical telemetry, capacity analysis and battery dataset management.
          </p>
        </div>

        {/* DEMO / HARDWARE Mode Toggle */}
        <div className="page-header__controls">
          <div
            role="group"
            aria-label="Data Laboratory source mode"
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
              onClick={() => setDataSourceMode('DEMO')}
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
              onClick={() => setDataSourceMode('HARDWARE')}
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

      {/* METADATA STRIP */}
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
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>LAB NODE: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>EDGE SYSTEM</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>DATA SOURCE: </span>
            <strong style={{ color: isDemo ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
              {isDemo ? 'DEMO / LOCAL RECORDS' : 'HARDWARE / LOCAL IMPORT'}
            </strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>STORAGE: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>LOCAL (SQLITE BACKEND PENDING)</strong>
          </span>
        </div>

        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
          ACTIVE DATASET: {activeDatasetName}
        </span>
      </div>

      {/* SECTION 4: LABORATORY OVERVIEW */}
      <LabOverviewStrip
        totalSamples={activeRecords.length}
        experimentCount={allSessions.length}
        capacityTestCount={allCapacityTests.length}
        datasetCount={allDatasets.length}
        lastImportLabel={lastImportLabel}
        lastSessionLabel={lastSessionLabel}
        dataSourceMode={dataSourceMode}
      />

      {/* SECTION 5: INTERNAL 7-TAB LABORATORY NAVIGATION */}
      <nav
        aria-label="Data Laboratory sections"
        className="bv-panel"
        style={{
          padding: '5px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '4px',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        {LAB_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`bv-btn ${active ? 'bv-btn--active' : ''}`}
              style={{
                padding: '5px 8px',
                fontSize: '9.5px',
                letterSpacing: '0.04em',
                border: active ? '1px solid var(--phosphor-green-border)' : '1px solid transparent',
                backgroundColor: active ? 'var(--phosphor-green-dim)' : 'transparent',
              }}
              aria-current={active ? 'page' : undefined}
            >
              <span style={{ opacity: 0.65 }}>{tab.code}</span>
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ACTIVE LABORATORY SECTION */}
      {activeTab === 'historical' && (
        <HistoricalTelemetryExplorer
          records={activeRecords}
          activeDatasetName={activeDatasetName}
          dataSourceMode={dataSourceMode}
          onExportVisibleCsv={(visible) => {
            exportTelemetryRecordsCsv(visible, 'battvision_historical_visible');
            logEvent('LAB-CSV', 'DATA LAB', `Exported ${visible.length} visible historical telemetry rows.`, 'INFO');
          }}
        />
      )}

      {activeTab === 'experiments' && (
        <ExperimentRegistryPanel
          sessions={allSessions}
          dataSourceMode={dataSourceMode}
          onCreateSession={handleCreateSession}
          onUpdateSession={handleUpdateSession}
          onExportSession={(session) => {
            exportExperimentSessionCsv(session);
            logEvent('LAB-CSV', 'DATA LAB', `Exported experiment session ${session.id} as CSV.`, 'INFO');
          }}
        />
      )}

      {activeTab === 'charge-discharge' && (
        <ChargeDischargeAnalysisPanel
          records={activeRecords}
          dataSourceMode={dataSourceMode}
        />
      )}

      {activeTab === 'capacity' && (
        <CapacityTestingLabPanel
          tests={allCapacityTests}
          dataSourceMode={dataSourceMode}
          onAddCapacityTest={handleAddCapacityTest}
          onExportTests={() => {
            exportCapacityTestsCsv(allCapacityTests);
            logEvent('LAB-CSV', 'DATA LAB', `Exported ${allCapacityTests.length} capacity test records.`, 'INFO');
          }}
        />
      )}

      {activeTab === 'datasets' && (
        <DatasetManagerAndImporter
          datasets={allDatasets}
          activeDatasetId={activeDatasetId}
          onSelectActiveDataset={(id) => {
            setActiveDatasetId(id);
            setActiveTab('historical');
          }}
          onImportDataset={handleImportDataset}
        />
      )}

      {activeTab === 'quality' && <DataQualityInspectorPanel report={qualityReport} />}

      {activeTab === 'exports' && (
        <ExportReportsPanel
          records={activeRecords}
          sessions={allSessions}
          capacityTests={allCapacityTests}
          datasets={allDatasets}
          qualityReport={qualityReport}
          dataSourceMode={dataSourceMode}
        />
      )}
    </div>
  );
};
