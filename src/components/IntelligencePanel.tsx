import React from 'react';
import { BrainCircuit, Gauge, Hourglass } from 'lucide-react';
import { BatteryTelemetry } from '../types/telemetry';

interface IntelligencePanelProps {
  telemetry: BatteryTelemetry;
  onOpenIntelligence?: () => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  telemetry,
  onOpenIntelligence,
}) => {
  const { soh, rul, socEstimate } = telemetry;

  const cards = [
    {
      key: 'soh',
      code: 'DIAG-SOH',
      title: 'State of Health',
      short: 'SoH',
      icon: BrainCircuit,
      metric: soh,
      accent: 'var(--text-secondary)',
      badgeClass: 'bv-badge--muted',
      progressPct: null as number | null,
      placeholderText: 'MODEL NOT CONNECTED',
      footerNote: 'Awaiting trained Edge ML capacity model',
    },
    {
      key: 'rul',
      code: 'DIAG-RUL',
      title: 'Remaining Useful Life',
      short: 'RUL',
      icon: Hourglass,
      metric: rul,
      accent: 'var(--text-secondary)',
      badgeClass: 'bv-badge--muted',
      progressPct: null as number | null,
      placeholderText: 'MODEL NOT CONNECTED',
      footerNote: 'EoL 80% cycle projection offline',
    },
    {
      key: 'soc',
      code: 'DIAG-SOC',
      title: 'State of Charge',
      short: 'SoC',
      icon: Gauge,
      metric: socEstimate,
      accent: 'var(--phosphor-green)',
      badgeClass: 'bv-badge--amber',
      progressPct: socEstimate.value,
      placeholderText: null as string | null,
      footerNote: 'Simulated Coulomb/OCV estimate (unvalidated)',
    },
  ];

  return (
    <section className="bv-panel" aria-label="Battery diagnostic intelligence indicators">
      <div className="bv-panel-header">
        <div className="bv-panel-title-group">
          <span className="status-led status-led--amber" />
          <h2 className="bv-panel-title">Battery Intelligence // Diagnostic Estimators</h2>
          <span className="bv-badge bv-badge--muted">ML OFFLINE</span>
        </div>

        {onOpenIntelligence && (
          <button type="button" className="bv-btn" onClick={onOpenIntelligence}>
            Pipeline Details →
          </button>
        )}
      </div>

      <div
        className="bv-panel-body"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        <style>{`
          @media (max-width: 900px) {
            .intel-cards-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}</style>
        <div
          className="intel-cards-grid"
          style={{
            gridColumn: '1 / -1',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '12px',
          }}
        >
          {cards.map((card) => {
            const Icon = card.icon;
            const isConnectedValue = card.metric.value !== null;

            return (
              <div
                key={card.key}
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '2px',
                  padding: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '9.5px',
                        letterSpacing: '0.1em',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {card.code}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--warm-neutral)',
                        marginTop: '2px',
                      }}
                    >
                      {card.title}{' '}
                      <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        ({card.short})
                      </span>
                    </div>
                  </div>
                  <Icon
                    size={16}
                    style={{
                      color: isConnectedValue ? 'var(--phosphor-green)' : 'var(--text-muted)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  />
                </div>

                {/* Primary Value or Honest Offline State */}
                <div
                  style={{
                    padding: '10px 10px',
                    border: '1px dashed var(--border-color)',
                    backgroundColor: 'rgba(39, 44, 39, 0.38)',
                    borderRadius: '2px',
                    minHeight: '66px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {isConnectedValue ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '26px',
                            fontWeight: 600,
                            lineHeight: 1,
                            color: 'var(--phosphor-green)',
                          }}
                        >
                          {card.metric.value!.toFixed(1)}
                        </span>
                        <span
                          className="mono"
                          style={{ fontSize: '12px', color: 'var(--warm-neutral)' }}
                        >
                          {card.metric.unit}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '5px',
                          backgroundColor: '#101311',
                          border: '1px solid var(--border-subtle)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, card.progressPct ?? 0))}%`,
                            height: '100%',
                            backgroundColor: 'var(--phosphor-green)',
                            transition: 'width 320ms ease',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="mono"
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          letterSpacing: '0.09em',
                          color: 'var(--signal-amber)',
                        }}
                      >
                        — — {card.placeholderText}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}
                      >
                        {card.footerNote}
                      </div>
                    </>
                  )}
                </div>

                {/* Status Badge + Engineering Explanation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div>
                    <span className={`bv-badge ${card.badgeClass}`}>
                      <span
                        className={`status-led ${
                          isConnectedValue ? 'status-led--amber' : 'status-led--offline'
                        }`}
                      />
                      {card.metric.sourceLabel}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '11.5px',
                      lineHeight: 1.45,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {card.metric.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
