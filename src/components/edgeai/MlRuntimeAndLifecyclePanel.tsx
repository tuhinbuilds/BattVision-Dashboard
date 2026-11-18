import React from 'react';
import { MLRuntimeStatus, ModelLifecycleStatus } from '../../types/edgeai';

interface MlRuntimeAndLifecyclePanelProps {
  runtime: MLRuntimeStatus;
  lifecycle: ModelLifecycleStatus;
}

const INFERENCE_STEPS = [
  '01 INPUT TELEMETRY',
  '02 FEATURE PREPARATION',
  '03 MODEL EXECUTION',
  '04 PREDICTION OUTPUT',
  '05 RESULT STORAGE',
  '06 DASHBOARD PRESENTATION',
];

export const MlRuntimeAndLifecyclePanel: React.FC<MlRuntimeAndLifecyclePanelProps> = ({
  runtime,
  lifecycle,
}) => {
  const runtimeRows = [
    ['Model Name', runtime.modelName],
    ['Model Type', runtime.modelType],
    ['Model Version', runtime.modelVersion],
    ['Runtime Framework', runtime.runtimeFramework],
    ['Model File Status', runtime.modelFileStatus],
    ['Deployment Status', runtime.deploymentStatus],
    ['Last Inference Timestamp', runtime.lastInferenceTimestamp],
    ['Inference Latency', runtime.inferenceLatency],
    ['Input Feature Availability', runtime.inputFeatureAvailability],
    ['Output Availability', runtime.outputAvailability],
  ];

  const provenanceRows = [
    { output: 'Voltage, Current, Temp, IMU', mechanism: 'Direct Sensor Measurement', status: 'Simulated (Hardware Pending)' },
    { output: 'Pack Power (W) & Thermal ΔT', mechanism: 'Deterministic Calculation', status: 'Active (Local Formula)' },
    { output: 'Threshold & Freshness Alerts', mechanism: 'Rule-Based Diagnostics', status: 'Active (Local Rule Engine)' },
    { output: 'State of Charge (SoC)', mechanism: 'Coulomb Counting + OCV Corr. (Initial Non-ML)', status: 'Simulated Demo Estimate' },
    { output: 'State of Health (SoH) & RUL', mechanism: 'Offline Edge ML Inference', status: 'MODEL NOT DEPLOYED' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="two-col-grid">
        {/* SECTION 8: LOCAL ML INFERENCE ENGINE */}
        <section className="bv-panel" aria-label="Local ML inference engine runtime">
          <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
            <div className="bv-panel-title-group">
              <span className="status-led status-led--offline" />
              <h2 className="bv-panel-title">LOCAL ML INFERENCE ENGINE</h2>
            </div>
            <span className="bv-badge bv-badge--amber">{runtime.statusLabel}</span>
          </div>

          <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 6-Step Inference Workflow */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {INFERENCE_STEPS.map((step, idx) => (
                <span
                  key={step}
                  className={`bv-badge ${idx < 2 ? 'bv-badge--amber' : 'bv-badge--muted'}`}
                  style={{ fontSize: '8.5px' }}
                >
                  {step}
                </span>
              ))}
            </div>

            {/* 10 Runtime Metadata Fields */}
            <div
              className="mono"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '6px',
                fontSize: '10px',
              }}
            >
              {runtimeRows.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-subtle)',
                    padding: '7px 9px',
                  }}
                >
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {k}
                  </div>
                  <div style={{ color: v === 'N/A' ? 'var(--text-secondary)' : 'var(--warm-neutral)', marginTop: '2px' }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {/* Output Provenance Table (ML vs Rule-Based vs Direct Sensor) */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Output Category</th>
                    <th>Computation Origin</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {provenanceRows.map((r) => (
                    <tr key={r.output}>
                      <td style={{ fontWeight: 500, fontSize: '11.5px' }}>{r.output}</td>
                      <td className="mono" style={{ fontSize: '10px', color: 'var(--warm-neutral)' }}>
                        {r.mechanism}
                      </td>
                      <td className="mono" style={{ fontSize: '10px', color: r.status === 'MODEL NOT DEPLOYED' ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
                        {r.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 9: MODEL LIFECYCLE MONITOR */}
        <section className="bv-panel" aria-label="8-stage model lifecycle monitor">
          <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
            <div className="bv-panel-title-group">
              <span className="status-led status-led--amber status-led--pulse" />
              <h2 className="bv-panel-title">MODEL LIFECYCLE MONITOR // 8-Stage Progression</h2>
            </div>
            <span className="bv-badge bv-badge--muted">STAGE 1 OF 8</span>
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
              {lifecycle.retrainingPolicyNote}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '7px' }}>
              {lifecycle.stages.map((st) => {
                const isCurrent = st.state === 'CURRENT';
                return (
                  <div
                    key={st.name}
                    style={{
                      backgroundColor: isCurrent ? 'var(--signal-amber-dim)' : 'var(--bg-recessed)',
                      border: `1px solid ${
                        isCurrent ? 'var(--signal-amber-border)' : 'var(--border-subtle)'
                      }`,
                      padding: '8px 10px',
                      borderRadius: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mono">
                      <span style={{ fontSize: '10px', fontWeight: 700, color: isCurrent ? 'var(--signal-amber)' : 'var(--warm-neutral)' }}>
                        0{st.index + 1}. {st.name}
                      </span>
                      <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
                        {st.phase}
                      </span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                      {st.summary}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
