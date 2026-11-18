import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { BatteryHealthEstimate } from '../../types/intelligence';

interface MainIntelligenceInstrumentsProps {
  estimate: BatteryHealthEstimate;
  eolThresholdPct: number;
  onChangeEolThreshold: (pct: number) => void;
}

const EOL_OPTIONS = [75, 80, 85];

export const MainIntelligenceInstruments: React.FC<MainIntelligenceInstrumentsProps> = ({
  estimate,
  eolThresholdPct,
  onChangeEolThreshold,
}) => {
  const [openMethod, setOpenMethod] = useState<Record<'soc' | 'soh' | 'rul', boolean>>({
    soc: false,
    soh: false,
    rul: false,
  });

  const toggleMethod = (key: 'soc' | 'soh' | 'rul') => {
    setOpenMethod((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { soc, soh, rul } = estimate;
  const isDemo = estimate.mode === 'DEMO';

  // Semicircular SVG gauge geometry for SoC
  const r = 56;
  const cx = 86;
  const cy = 78;
  const semi = Math.PI * r;
  const socOffset =
    soc.valuePct !== null
      ? semi * (1 - Math.max(0, Math.min(100, soc.valuePct)) / 100)
      : semi;

  // SoH bar width (illustrative demo only)
  const sohDisplayPct = isDemo ? soh.illustrativeDemoValuePct : soh.validatedValuePct;

  return (
    <section
      aria-label="Main battery intelligence diagnostic instruments"
      className="intel-3-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '14px',
      }}
    >
      <style>{`
        @media (max-width: 1180px) {
          .intel-3-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>

      {/* A. STATE OF CHARGE (SoC) */}
      <article className="bv-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="bv-panel-header">
          <div className="bv-panel-title-group">
            <span
              className={`status-led ${soc.available ? 'status-led--phosphor' : 'status-led--offline'}`}
            />
            <h2 className="bv-panel-title">A. State of Charge // SoC</h2>
          </div>
          <span className={`bv-badge ${soc.available ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {soc.available ? 'DEMO ESTIMATE' : 'UNAVAILABLE'}
          </span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {/* Semicircular Calibrated Gauge */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
            <svg
              viewBox="0 0 172 96"
              width="100%"
              style={{ maxWidth: '204px', height: 'auto', display: 'block' }}
              role="img"
              aria-label={`State of Charge estimate: ${
                soc.valuePct !== null ? `${soc.valuePct.toFixed(1)} percent` : 'unavailable'
              }`}
            >
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                fill="none"
                stroke="#131614"
                strokeWidth="12"
              />
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                fill="none"
                stroke="#3B4139"
                strokeWidth="10"
                strokeDasharray="2 3"
              />
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                fill="none"
                stroke={
                  soc.valuePct === null
                    ? '#4E564C'
                    : soc.valuePct <= 20
                    ? '#E69A42'
                    : '#B8D65A'
                }
                strokeWidth="8"
                strokeDasharray={semi}
                strokeDashoffset={socOffset}
                style={{ transition: 'stroke-dashoffset 300ms ease' }}
              />
              <text x="16" y="92" fill="#6E756A" fontFamily="IBM Plex Mono" fontSize="8">
                0%
              </text>
              <text x="86" y="10" textAnchor="middle" fill="#6E756A" fontFamily="IBM Plex Mono" fontSize="8">
                50%
              </text>
              <text x="156" y="92" textAnchor="end" fill="#6E756A" fontFamily="IBM Plex Mono" fontSize="8">
                100%
              </text>
              <text
                x="86"
                y="65"
                textAnchor="middle"
                fill={soc.valuePct !== null ? '#F0F0E8' : '#6E756A'}
                fontFamily="IBM Plex Mono"
                fontSize="24"
                fontWeight="600"
              >
                {soc.valuePct !== null ? `${soc.valuePct.toFixed(1)}%` : 'N/A'}
              </text>
              <text
                x="86"
                y="80"
                textAnchor="middle"
                fill="#92998D"
                fontFamily="IBM Plex Mono"
                fontSize="7.5"
              >
                {soc.available ? `TREND: ${soc.trend}` : 'NO STREAM'}
              </text>
            </svg>
          </div>

          {/* Technical Fields */}
          <div
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-subtle)',
              padding: '9px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              fontSize: '10.5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>EST. REMAINING CAP</span>
              <strong style={{ color: 'var(--warm-neutral)' }}>
                {soc.remainingCapacityAh !== null
                  ? `${soc.remainingCapacityAh.toFixed(2)} Ah (${soc.remainingEnergyWh?.toFixed(0)} Wh)`
                  : 'N/A'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>METHOD</span>
              <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
                Coulomb + OCV Corr.
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>LAST UPDATE</span>
              <span style={{ color: 'var(--text-secondary)' }}>{soc.lastUpdated ?? 'N/A'}</span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            SoC represents the estimated remaining charge relative to the battery&apos;s usable capacity.
          </p>

          {/* Expandable Methodology */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => toggleMethod('soc')}
              className="bv-btn"
              style={{ width: '100%', justifyContent: 'space-between', fontSize: '10px' }}
              aria-expanded={openMethod.soc}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <HelpCircle size={12} /> SoC Estimation Methodology
              </span>
              {openMethod.soc ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {openMethod.soc && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '9px 10px',
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                Intended initial approach uses current integration (coulomb counting) with full-charge
                calibration and voltage-based OCV correction during low-current rest states. Temperature
                and vibration sensors provide auxiliary context only and do not directly measure SoC.
              </div>
            )}
          </div>
        </div>
      </article>

      {/* B. STATE OF HEALTH (SoH) */}
      <article className="bv-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="bv-panel-header">
          <div className="bv-panel-title-group">
            <span className="status-led status-led--offline" />
            <h2 className="bv-panel-title">B. State of Health // SoH</h2>
          </div>
          <span className="bv-badge bv-badge--muted">MODEL OFFLINE</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {/* Explicit Model-Not-Available Banner */}
          <div
            className="mono"
            style={{
              padding: '7px 9px',
              backgroundColor: 'var(--signal-amber-dim)',
              border: '1px solid var(--signal-amber-border)',
              borderRadius: '2px',
              fontSize: '9.5px',
              color: 'var(--signal-amber)',
              fontWeight: 600,
              letterSpacing: '0.07em',
            }}
          >
            SOH MODEL NOT AVAILABLE {isDemo ? '· ILLUSTRATIVE DEMO VALUE' : ''}
          </div>

          {/* Primary Readout */}
          <div
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              padding: '12px',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '30px',
                    fontWeight: 600,
                    lineHeight: 1,
                    color: sohDisplayPct !== null ? 'var(--warm-neutral)' : 'var(--text-muted)',
                  }}
                >
                  {sohDisplayPct !== null ? sohDisplayPct.toFixed(1) : 'N/A'}
                </span>
                {sohDisplayPct !== null && (
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--signal-amber)' }}>
                    %
                  </span>
                )}
              </div>
              <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                {isDemo ? 'ILLUSTRATIVE DEMO' : 'NO MODEL'}
              </span>
            </div>

            {/* Capacity Retention Bar */}
            <div
              style={{
                position: 'relative',
                height: '8px',
                backgroundColor: '#101311',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {sohDisplayPct !== null && (
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, sohDisplayPct))}%`,
                    height: '100%',
                    backgroundColor: 'var(--signal-amber)',
                    opacity: 0.78,
                  }}
                />
              )}
              <div
                title={`Configured EoL threshold: ${eolThresholdPct}%`}
                style={{
                  position: 'absolute',
                  left: `${eolThresholdPct}%`,
                  top: 0,
                  bottom: 0,
                  width: '1.5px',
                  backgroundColor: 'var(--warning-red)',
                }}
              />
            </div>

            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
              <span>0%</span>
              <span style={{ color: 'var(--warning-red)' }}>EoL {eolThresholdPct}%</span>
              <span>100% (24.0 Ah)</span>
            </div>
          </div>

          {/* Technical Fields */}
          <div
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-subtle)',
              padding: '9px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              fontSize: '10.5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>REFERENCE CAPACITY</span>
              <strong style={{ color: 'var(--warm-neutral)' }}>
                {soh.referenceCapacityAh.toFixed(2)} Ah
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>EST. USABLE CAPACITY</span>
              <strong style={{ color: isDemo ? 'var(--signal-amber)' : 'var(--text-muted)' }}>
                {soh.estimatedUsableCapacityAh !== null
                  ? `${soh.estimatedUsableCapacityAh.toFixed(2)} Ah (DEMO)`
                  : 'N/A'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>DEGRADATION TREND</span>
              <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>
                {soh.degradationTrendLabel}
              </span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            SoH compares measured or estimated usable capacity with reference capacity:{' '}
            <code className="mono" style={{ fontSize: '10.5px', color: 'var(--warm-neutral)' }}>
              SoH (%) = (Usable / Reference) × 100
            </code>
          </p>

          {/* Expandable Methodology */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => toggleMethod('soh')}
              className="bv-btn"
              style={{ width: '100%', justifyContent: 'space-between', fontSize: '10px' }}
              aria-expanded={openMethod.soh}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <HelpCircle size={12} /> SoH Capacity-Based Formula
              </span>
              {openMethod.soh ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {openMethod.soh && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '9px 10px',
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: 'var(--warm-neutral)' }}>
                  SoH (%) = (Current usable capacity / Reference capacity) × 100
                </strong>
                . Valid capacity-based SoH requires controlled discharge capacity tests or a
                validated degradation model. Instantaneous pack voltage alone cannot determine SoH,
                especially on the flat LiFePO4 plateau.
              </div>
            )}
          </div>
        </div>
      </article>

      {/* C. REMAINING USEFUL LIFE (RUL) */}
      <article className="bv-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="bv-panel-header">
          <div className="bv-panel-title-group">
            <span className="status-led status-led--offline" />
            <h2 className="bv-panel-title">C. Remaining Life // RUL</h2>
          </div>
          <span className="bv-badge bv-badge--muted">UNVALIDATED</span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {/* Explicit Insufficient Ageing Data Banner */}
          <div
            className="mono"
            style={{
              padding: '7px 9px',
              backgroundColor: 'var(--signal-amber-dim)',
              border: '1px solid var(--signal-amber-border)',
              borderRadius: '2px',
              fontSize: '9.5px',
              color: 'var(--signal-amber)',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            {rul.modelStatusLabel}
          </div>

          {/* Primary Readout */}
          <div
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              padding: '12px',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '30px',
                    fontWeight: 600,
                    lineHeight: 1,
                    color: rul.estimatedRemainingCycles !== null ? 'var(--warm-neutral)' : 'var(--text-muted)',
                  }}
                >
                  {rul.estimatedRemainingCycles !== null ? rul.estimatedRemainingCycles : 'N/A'}
                </span>
                {rul.estimatedRemainingCycles !== null && (
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--signal-amber)' }}>
                    cycles
                  </span>
                )}
              </div>
              <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                {isDemo ? 'ILLUSTRATIVE DEMO' : 'NO DATA'}
              </span>
            </div>

            {/* Configurable End-of-Life Threshold Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
              }}
            >
              <span className="micro-label" style={{ fontSize: '8.5px' }}>
                EoL THRESHOLD (ASSUMPTION)
              </span>
              <div role="group" aria-label="Configurable end of life capacity threshold" style={{ display: 'inline-flex', gap: '3px' }}>
                {EOL_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onChangeEolThreshold(pct)}
                    className={`bv-btn ${eolThresholdPct === pct ? 'bv-btn--active' : ''}`}
                    style={{ padding: '2px 7px', fontSize: '9.5px' }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Fields */}
          <div
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-subtle)',
              padding: '9px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              fontSize: '10.5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>EST. REMAINING TIME</span>
              <strong style={{ color: isDemo ? 'var(--warm-neutral)' : 'var(--text-muted)' }}>
                {rul.estimatedRemainingMonths !== null
                  ? `~${rul.estimatedRemainingMonths.toFixed(1)} mo (DEMO)`
                  : 'N/A'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>DEMO RANGE (UNCALIB.)</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {rul.uncertainty.lowerCycles !== null && rul.uncertainty.upperCycles !== null
                  ? `${rul.uncertainty.lowerCycles} - ${rul.uncertainty.upperCycles} cyc`
                  : 'UNAVAILABLE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>EoL CRITERION</span>
              <span style={{ color: 'var(--signal-amber)' }}>
                {rul.eolThresholdPct}% ({rul.eolCapacityAh.toFixed(2)} Ah)
              </span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            RUL estimates remaining useful operating life before a configurable end-of-life
            criterion is reached (project assumption, not a universal battery standard).
          </p>

          {/* Expandable Methodology */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => toggleMethod('rul')}
              className="bv-btn"
              style={{ width: '100%', justifyContent: 'space-between', fontSize: '10px' }}
              aria-expanded={openMethod.rul}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <HelpCircle size={12} /> RUL Projection Methodology
              </span>
              {openMethod.rul ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {openMethod.rul && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '9px 10px',
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                RUL projects future capacity fade from validated longitudinal ageing records until
                the configured EoL threshold ({eolThresholdPct}% = {rul.eolCapacityAh.toFixed(2)} Ah)
                is crossed. Confident RUL cannot be produced without multi-cycle ageing datasets.
              </div>
            )}
          </div>
        </div>
      </article>
    </section>
  );
};
