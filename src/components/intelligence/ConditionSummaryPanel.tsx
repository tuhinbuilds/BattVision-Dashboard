import React from 'react';
import { BatteryConditionSummary } from '../../types/intelligence';

interface ConditionSummaryPanelProps {
  summary: BatteryConditionSummary;
}

export const ConditionSummaryPanel: React.FC<ConditionSummaryPanelProps> = ({ summary }) => {
  const fields = [
    { label: 'Overall Assessment', value: summary.overallAssessment, accent: true },
    { label: 'Data Quality', value: summary.dataQuality },
    { label: 'Estimation Availability', value: summary.estimationAvailability },
    { label: 'Model Availability', value: summary.modelAvailability, amber: true },
    { label: 'Sensor Completeness', value: summary.sensorCompleteness },
    { label: 'Last Valid Capacity Test', value: summary.lastValidCapacityTest },
    { label: 'Validated Ageing Records', value: `${summary.validatedAgeingRecords} RECORDS` },
  ];

  return (
    <section className="bv-panel" aria-label="Technical battery condition summary">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--amber" />
          <h2 className="bv-panel-title">Battery Condition Summary // Basis &amp; Availability</h2>
        </div>
        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
          EXPLICIT ENGINEERING BASIS · NO ARBITRARY AI HEALTH SCORE
        </span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          className="cond-summary-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '8px',
          }}
        >
          <style>{`
            @media (max-width: 1180px) {
              .cond-summary-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
            @media (max-width: 620px) {
              .cond-summary-grid {
                grid-template-columns: minmax(0, 1fr) !important;
              }
            }
          `}</style>
          {fields.map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '2px',
                padding: '9px 11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span className="micro-label" style={{ fontSize: '8.5px' }}>
                {item.label}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: item.amber
                    ? 'var(--signal-amber)'
                    : item.accent
                    ? 'var(--warm-neutral)'
                    : 'var(--text-primary)',
                }}
              >
                {item.value}
              </span>
            </div>
          ))}

          <div
            style={{
              backgroundColor: 'rgba(19, 22, 20, 0.72)',
              border: '1px dashed var(--border-color)',
              borderRadius: '2px',
              padding: '9px 11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span className="micro-label" style={{ fontSize: '8.5px' }}>
              Assessment Basis
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {summary.assessmentBasis}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
