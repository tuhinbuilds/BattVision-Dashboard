import React from 'react';
import {
  FeatureEpistemicCategory,
  IntelligenceInputFeature,
  PredictionReliabilityReport,
} from '../../types/intelligence';

interface ExplainabilityAndReliabilityProps {
  features: IntelligenceInputFeature[];
  reliability: PredictionReliabilityReport;
}

function categoryBadge(cat: FeatureEpistemicCategory) {
  switch (cat) {
    case 'DIRECT_SENSOR':
      return <span className="bv-badge bv-badge--phosphor">DIRECT SENSOR</span>;
    case 'CALCULATED':
      return <span className="bv-badge bv-badge--amber">CALCULATED</span>;
    case 'MODEL_ESTIMATE':
      return <span className="bv-badge bv-badge--muted">MODEL ESTIMATE</span>;
    case 'UNAVAILABLE':
    default:
      return <span className="bv-badge bv-badge--muted">UNAVAILABLE</span>;
  }
}

export const ExplainabilityAndReliability: React.FC<ExplainabilityAndReliabilityProps> = ({
  features,
  reliability,
}) => {
  return (
    <div className="two-col-grid">
      {/* SECTION 9: WHY THIS ESTIMATE? */}
      <section className="bv-panel" aria-label="Prediction explanation and input feature taxonomy">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--amber" />
            <h2 className="bv-panel-title">WHY THIS ESTIMATE? // Input Features</h2>
          </div>
          <span className="bv-badge bv-badge--muted">EXPLAINER PENDING MODEL</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            className="mono"
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--bg-recessed)',
              border: '1px dashed var(--border-strong)',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            MODEL EXPLANATIONS PENDING DEPLOYMENT: Feature-importance percentages are intentionally
            withheld and will populate only from a deployed, validated model&apos;s attribution output.
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Candidate Input Feature</th>
                  <th>Category</th>
                  <th>Observed State</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feat) => (
                  <tr key={feat.id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{feat.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {feat.sourceDetail}
                      </div>
                    </td>
                    <td>{categoryBadge(feat.category)}</td>
                    <td
                      className="mono"
                      style={{
                        fontSize: '10.5px',
                        color: feat.availableInCurrentMode
                          ? 'var(--warm-neutral)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {feat.currentValueLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 10: PREDICTION RELIABILITY (3 DISTINCT CONCEPTS) */}
      <section className="bv-panel" aria-label="Prediction reliability and uncertainty breakdown">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--amber" />
            <h2 className="bv-panel-title">PREDICTION RELIABILITY</h2>
          </div>
          <span className="bv-badge bv-badge--muted">NO SYNTHETIC CONFIDENCE %</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 1. DATA QUALITY */}
          <div
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderLeft: '3px solid var(--phosphor-green)',
              padding: '10px 12px',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                1. DATA QUALITY (SENSOR INPUT INTEGRITY)
              </span>
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--phosphor-green)' }}>
                {reliability.dataQuality.inputCompletenessLabel}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              MISSING: {reliability.dataQuality.missingMeasurements.join(' · ')}
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              STALE CHANNELS: {reliability.dataQuality.staleMeasurements.length || 'NONE DETECTED'}
            </div>
          </div>

          {/* 2. MODEL VALIDATION */}
          <div
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderLeft: '3px solid var(--signal-amber)',
              padding: '10px 12px',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                2. MODEL VALIDATION (EMPIRICAL EVIDENCE)
              </span>
              <span className="bv-badge bv-badge--amber">
                {reliability.modelValidation.modelAvailabilityLabel}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              TRAINING COVERAGE: {reliability.modelValidation.trainingDataCoverageLabel}
            </div>
          </div>

          {/* 3. PREDICTION UNCERTAINTY */}
          <div
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderLeft: '3px solid var(--border-strong)',
              padding: '10px 12px',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                3. PREDICTION UNCERTAINTY (CALIBRATED INTERVAL)
              </span>
              <span className="bv-badge bv-badge--muted">UNAVAILABLE</span>
            </div>
            <div className="mono" style={{ fontSize: '10px', color: 'var(--signal-amber)' }}>
              {reliability.predictionUncertainty.intervalSummary}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {reliability.predictionUncertainty.note}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
