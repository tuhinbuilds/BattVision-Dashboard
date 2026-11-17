import React from 'react';
import { DataQualityReport, DataValidationStatus } from '../../types/datalab';

interface DataQualityInspectorPanelProps {
  report: DataQualityReport;
}

function statusBadge(status: DataValidationStatus) {
  switch (status) {
    case 'VALID':
      return <span className="bv-badge bv-badge--phosphor">VALID</span>;
    case 'WARNING':
      return <span className="bv-badge bv-badge--amber">WARNING</span>;
    case 'INVALID':
      return <span className="bv-badge bv-badge--red">INVALID</span>;
    case 'NOT_EVALUATED':
    default:
      return <span className="bv-badge bv-badge--muted">NOT EVALUATED</span>;
  }
}

export const DataQualityInspectorPanel: React.FC<DataQualityInspectorPanelProps> = ({ report }) => {
  const summaryStats = [
    { k: 'Total Records', v: report.totalRecords.toLocaleString() },
    { k: 'Overall Completeness', v: `${report.overallCompletenessPct.toFixed(1)}%` },
    { k: 'Missing Values', v: String(report.missingValuesTotal) },
    { k: 'Duplicate Timestamps', v: String(report.duplicateTimestamps) },
    { k: 'Invalid Timestamps', v: String(report.invalidTimestamps) },
    { k: 'Out-of-Range Values', v: String(report.outOfRangeTotal) },
    { k: 'Missing Channels', v: String(report.missingChannels.length) },
    { k: 'Sampling Irregularities', v: String(report.samplingIrregularities) },
  ];

  return (
    <section className="bv-panel" aria-label="Data quality and validation inspector">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              report.totalRecords > 0 ? 'status-led--phosphor' : 'status-led--offline'
            }`}
          />
          <h2 className="bv-panel-title">DATA QUALITY &amp; VALIDATION // {report.datasetName}</h2>
        </div>
        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
          DATA-QUALITY ISSUES ARE DISTINCT FROM PHYSICAL BATTERY FAULTS
        </span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* 8 Summary Metrics */}
        <div className="four-col-grid">
          {summaryStats.map((s) => (
            <div
              key={s.k}
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                padding: '9px 11px',
              }}
            >
              <div className="micro-label" style={{ fontSize: '8.5px' }}>
                {s.k}
              </div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 600, marginTop: '3px', color: 'var(--warm-neutral)' }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>

        {/* Validation Issues */}
        {report.issues.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="micro-label">VALIDATION FINDINGS ({report.issues.length})</span>
            {report.issues.map((issue) => (
              <div
                key={issue.id}
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>
                  <strong className="mono" style={{ color: 'var(--warm-neutral)' }}>
                    [{issue.field}]
                  </strong>{' '}
                  {issue.detail}
                </div>
                {statusBadge(issue.status)}
              </div>
            ))}
          </div>
        )}

        {/* Per-Column Completeness Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
          <table className="bv-table">
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Type</th>
                <th>Available</th>
                <th>Missing</th>
                <th>Completeness</th>
                <th>Validation Status</th>
              </tr>
            </thead>
            <tbody>
              {report.columns.map((col) => (
                <tr key={col.columnName}>
                  <td className="mono" style={{ fontWeight: 600, color: 'var(--warm-neutral)' }}>
                    {col.columnName}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {col.dataType}
                  </td>
                  <td className="mono">{col.availableCount}</td>
                  <td className="mono" style={{ color: col.missingCount > 0 ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
                    {col.missingCount}
                  </td>
                  <td style={{ minWidth: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '7px',
                          backgroundColor: '#101311',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div
                          style={{
                            width: `${col.completenessPct}%`,
                            height: '100%',
                            backgroundColor:
                              col.status === 'VALID'
                                ? 'var(--phosphor-green)'
                                : col.status === 'WARNING'
                                ? 'var(--signal-amber)'
                                : col.status === 'INVALID'
                                ? 'var(--warning-red)'
                                : 'var(--text-muted)',
                          }}
                        />
                      </div>
                      <span className="mono" style={{ fontSize: '10px', width: '42px', textAlign: 'right' }}>
                        {col.completenessPct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td>{statusBadge(col.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
