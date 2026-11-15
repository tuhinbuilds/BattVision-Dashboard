import React from 'react';

const WORKFLOW_STEPS = [
  { num: '01', title: 'Collect Battery Telemetry', phase: 'OFFLINE DATA' },
  { num: '02', title: 'Store Experimental Records', phase: 'OFFLINE DATA' },
  { num: '03', title: 'Obtain Valid Capacity & Ageing Labels', phase: 'LAB TESTING' },
  { num: '04', title: 'Prepare & Validate Dataset', phase: 'WORKSTATION' },
  { num: '05', title: 'Train Candidate Models on Workstation', phase: 'WORKSTATION' },
  { num: '06', title: 'Evaluate via Holdout / Cross-Validation', phase: 'WORKSTATION' },
  { num: '07', title: 'Compare Candidate vs. Current Model', phase: 'APPROVAL GATE' },
  { num: '08', title: 'Deploy Approved Model to Linux Edge SBC', phase: 'EDGE DEPLOY' },
  { num: '09', title: 'Perform Offline Inference During Operation', phase: 'EDGE RUNTIME' },
];

export const MlWorkflowPanel: React.FC = () => {
  return (
    <section className="bv-panel" aria-label="BattVision ML training and edge deployment workflow">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">
            Model Training &amp; Retraining Workflow // Decoupled Architecture
          </h2>
        </div>
        <span className="bv-badge bv-badge--muted">VISUAL WORKFLOW REFERENCE</span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          className="mono"
          style={{
            padding: '8px 10px',
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '2px solid var(--phosphor-green)',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          ARCHITECTURE PRINCIPLE: Inference and model retraining are strictly separate processes.
          BattVision never performs continuous online retraining while the EV is operating — new
          candidate models are trained and validated offline on a workstation before manual approval
          and deployment to the Linux edge computer.
        </div>

        <div
          className="ml-workflow-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '8px',
          }}
        >
          <style>{`
            @media (max-width: 960px) {
              .ml-workflow-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
            @media (max-width: 580px) {
              .ml-workflow-grid {
                grid-template-columns: minmax(0, 1fr) !important;
              }
            }
          `}</style>
          {WORKFLOW_STEPS.map((step, idx) => {
            const isEdgeStep = idx >= 7;
            return (
              <div
                key={step.num}
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: `1px solid ${
                    isEdgeStep ? 'var(--phosphor-green-border)' : 'var(--border-subtle)'
                  }`,
                  borderRadius: '2px',
                  padding: '9px 11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: isEdgeStep ? 'var(--phosphor-green)' : 'var(--signal-amber)',
                    }}
                  >
                    STEP {step.num}
                  </span>
                  <span className="mono" style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                    {step.phase}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {step.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
