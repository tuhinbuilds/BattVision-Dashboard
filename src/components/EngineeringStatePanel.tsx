import React from 'react';
import {
  AlertTriangle,
  Cpu,
  Database,
  Loader2,
  Radio,
  WifiOff,
} from 'lucide-react';

export type EngineeringStateKind =
  | 'loading'
  | 'no-data'
  | 'sensor-unavailable'
  | 'model-not-deployed'
  | 'comm-disconnected'
  | 'stale'
  | 'backend-unavailable'
  | 'error';

interface EngineeringStatePanelProps {
  kind: EngineeringStateKind;
  title: string;
  description: string;
  code?: string;
}

export const EngineeringStatePanel: React.FC<EngineeringStatePanelProps> = ({
  kind,
  title,
  description,
  code,
}) => {
  const accent =
    kind === 'error'
      ? 'var(--warning-red)'
      : kind === 'loading'
      ? 'var(--phosphor-green)'
      : 'var(--signal-amber)';

  const renderIcon = () => {
    const props = { size: 18, style: { color: accent } };
    switch (kind) {
      case 'loading':
        return <Loader2 {...props} className="bv-spin-subtle" />;
      case 'model-not-deployed':
        return <Cpu {...props} />;
      case 'comm-disconnected':
      case 'backend-unavailable':
        return <WifiOff {...props} />;
      case 'sensor-unavailable':
      case 'stale':
        return <Radio {...props} />;
      case 'no-data':
        return <Database {...props} />;
      case 'error':
      default:
        return <AlertTriangle {...props} />;
    }
  };

  return (
    <div
      className="scope-grid-bg"
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        border: '1px dashed var(--border-strong)',
        borderRadius: '2px',
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '8px',
        minHeight: '150px',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        {renderIcon()}
        <span
          className="mono"
          style={{
            fontSize: '12.5px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: accent,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
      </div>
      {code && (
        <span className="bv-badge bv-badge--muted" style={{ fontSize: '9px' }}>
          {code}
        </span>
      )}
      <p
        style={{
          margin: 0,
          maxWidth: '500px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
};
