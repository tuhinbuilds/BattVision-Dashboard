import React from 'react';
import { DiagnosticFinding } from '../../types/intelligence';

interface DiagnosticInsightsPanelProps {
  findings: DiagnosticFinding[];
}

export const DiagnosticInsightsPanel: React.FC<DiagnosticInsightsPanelProps> = ({ findings }) => {
  return (
    <section className="bv-panel" aria-label="Battery diagnostic insights">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">Battery Diagnostic Insights // Evidence-Based Observations</h2>
        </div>
        <span className="bv-badge bv-badge--muted">NOT A CERTIFIED FAULT DIAGNOSIS SYSTEM</span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {findings.map((finding) => {
          const sevBadge =
            finding.severity === 'WARNING'
              ? 'bv-badge--red'
              : finding.severity === 'ATTENTION'
              ? 'bv-badge--amber'
              : 'bv-badge--muted';

          return (
            <article
              key={finding.id}
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '2px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {finding.title}
                  </span>
                  <span className={`bv-badge ${sevBadge}`}>{finding.severity}</span>
                  <span className={`bv-badge ${finding.simulated ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                    {finding.simulated ? 'SIMULATED' : finding.dataSource}
                  </span>
                </div>

                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  TS: {finding.timestamp}
                </span>
              </div>

              <div className="mono" style={{ fontSize: '10.5px', color: 'var(--warm-neutral)' }}>
                SUPPORTING MEASUREMENT: {finding.supportingMeasurement}
              </div>

              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {finding.explanation}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
