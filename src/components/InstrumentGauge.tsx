import React from 'react';
import { SparklinePlot } from './SparklinePlot';

export type InstrumentTone = 'nominal' | 'amber' | 'red';

interface InstrumentGaugeProps {
  channelCode: string;
  label: string;
  sensorLabel: string;
  value: number;
  decimals?: number;
  unit: string;
  min: number;
  max: number;
  nominal?: number;
  historyValues: number[];
  tone?: InstrumentTone;
  subStatLeft?: string;
  subStatRight?: string;
  paused?: boolean;
  onInspect?: () => void;
}

export const InstrumentGauge: React.FC<InstrumentGaugeProps> = ({
  channelCode,
  label,
  sensorLabel,
  value,
  decimals = 2,
  unit,
  min,
  max,
  nominal,
  historyValues,
  tone = 'nominal',
  subStatLeft,
  subStatRight,
  paused = false,
  onInspect,
}) => {
  const accentColor =
    tone === 'red'
      ? 'var(--warning-red)'
      : tone === 'amber'
      ? 'var(--signal-amber)'
      : 'var(--phosphor-green)';

  const clampedPct = Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
  const nominalPct =
    nominal !== undefined
      ? Math.max(0, Math.min(100, ((nominal - min) / (max - min || 1)) * 100))
      : null;

  const sessionMin = historyValues.length ? Math.min(...historyValues) : value;
  const sessionMax = historyValues.length ? Math.max(...historyValues) : value;

  return (
    <article
      className={`bv-panel bv-panel-interactive`}
      onClick={onInspect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        cursor: onInspect ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
    >
      {/* Top Instrument Bezel Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 11px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 20, 0.55)',
          gap: '6px',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: '9.5px',
            letterSpacing: '0.1em',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {channelCode} · {sensorLabel}
        </span>
        <span
          className="mono"
          style={{
            fontSize: '8.5px',
            letterSpacing: '0.09em',
            color: 'var(--signal-amber)',
            border: '1px solid var(--signal-amber-border)',
            backgroundColor: 'var(--signal-amber-dim)',
            padding: '1px 5px',
            borderRadius: '2px',
            flexShrink: 0,
          }}
        >
          DEMO DATA
        </span>
      </div>

      {/* Main Digital Readout */}
      <div style={{ padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--warm-neutral)',
            }}
          >
            {label}
          </span>
          <span
            className={`status-led ${
              tone === 'red'
                ? 'status-led--red'
                : tone === 'amber'
                ? 'status-led--amber'
                : 'status-led--phosphor'
            }`}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            padding: '4px 0 2px',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: '30px',
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: tone === 'nominal' ? 'var(--text-primary)' : accentColor,
              transition: 'color 180ms ease',
            }}
          >
            {value.toFixed(decimals)}
          </span>
          <span
            className="mono"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: accentColor,
            }}
          >
            {unit}
          </span>
        </div>

        {/* Precision Analog Scale Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              position: 'relative',
              height: '8px',
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderRadius: '1px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${clampedPct}%`,
                height: '100%',
                backgroundColor: accentColor,
                opacity: 0.85,
                transition: 'width 320ms cubic-bezier(0.2, 0.7, 0.2, 1)',
              }}
            />
            {nominalPct !== null && (
              <div
                title={`Nominal reference: ${nominal} ${unit}`}
                style={{
                  position: 'absolute',
                  left: `${nominalPct}%`,
                  top: 0,
                  bottom: 0,
                  width: '1.5px',
                  backgroundColor: 'var(--warm-neutral)',
                }}
              />
            )}
          </div>
          <div
            className="mono"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: 'var(--text-muted)',
            }}
          >
            <span>{min}</span>
            {nominal !== undefined && <span>NOM {nominal}</span>}
            <span>{max}</span>
          </div>
        </div>

        {/* Oscilloscope Sparkline */}
        <SparklinePlot values={historyValues} color={accentColor} height={40} paused={paused} />

        {/* Footer Session Min/Max */}
        <div
          className="mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            paddingTop: '4px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <span>{subStatLeft ?? `MIN ${sessionMin.toFixed(decimals)}`}</span>
          <span>{subStatRight ?? `MAX ${sessionMax.toFixed(decimals)}`}</span>
        </div>
      </div>
    </article>
  );
};
