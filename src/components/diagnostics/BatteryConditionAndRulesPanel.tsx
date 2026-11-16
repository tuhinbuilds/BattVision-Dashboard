import React from 'react';
import {
  DiagnosticEvaluation,
  DiagnosticThresholdsConfig,
} from '../../types/diagnostics';
import { SeverityPill } from './DiagnosticStatusOverview';

interface BatteryConditionAndRulesPanelProps {
  evaluations: DiagnosticEvaluation[];
  thresholds: DiagnosticThresholdsConfig;
  onChangeThresholds: (next: DiagnosticThresholdsConfig) => void;
  onResetThresholds: () => void;
}

export const BatteryConditionAndRulesPanel: React.FC<BatteryConditionAndRulesPanelProps> = ({
  evaluations,
  thresholds,
  onChangeThresholds,
  onResetThresholds,
}) => {
  const passCount = evaluations.filter((e) => e.outcome === 'PASS').length;
  const triggeredCount = evaluations.filter((e) => e.outcome === 'TRIGGERED').length;
  const notEvalCount = evaluations.filter((e) => e.outcome === 'NOT_EVALUATED').length;

  return (
    <section className="bv-panel" aria-label="Battery condition monitoring and diagnostic rule engine">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">
            BATTERY CONDITION MONITORING &amp; DIAGNOSTIC RULE ENGINE
          </h2>
        </div>
        <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          {passCount} PASS ·{' '}
          <strong style={{ color: triggeredCount > 0 ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
            {triggeredCount} TRIGGERED
          </strong>{' '}
          · {notEvalCount} NOT EVALUATED
        </div>
      </div>

      {/* Configurable Illustrative Monitoring Thresholds */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 20, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span className="mono" style={{ fontSize: '9.5px', color: 'var(--signal-amber)' }}>
            CONFIGURABLE ILLUSTRATIVE DEMO THRESHOLDS (UI MONITORING ONLY · NOT MANUFACTURER OR BMS PROTECTION LIMITS)
          </span>
          <button
            type="button"
            className="bv-btn"
            onClick={onResetThresholds}
            style={{ padding: '3px 8px', fontSize: '9.5px' }}
          >
            Reset Defaults
          </button>
        </div>

        <div
          className="threshold-controls-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '10px',
          }}
        >
          <style>{`
            @media (max-width: 1080px) {
              .threshold-controls-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
          `}</style>

          {[
            {
              id: 'thr-temp',
              label: 'Temp Warning (°C)',
              value: thresholds.tempWarnC,
              min: 28,
              max: 48,
              step: 0.5,
              unit: '°C',
              onChange: (val: number) =>
                onChangeThresholds({ ...thresholds, tempWarnC: val }),
            },
            {
              id: 'thr-vhi',
              label: 'Pack Voltage High (V)',
              value: thresholds.packVoltageHighV,
              min: 26.0,
              max: 29.2,
              step: 0.2,
              unit: 'V',
              onChange: (val: number) =>
                onChangeThresholds({ ...thresholds, packVoltageHighV: val }),
            },
            {
              id: 'thr-vlo',
              label: 'Pack Voltage Low (V)',
              value: thresholds.packVoltageLowV,
              min: 20.0,
              max: 25.0,
              step: 0.2,
              unit: 'V',
              onChange: (val: number) =>
                onChangeThresholds({ ...thresholds, packVoltageLowV: val }),
            },
            {
              id: 'thr-curr',
              label: 'Current High Limit (A)',
              value: thresholds.currentHighA,
              min: 10,
              max: 45,
              step: 1,
              unit: 'A',
              onChange: (val: number) =>
                onChangeThresholds({ ...thresholds, currentHighA: val }),
            },
          ].map((ctrl) => (
            <label
              key={ctrl.id}
              htmlFor={ctrl.id}
              style={{
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '2px',
                padding: '7px 9px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="micro-label" style={{ fontSize: '8.5px' }}>
                  {ctrl.label}
                </span>
                <strong className="mono" style={{ fontSize: '11px', color: 'var(--warm-neutral)' }}>
                  {ctrl.value.toFixed(1)} {ctrl.unit}
                </strong>
              </div>
              <input
                id={ctrl.id}
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={ctrl.value}
                onChange={(e) => ctrl.onChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#E69A42', cursor: 'pointer' }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Rule Evaluation Table */}
      <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="bv-table">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Diagnostic Rule &amp; Condition</th>
              <th>Source</th>
              <th>Observed Value</th>
              <th>Rule Severity</th>
              <th>Evaluation Outcome</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((ev) => (
              <tr key={ev.rule.ruleId}>
                <td className="mono" style={{ fontWeight: 700, color: 'var(--warm-neutral)', whiteSpace: 'nowrap' }}>
                  {ev.rule.ruleId}
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                    {ev.rule.ruleName}
                  </div>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    COND: {ev.rule.comparisonCondition} · {ev.statusMessage}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  {ev.rule.measurementSource}
                </td>
                <td className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {ev.observedValueLabel}
                </td>
                <td>
                  <SeverityPill severity={ev.rule.severity} />
                </td>
                <td>
                  {ev.outcome === 'PASS' ? (
                    <span className="bv-badge bv-badge--phosphor">PASS</span>
                  ) : ev.outcome === 'TRIGGERED' ? (
                    <span
                      className={`bv-badge ${
                        ev.rule.severity === 'CRITICAL' ? 'bv-badge--red' : 'bv-badge--amber'
                      }`}
                    >
                      TRIGGERED
                    </span>
                  ) : (
                    <span className="bv-badge bv-badge--muted">NOT EVALUATED</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
