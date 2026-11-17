import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import {
  applyColumnMappingToRecords,
  CANONICAL_CSV_FIELDS,
  parseAndValidateCsv,
} from '../../services/csvImportService';
import {
  CanonicalCsvField,
  CSVColumnMapping,
  DataImportResult,
  DatasetMetadata,
  MLPreparationConfig,
  MLSplitStrategy,
} from '../../types/datalab';

interface DatasetManagerAndImporterProps {
  datasets: DatasetMetadata[];
  activeDatasetId: string;
  onSelectActiveDataset: (id: string) => void;
  onImportDataset: (dataset: DatasetMetadata) => void;
}

const ML_STAGES = [
  'RAW DATA',
  'DATA VALIDATION',
  'CLEANING',
  'FEATURE SELECTION',
  'LABEL PREPARATION',
  'DATASET VERSIONING',
  'MODEL TRAINING',
];

const SAMPLE_CSV_CONTENT = [
  'timestamp,v_pack,i_pack,power,t1,t2,t3,t4,soc,cycle_number,discharge_capacity',
  '2026-11-18T02:00:00Z,25.84,11.2,289.4,28.1,29.3,29.6,28.4,82.0,1,23.38',
  '2026-11-18T02:00:10Z,25.81,11.5,296.8,28.2,29.4,29.7,28.5,81.8,1,23.38',
  '2026-11-18T02:00:20Z,25.78,12.1,311.9,28.3,29.6,29.9,28.6,81.5,1,23.38',
  '2026-11-18T02:00:30Z,25.75,11.8,303.9,28.4,29.7,30.1,28.6,81.3,1,23.38',
  '2026-11-18T02:00:40Z,25.73,12.4,319.1,28.5,29.9,30.2,28.7,81.0,1,23.38',
  '2026-11-18T02:00:50Z,25.70,12.0,308.4,28.6,30.0,30.4,28.8,80.8,1,23.38',
].join('\n');

export const DatasetManagerAndImporter: React.FC<DatasetManagerAndImporterProps> = ({
  datasets,
  activeDatasetId,
  onSelectActiveDataset,
  onImportDataset,
}) => {
  const [importDraft, setImportDraft] = useState<DataImportResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const [mlConfig, setMlConfig] = useState<MLPreparationConfig>({
    selectedDatasetId: activeDatasetId,
    selectedFeatures: ['Voltage', 'Current', 'Temperature', 'Charge/discharge history'],
    selectedTarget: null,
    splitStrategy: 'CYCLE_GROUPED',
  });

  const activeDs =
    datasets.find((d) => d.id === mlConfig.selectedDatasetId) ??
    datasets.find((d) => d.id === activeDatasetId) ??
    datasets[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError(null);
    setImportSuccess(null);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseAndValidateCsv(file.name, file.size, text);
      if (!parsed.ok) {
        setImportError(parsed.error ?? 'Failed to parse CSV file.');
        setImportDraft(null);
      } else {
        setImportDraft(parsed);
        setColumnMapping(parsed.suggestedMapping);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected file.');
      setImportDraft(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSampleCsv = () => {
    setImportError(null);
    setImportSuccess(null);
    const parsed = parseAndValidateCsv(
      'sample_bv_8s4p_bench_import.csv',
      SAMPLE_CSV_CONTENT.length,
      SAMPLE_CSV_CONTENT
    );
    if (parsed.ok) {
      setImportDraft(parsed);
      setColumnMapping(parsed.suggestedMapping);
    }
  };

  const handleTestInvalidFile = () => {
    setImportSuccess(null);
    const parsed = parseAndValidateCsv('corrupted_export.txt', 120, 'not,a,valid');
    setImportDraft(null);
    setImportError(parsed.error ?? 'Invalid file rejected.');
  };

  const handleConfirmImport = () => {
    if (!importDraft) return;
    const records = applyColumnMappingToRecords(importDraft.rawRows, columnMapping);
    const mappedTargets = Object.values(columnMapping).filter((v) => v !== '__unmapped__');
    const hasCapacityLabel = mappedTargets.includes('discharge_capacity');
    const hasSocLabel = mappedTargets.includes('state_of_charge');
    const targetLabels: string[] = [];
    if (hasSocLabel) targetLabels.push('state_of_charge');
    if (hasCapacityLabel) targetLabels.push('discharge_capacity (SoH candidate)');

    const newDataset: DatasetMetadata = {
      id: `DS-CSV-${String(datasets.length + 1).padStart(2, '0')}`,
      name: `Imported CSV: ${importDraft.filename}`,
      category: 'Imported CSV records',
      source: `Local CSV Import (${importDraft.filename})`,
      chemistry: 'LiFePO4 (User Imported)',
      cellFormat: '32700 (8S4P Assumed — Verify)',
      recordCount: records.length,
      features: mappedTargets.map((field) => ({
        name: field,
        canonicalField: field,
        unit: '',
        dataType: field === 'timestamp' ? 'timestamp' : 'number',
        available: true,
      })),
      targetLabels,
      samplingInterval: 'Derived from CSV timestamps',
      format: 'CSV (Mapped — Raw Preserved)',
      validationStatus: 'IMPORTED_UNVALIDATED',
      notes: `Imported ${records.length} rows (${importDraft.missingCount} missing cells, ${importDraft.duplicateTimestamps} duplicate timestamps). Original uploaded data preserved separately from mapped records.`,
      simulated: false,
      records,
    };

    onImportDataset(newDataset);
    setMlConfig((prev) => ({ ...prev, selectedDatasetId: newDataset.id }));
    setImportSuccess(
      `Imported "${importDraft.filename}" (${records.length} rows) as ${newDataset.id} and activated for Explorer & Data Quality inspection.`
    );
    setImportDraft(null);
  };

  const hasSocTarget = activeDs?.targetLabels.some((t) => t.toLowerCase().includes('soc') || t.toLowerCase().includes('charge')) ?? false;
  const hasSohTarget = activeDs?.targetLabels.some((t) => t.toLowerCase().includes('soh') || t.toLowerCase().includes('capacity')) ?? false;
  const hasRulTarget = activeDs?.targetLabels.some((t) => t.toLowerCase().includes('rul')) ?? false;

  const toggleMlFeature = (feat: string) => {
    setMlConfig((prev) => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.includes(feat)
        ? prev.selectedFeatures.filter((f) => f !== feat)
        : [...prev.selectedFeatures, feat],
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* SECTION 10: BATTERY DATASET MANAGER */}
      <section className="bv-panel" aria-label="Battery dataset manager">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--phosphor" />
            <h2 className="bv-panel-title">BATTERY DATASET MANAGER // Local Registry</h2>
            <span className="bv-badge bv-badge--muted">{datasets.length} DATASETS</span>
          </div>
          <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
            CLICK A DATASET TO INSPECT IN HISTORICAL EXPLORER &amp; DATA QUALITY
          </span>
        </div>

        <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bv-table">
            <thead>
              <tr>
                <th>Dataset ID</th>
                <th>Name &amp; Category</th>
                <th>Chemistry / Format</th>
                <th>Records</th>
                <th>Target Labels</th>
                <th>Validation</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => {
                const isSelected = ds.id === activeDatasetId;
                return (
                  <tr
                    key={ds.id}
                    style={{
                      backgroundColor: isSelected ? 'rgba(184, 214, 90, 0.08)' : undefined,
                    }}
                  >
                    <td className="mono" style={{ fontWeight: 700, color: 'var(--warm-neutral)' }}>
                      {ds.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{ds.name}</div>
                      <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                        {ds.category} · {ds.source}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {ds.notes}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      {ds.chemistry}
                      <br />
                      <span style={{ color: 'var(--text-muted)' }}>{ds.cellFormat}</span>
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {ds.recordCount.toLocaleString()}
                    </td>
                    <td className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {ds.targetLabels.length ? ds.targetLabels.join(', ') : 'NONE'}
                    </td>
                    <td>
                      <span
                        className={`bv-badge ${
                          ds.validationStatus === 'VALIDATED'
                            ? 'bv-badge--phosphor'
                            : ds.validationStatus === 'NOT_DOWNLOADED'
                            ? 'bv-badge--muted'
                            : 'bv-badge--amber'
                        }`}
                      >
                        {ds.validationStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`bv-btn ${isSelected ? 'bv-btn--active' : ''}`}
                        disabled={ds.recordCount === 0}
                        onClick={() => onSelectActiveDataset(ds.id)}
                        style={{ padding: '4px 8px', fontSize: '9.5px', opacity: ds.recordCount > 0 ? 1 : 0.4 }}
                      >
                        {isSelected ? 'Active' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 11: ROBUST CSV DATA IMPORTER */}
      <section className="bv-panel" aria-label="CSV data importer with schema mapping">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <FileSpreadsheet size={14} style={{ color: 'var(--phosphor-green)' }} />
            <h2 className="bv-panel-title">CSV DATA IMPORT // Schema Detection &amp; Column Mapping</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <label className="bv-btn bv-btn--active" style={{ cursor: 'pointer' }}>
              <Upload size={12} />
              Select CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              className="bv-btn"
              onClick={handleLoadSampleCsv}
              title="Load a small illustrative CSV to demonstrate column mapping & validation"
            >
              Load Sample CSV (Demo)
            </button>
            <button
              type="button"
              className="bv-btn"
              onClick={handleTestInvalidFile}
              title="Verify invalid file rejection"
              style={{ fontSize: '9.5px' }}
            >
              Test Invalid File Rejection
            </button>
          </div>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {importError && (
            <div
              className="mono"
              style={{
                padding: '9px 11px',
                backgroundColor: 'var(--warning-red-dim)',
                border: '1px solid var(--warning-red-border)',
                color: 'var(--warning-red)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={14} />
              <span>IMPORT REJECTED: {importError}</span>
            </div>
          )}

          {importSuccess && (
            <div
              className="mono"
              style={{
                padding: '9px 11px',
                backgroundColor: 'var(--phosphor-green-dim)',
                border: '1px solid var(--phosphor-green-border)',
                color: 'var(--phosphor-green)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={14} />
              <span>{importSuccess}</span>
            </div>
          )}

          {!importDraft ? (
            <div className="mono" style={{ padding: '14px', backgroundColor: 'var(--bg-recessed)', border: '1px dashed var(--border-color)', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              Upload any local battery telemetry CSV file (up to 15 MB) to inspect headers, detect
              numeric/timestamp types, flag missing/duplicate timestamps, map custom column names to
              the BattVision schema, and preview rows before confirming import.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* File Summary */}
              <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', padding: '9px 11px', backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-color)', fontSize: '10.5px' }}>
                <span>FILE: <strong style={{ color: 'var(--phosphor-green)' }}>{importDraft.filename}</strong> ({importDraft.fileSizeBytes.toLocaleString()} B)</span>
                <span>ROWS: <strong>{importDraft.totalRows}</strong> · COLUMNS: <strong>{importDraft.headers.length}</strong></span>
                <span>MISSING: <strong>{importDraft.missingCount}</strong> · DUP TS: <strong>{importDraft.duplicateTimestamps}</strong> · INV TS: <strong>{importDraft.invalidTimestamps}</strong></span>
              </div>

              {importDraft.warnings.length > 0 && (
                <div className="mono" style={{ padding: '8px 10px', backgroundColor: 'var(--signal-amber-dim)', border: '1px solid var(--signal-amber-border)', fontSize: '10px', color: 'var(--signal-amber)' }}>
                  {importDraft.warnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                </div>
              )}

              {/* Column Mapping Grid */}
              <div>
                <div className="micro-label" style={{ marginBottom: '6px' }}>
                  COLUMN MAPPING (ORIGINAL HEADERS → BATTVISION SCHEMA)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                  {importDraft.headers.map((header) => (
                    <div
                      key={header}
                      style={{
                        backgroundColor: 'var(--bg-recessed)',
                        border: '1px solid var(--border-subtle)',
                        padding: '7px 9px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }} className="mono">
                        <strong style={{ color: 'var(--warm-neutral)' }}>{header}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>
                          [{importDraft.detectedTypes[header]}]
                        </span>
                      </div>
                      <select
                        aria-label={`Map column ${header}`}
                        value={columnMapping[header] ?? '__unmapped__'}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            [header]: e.target.value as CanonicalCsvField,
                          }))
                        }
                        className="mono"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                          border: '1px solid var(--border-color)',
                          padding: '4px 6px',
                          fontSize: '10px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {CANONICAL_CSV_FIELDS.map((opt) => (
                          <option key={opt.field} value={opt.field}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* First Rows Raw Preview */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                <table className="bv-table">
                  <thead>
                    <tr>
                      {importDraft.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importDraft.previewRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {importDraft.headers.map((h) => (
                          <td key={h} className="mono" style={{ fontSize: '10.5px' }}>
                            {row[h] || <span style={{ color: 'var(--warning-red)' }}>MISSING</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirm / Cancel */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="bv-btn" onClick={() => setImportDraft(null)}>
                  Cancel Import
                </button>
                <button type="button" className="bv-btn bv-btn--active" onClick={handleConfirmImport}>
                  Confirm &amp; Register Dataset
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 13: ML DATA PREPARATION */}
      <section className="bv-panel" aria-label="Machine learning data preparation">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--amber" />
            <h2 className="bv-panel-title">ML DATA PREPARATION // Pipeline Readiness (No Training Here)</h2>
          </div>
          <span className="bv-badge bv-badge--muted">LEAKAGE-SAFE SPLIT CONFIG</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 7-Stage Pipeline */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {ML_STAGES.map((st, idx) => (
              <span
                key={st}
                className={`bv-badge ${idx <= 3 ? 'bv-badge--amber' : 'bv-badge--muted'}`}
                style={{ fontSize: '9px' }}
              >
                {idx + 1}. {st}
              </span>
            ))}
          </div>

          <div className="two-col-grid">
            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-subtle)', padding: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="micro-label">CANDIDATE INPUT FEATURES ({activeDs?.name})</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {[
                  'Voltage',
                  'Current',
                  'Temperature',
                  'Cycle count',
                  'Charge/discharge history',
                  'Measured capacity',
                  'Historical degradation',
                ].map((f) => {
                  const selected = mlConfig.selectedFeatures.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleMlFeature(f)}
                      className={`bv-btn ${selected ? 'bv-btn--active' : ''}`}
                      style={{ padding: '4px 8px', fontSize: '10px' }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
              <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                CHEMISTRY: {activeDs?.chemistry} · RECORDS: {activeDs?.recordCount ?? 0} · PACK: BV-PACK-8S4P
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-recessed)', border: '1px solid var(--border-subtle)', padding: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="micro-label">CANDIDATE TARGETS (GATED BY LABEL AVAILABILITY)</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(
                  [
                    ['SoC', hasSocTarget],
                    ['SoH', hasSohTarget],
                    ['RUL', hasRulTarget],
                  ] as const
                ).map(([target, available]) => (
                  <button
                    key={target}
                    type="button"
                    disabled={!available}
                    onClick={() => setMlConfig((prev) => ({ ...prev, selectedTarget: target }))}
                    className={`bv-btn ${mlConfig.selectedTarget === target ? 'bv-btn--active' : ''}`}
                    style={{ padding: '4px 9px', fontSize: '10px', opacity: available ? 1 : 0.35 }}
                    title={
                      available
                        ? `Select ${target} target`
                        : `${target} target locked: required labelled records not present in selected dataset`
                    }
                  >
                    {target} {available ? '' : '(NO LABELS)'}
                  </button>
                ))}
              </div>

              <span className="micro-label" style={{ marginTop: '4px' }}>
                LEAKAGE-SAFE TRAIN/TEST SPLIT STRATEGY
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(
                  [
                    ['CYCLE_GROUPED', 'Cycle-Grouped Split'],
                    ['BATTERY_CELL_GROUPED', 'Battery / Cell-Grouped Split'],
                    ['CHRONOLOGICAL_HOLDOUT', 'Chronological Holdout'],
                  ] as [MLSplitStrategy, string][]
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMlConfig((prev) => ({ ...prev, splitStrategy: id }))}
                    className={`bv-btn ${mlConfig.splitStrategy === id ? 'bv-btn--active' : ''}`}
                    style={{ padding: '4px 8px', fontSize: '9.5px' }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="mono" style={{ fontSize: '9.5px', color: 'var(--signal-amber)' }}>
                DATA-LEAKAGE GUARD: Random splitting of adjacent time-series samples is disabled.
                Telemetry samples are not automatically treated as independent ageing labels.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
