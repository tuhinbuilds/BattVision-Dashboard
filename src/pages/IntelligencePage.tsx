import React, { useMemo, useState } from 'react';
import { ConditionSummaryPanel } from '../components/intelligence/ConditionSummaryPanel';
import { DegradationChartsPanel } from '../components/intelligence/DegradationChartsPanel';
import { DiagnosticInsightsPanel } from '../components/intelligence/DiagnosticInsightsPanel';
import { ExplainabilityAndReliability } from '../components/intelligence/ExplainabilityAndReliability';
import { MainIntelligenceInstruments } from '../components/intelligence/MainIntelligenceInstruments';
import { MlWorkflowPanel } from '../components/intelligence/MlWorkflowPanel';
import { ModelStatusAndMetrics } from '../components/intelligence/ModelStatusAndMetrics';
import { RulTrajectoryPanel } from '../components/intelligence/RulTrajectoryPanel';
import { BATTERY_PACK_SPEC } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { buildBatteryHealthEstimate } from '../services/intelligenceService';

export const IntelligencePage: React.FC = () => {
  const {
    telemetry,
    history,
    activeSensorStatuses,
    dataSourceMode,
    setDataSourceMode,
  } = useTelemetry();

  // Configurable End-of-Life capacity assumption (default 80%, adjustable 75% / 80% / 85%)
  const [eolThresholdPct, setEolThresholdPct] = useState<number>(80);

  const isDemo = dataSourceMode === 'DEMO';

  // Presentation-independent prognostics calculation service
  const healthEstimate = useMemo(
    () =>
      buildBatteryHealthEstimate(
        telemetry,
        history,
        activeSensorStatuses,
        dataSourceMode,
        eolThresholdPct
      ),
    [telemetry, history, activeSensorStatuses, dataSourceMode, eolThresholdPct]
  );

  return (
    <div className="canvas-container page-enter">
      {/* SECTION 3: PAGE HEADER */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">MODULE 04 // PROGNOSTICS &amp; EDGE AI WORKSTATION</span>
            <span className="bv-badge bv-badge--muted">MODEL STATUS: NOT CONNECTED</span>
          </div>

          <h1 className="page-header__title">BATTERY INTELLIGENCE CENTRE</h1>
          <p className="page-header__subtitle">
            Battery condition estimation, degradation analysis and predictive intelligence.
          </p>
        </div>

        {/* DEMO / HARDWARE Mode Switch */}
        <div className="page-header__controls">
          <div
            role="group"
            aria-label="Intelligence data source mode"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setDataSourceMode('DEMO')}
              className={`bv-btn ${isDemo ? 'bv-btn--amber' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor: isDemo ? 'var(--signal-amber-dim)' : 'transparent',
              }}
            >
              DEMO MODE
            </button>
            <button
              type="button"
              onClick={() => setDataSourceMode('HARDWARE')}
              className={`bv-btn ${!isDemo ? 'bv-btn--active' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor: !isDemo ? 'var(--phosphor-green-dim)' : 'transparent',
              }}
            >
              HARDWARE MODE
            </button>
          </div>
        </div>
      </div>

      {/* METADATA & ILLUSTRATIVE DISCLAIMER STRIP */}
      <div
        className="bv-panel mono"
        style={{
          padding: '8px 14px',
          backgroundColor: '#1B1F1C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>PACK ID: </span>
            <strong style={{ color: 'var(--phosphor-green)' }}>{BATTERY_PACK_SPEC.packId}</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>CHEMISTRY: </span>
            <strong style={{ color: 'var(--warm-neutral)' }}>{BATTERY_PACK_SPEC.chemistry}</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>MODEL STATUS: </span>
            <strong style={{ color: 'var(--signal-amber)' }}>NOT CONNECTED</strong>
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>INFERENCE MODE: </span>
            <strong style={{ color: isDemo ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
              {isDemo ? 'DEMO' : 'HARDWARE (OFFLINE)'}
            </strong>
          </span>
        </div>

        {isDemo ? (
          <span className="bv-badge bv-badge--amber">
            ILLUSTRATIVE DEMO OUTPUT - NOT A VALIDATED MODEL PREDICTION
          </span>
        ) : (
          <span className="bv-badge bv-badge--muted">
            HARDWARE MODE - NO MODEL OR BACKEND DATA CONNECTED
          </span>
        )}
      </div>

      {/* SECTION 4: THREE MAJOR DIAGNOSTIC INSTRUMENTS (SoC / SoH / RUL) */}
      <MainIntelligenceInstruments
        estimate={healthEstimate}
        eolThresholdPct={eolThresholdPct}
        onChangeEolThreshold={setEolThresholdPct}
      />

      {/* SECTION 5: BATTERY CONDITION SUMMARY */}
      <ConditionSummaryPanel summary={healthEstimate.conditionSummary} />

      {/* SECTION 6: BATTERY DEGRADATION ANALYSIS (CAPACITY + SOH TREND) */}
      <DegradationChartsPanel
        records={healthEstimate.capacityRecords}
        dataSourceMode={dataSourceMode}
        eolThresholdPct={eolThresholdPct}
      />

      {/* SECTION 7: RUL PREDICTION VISUALISATION */}
      <RulTrajectoryPanel
        trajectory={healthEstimate.degradationTrajectory}
        rul={healthEstimate.rul}
        dataSourceMode={dataSourceMode}
      />

      {/* SECTIONS 8 & 13: EDGE AI MODEL STATUS + MODEL PERFORMANCE PANEL */}
      <ModelStatusAndMetrics
        metadata={healthEstimate.modelMetadata}
        metrics={healthEstimate.evaluationMetrics}
      />

      {/* SECTIONS 9 & 10: WHY THIS ESTIMATE? + PREDICTION RELIABILITY */}
      <ExplainabilityAndReliability
        features={healthEstimate.inputFeatures}
        reliability={healthEstimate.reliability}
      />

      {/* SECTION 11: BATTERY DIAGNOSTIC INSIGHTS */}
      <DiagnosticInsightsPanel findings={healthEstimate.findings} />

      {/* SECTION 12: MODEL TRAINING & RETRAINING WORKFLOW */}
      <MlWorkflowPanel />
    </div>
  );
};
