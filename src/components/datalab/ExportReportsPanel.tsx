import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { BATTERY_PACK_SPEC } from '../../config/systemConfig';
import {
  exportCapacityTestsCsv,
  exportDatasetMetadataJson,
  exportExperimentSessionCsv,
  ExportOutcome,
  exportQualityReportJson,
  exportTelemetryRecordsCsv,
} from '../../services/dataExportService';
import {
  DataQualityReport,
  DatasetMetadata,
  ExperimentSession,
  LabCapacityTestRecord,
  TelemetryRecord,
} from '../../types/datalab';
import { DataSourceMode } from '../../types/telemetry';

interface ExportReportsPanelProps {
  records: TelemetryRecord[];
  sessions: ExperimentSession[];
  capacityTests: LabCapacityTestRecord[];
  datasets: DatasetMetadata[];
  qualityReport: DataQualityReport;
  dataSourceMode: DataSourceMode;
}

export const ExportReportsPanel: React.FC<ExportReportsPanelProps> = ({
  records,
  sessions,
  capacityTests,
  datasets,
  qualityReport,
  dataSourceMode,
}) => {
  const [lastExport, setLastExport] = useState<ExportOutcome | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id ?? '');

  const runExport = (outcome: ExportOutcome) => {
    setLastExport(outcome);
  };

  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) ?? sessions[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <section className="bv-panel" aria-label="Laboratory data export hub">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--phosphor" />
            <h2 className="bv-panel-title">EXPORT &amp; REPORTS // Offline File Generation</h2>
          </div>
          <span className="bv-badge bv-badge--muted">LOCAL STORAGE ARCHITECTURE READY</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lastExport && (
            <div
              className="mono"
              style={{
                padding: '9px 11px',
                fontSize: '11px',
                backgroundColor: lastExport.ok
                  ? 'var(--phosphor-green-dim)'
                  : 'var(--warning-red-dim)',
                border: `1px solid ${
                  lastExport.ok ? 'var(--phosphor-green-border)' : 'var(--warning-red-border)'
                }`,
                color: lastExport.ok ? 'var(--phosphor-green)' : 'var(--warning-red)',
              }}
            >
              {lastExport.ok
                ? `EXPORT COMPLETE: ${lastExport.filename} (${lastExport.recordCount} records)`
                : lastExport.message}
            </div>
          )}

          <div className="three-col-grid">
            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-color)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div className="micro-label">HISTORICAL TELEMETRY</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                  Full Multi-Channel CSV
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {records.length} records (V, I, P, SoC, 4×Temp, 6-DOF IMU)
                </div>
              </div>
              <button
                type="button"
                className="bv-btn bv-btn--active"
                onClick={() => runExport(exportTelemetryRecordsCsv(records))}
                disabled={records.length === 0}
              >
                <Download size={12} /> Export Telemetry CSV
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-color)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div className="micro-label">EXPERIMENT SESSION</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                  Single Session CSV
                </div>
                {sessions.length > 0 && (
                  <select
                    aria-label="Choose experiment session to export"
                    value={selectedSession?.id ?? ''}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="mono"
                    style={{
                      marginTop: '6px',
                      width: '100%',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      padding: '4px 6px',
                      fontSize: '10px',
                    }}
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} - {s.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="button"
                className="bv-btn bv-btn--active"
                onClick={() =>
                  selectedSession && runExport(exportExperimentSessionCsv(selectedSession))
                }
                disabled={!selectedSession}
              >
                <Download size={12} /> Export Session CSV
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-color)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div className="micro-label">CAPACITY TESTS</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                  Capacity &amp; SoH Records CSV
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {capacityTests.length} test record(s) with reference &amp; SoH %
                </div>
              </div>
              <button
                type="button"
                className="bv-btn bv-btn--active"
                onClick={() => runExport(exportCapacityTestsCsv(capacityTests))}
                disabled={capacityTests.length === 0}
              >
                <Download size={12} /> Export Capacity CSV
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-color)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div className="micro-label">DATASET METADATA</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                  Registry Schema JSON
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {datasets.length} registered datasets &amp; feature schemas
                </div>
              </div>
              <button
                type="button"
                className="bv-btn"
                onClick={() => runExport(exportDatasetMetadataJson(datasets))}
              >
                <Download size={12} /> Export Metadata JSON
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-color)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div className="micro-label">DATA QUALITY REPORT</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                  Completeness &amp; Validation JSON
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {qualityReport.overallCompletenessPct.toFixed(1)}% completeness ·{' '}
                  {qualityReport.issues.length} issue(s)
                </div>
              </div>
              <button
                type="button"
                className="bv-btn"
                onClick={() => runExport(exportQualityReportJson(qualityReport))}
              >
                <Download size={12} /> Export Quality JSON
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-color)', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div className="micro-label">PRINTABLE REPORT</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                  Laboratory Experiment Summary
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Opens browser print dialog for PDF / hardcopy lab report
                </div>
              </div>
              <button
                type="button"
                className="bv-btn"
                onClick={() => window.print()}
              >
                <Printer size={12} /> Print Summary View
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Printable Summary Preview Sheet */}
      <section className="bv-panel" aria-label="Printable experiment summary preview">
        <div className="bv-panel-header">
          <div className="bv-panel-title-group">
            <span className="status-led status-led--amber" />
            <h2 className="bv-panel-title">Printable Laboratory Summary Preview</h2>
          </div>
          <span className="bv-badge bv-badge--amber">
            {dataSourceMode === 'DEMO' ? 'DEMO DATASET SUMMARY' : 'HARDWARE SUMMARY'}
          </span>
        </div>
        <div className="bv-panel-body mono" style={{ fontSize: '11px', lineHeight: 1.65, color: 'var(--warm-neutral)' }}>
          <div>BATTVISION ENERGY SYSTEMS LAB - EXPERIMENTAL DATA SUMMARY</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            PACK: {BATTERY_PACK_SPEC.packId} ({BATTERY_PACK_SPEC.configuration}{' '}
            {BATTERY_PACK_SPEC.chemistry}, {BATTERY_PACK_SPEC.cellCount} × 32700,{' '}
            {BATTERY_PACK_SPEC.nominalVoltageV} V / {BATTERY_PACK_SPEC.nominalCapacityAh} Ah /{' '}
            {BATTERY_PACK_SPEC.nominalEnergyWh} Wh)
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            MODE: {dataSourceMode} · ACTIVE DATASET: {qualityReport.datasetName} · RECORDS:{' '}
            {qualityReport.totalRecords} · COMPLETENESS: {qualityReport.overallCompletenessPct.toFixed(1)}%
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            SESSIONS: {sessions.length} · CAPACITY TESTS: {capacityTests.length} · STORAGE: LOCAL
            VOLATILE DEMO BUFFER (SQLITE EDGE BACKEND PENDING)
          </div>
        </div>
      </section>
    </div>
  );
};
