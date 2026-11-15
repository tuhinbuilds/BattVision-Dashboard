import React from 'react';
import { ModelEvaluationMetrics, ModelMetadata } from '../../types/intelligence';

interface ModelStatusAndMetricsProps {
  metadata: ModelMetadata;
  metrics: ModelEvaluationMetrics;
}

const LIFECYCLE_STAGES = [
  'DATA COLLECTION',
  'DATA VALIDATION',
  'MODEL TRAINING',
  'MODEL EVALUATION',
  'EDGE DEPLOYMENT',
  'INFERENCE',
];

export const ModelStatusAndMetrics: React.FC<ModelStatusAndMetricsProps> = ({
  metadata,
  metrics,
}) => {
  const metaRows = [
    ['Model Name', metadata.modelName],
    ['Model Version', metadata.modelVersion],
    ['Model Type', metadata.modelType],
    ['Training Dataset', metadata.trainingDataset],
    ['Training Date', metadata.trainingDate],
    ['Validation Status', metadata.validationStatus],
    ['Last Inference Time', metadata.lastInferenceTime],
    ['Inference Latency', metadata.inferenceLatency],
    ['Runtime Environment', metadata.runtimeEnvironment],
    ['Input Feature Availability', metadata.inputFeatureAvailability],
  ];

  const metricGlossary = [
    {
      symbol: 'MAE',
      name: 'Mean Absolute Error',
      value: metrics.mae,
      desc: 'Average absolute magnitude of capacity/RUL prediction error in physical units (Ah or cycles).',
    },
    {
      symbol: 'RMSE',
      name: 'Root Mean Square Error',
      value: metrics.rmse,
      desc: 'Square-root of mean squared residuals; penalizes large prognostic outliers more strongly than MAE.',
    },
    {
      symbol: 'R²',
      name: 'Coefficient of Determination',
      value: metrics.r2,
      desc: 'Proportion of variance in experimental capacity or cycle-life labels explained by the model.',
    },
  ];

  return (
    <div className="two-col-grid">
      {/* SECTION 8: EDGE AI MODEL STATUS */}
      <section className="bv-panel" aria-label="Edge AI model status and lifecycle">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--offline" />
            <h2 className="bv-panel-title">EDGE AI MODEL STATUS</h2>
          </div>
          <span className="bv-badge bv-badge--amber">{metadata.statusLabel}</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 6-Stage Model Lifecycle Pipeline */}
          <div
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              padding: '10px',
              borderRadius: '2px',
            }}
          >
            <div className="micro-label" style={{ marginBottom: '8px', fontSize: '9px' }}>
              MODEL LIFECYCLE PIPELINE (CURRENT STAGE: 01 — DATA COLLECTION PREP)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '6px',
              }}
            >
              {LIFECYCLE_STAGES.map((stage, idx) => {
                const isCurrent = idx === metadata.currentLifecycleStageIndex;
                return (
                  <div
                    key={stage}
                    className="mono"
                    style={{
                      padding: '6px 7px',
                      borderRadius: '2px',
                      border: `1px solid ${
                        isCurrent ? 'var(--signal-amber-border)' : 'var(--border-subtle)'
                      }`,
                      backgroundColor: isCurrent
                        ? 'var(--signal-amber-dim)'
                        : 'rgba(32, 36, 32, 0.5)',
                      fontSize: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: isCurrent ? 'var(--signal-amber)' : 'var(--text-muted)',
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    <span
                      className={`status-led ${
                        isCurrent ? 'status-led--amber status-led--pulse' : 'status-led--offline'
                      }`}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {idx + 1}. {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 10 Model Metadata Rows */}
          <div
            className="mono"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '6px',
              fontSize: '10.5px',
            }}
          >
            {metaRows.map(([k, v]) => (
              <div
                key={k}
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                  padding: '7px 9px',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {k}
                </span>
                <span style={{ color: v === 'N/A' ? 'var(--text-secondary)' : 'var(--warm-neutral)' }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 13: MODEL PERFORMANCE PANEL */}
      <section className="bv-panel" aria-label="Model validation performance metrics">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--offline" />
            <h2 className="bv-panel-title">Model Performance // Validation Metrics</h2>
          </div>
          <span className="bv-badge bv-badge--muted">NOT AVAILABLE</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            className="mono"
            style={{
              padding: '9px 11px',
              backgroundColor: 'var(--bg-recessed)',
              border: '1px dashed var(--signal-amber-border)',
              borderRadius: '2px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--signal-amber)',
              letterSpacing: '0.07em',
            }}
          >
            VALIDATION METRICS NOT AVAILABLE — NO TRAINED MODEL DEPLOYED
          </div>

          {/* MAE / RMSE / R² Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            {metricGlossary.map((m) => (
              <div
                key={m.symbol}
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-color)',
                  padding: '10px',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                    {m.symbol}
                  </span>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {m.value}
                  </span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {m.name}
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Evaluation Metadata Table */}
          <div
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-subtle)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '10.5px',
            }}
          >
            {[
              ['Evaluation Dataset', metrics.evaluationDataset],
              ['Train / Test Split Strategy', metrics.splitStrategy],
              ['Number of Evaluated Records', metrics.evaluatedRecords],
              ['Validation Date', metrics.validationDate],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k.toUpperCase()}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
