import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import {
  CommunicationStatus,
  DiagnosticAlert,
  DiagnosticSeverity,
  SensorHealth,
} from '../../types/diagnostics';
import { DataSourceMode } from '../../types/telemetry';

interface DiagnosticStatusOverviewProps {
  alerts: DiagnosticAlert[];
  sensors: SensorHealth[];
  commLinks: CommunicationStatus[];
  lastUpdateLabel: string;
  dataSourceMode: DataSourceMode;
}

export function SeverityPill({ severity }: { severity: DiagnosticSeverity }) {
  switch (severity) {
    case 'CRITICAL':
      return (
        <span className="bv-badge bv-badge--red">
          <AlertOctagon size={11} />
          CRITICAL
        </span>
      );
    case 'WARNING':
      return (
        <span className="bv-badge bv-badge--amber">
          <AlertTriangle size={11} />
          WARNING
        </span>
      );
    case 'NORMAL':
      return (
        <span className="bv-badge bv-badge--phosphor">
          <CheckCircle2 size={11} />
          NORMAL
        </span>
      );
    case 'INFO':
    default:
      return (
        <span className="bv-badge bv-badge--muted">
          <Info size={11} />
          INFO
        </span>
      );
  }
}

export const DiagnosticStatusOverview: React.FC<DiagnosticStatusOverviewProps> = ({
  alerts,
  sensors,
  commLinks,
  lastUpdateLabel,
  dataSourceMode,
}) => {
  const activeAlerts = alerts.filter((a) => a.status !== 'RESOLVED');
  const criticalCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = activeAlerts.filter((a) => a.severity === 'WARNING').length;
  const sensorIssues = sensors.filter(
    (s) => s.status === 'FAULT' || s.status === 'STALE' || s.status === 'NOT_CONNECTED' || s.status === 'UNAVAILABLE'
  ).length;
  const commIssues = commLinks.filter(
    (c) => c.status === 'DISCONNECTED' || c.status === 'NOT_CONFIGURED' || c.status === 'UNKNOWN'
  ).length;

  // Never falsely claim NORMAL/perfect when critical/warning alerts or disconnected links exist
  const overallSeverity: DiagnosticSeverity =
    criticalCount > 0
      ? 'CRITICAL'
      : warningCount > 0 || sensorIssues > 0 || commIssues > 0
      ? 'WARNING'
      : 'INFO';

  const overallLabel =
    dataSourceMode === 'HARDWARE'
      ? 'HARDWARE OFFLINE'
      : criticalCount > 0
      ? 'CRITICAL (SIM)'
      : warningCount > 0
      ? 'ATTENTION / DEMO'
      : 'SIMULATED ACTIVE';

  const cards = [
    {
      label: 'Overall Diagnostic State',
      value: overallLabel,
      pill: <SeverityPill severity={overallSeverity} />,
      sub: dataSourceMode === 'DEMO' ? 'Simulated checks · BMS unconfigured' : 'No hardware backend',
    },
    {
      label: 'Active Alerts',
      value: String(activeAlerts.length),
      icon: <ShieldAlert size={14} style={{ color: activeAlerts.length > 0 ? 'var(--signal-amber)' : 'var(--text-muted)' }} />,
      sub: `${alerts.filter((a) => a.status === 'ACKNOWLEDGED').length} ACK · ${alerts.filter((a) => a.status === 'RESOLVED').length} RESOLVED`,
    },
    {
      label: 'Warning Count',
      value: String(warningCount),
      icon: <AlertTriangle size={14} style={{ color: warningCount > 0 ? 'var(--signal-amber)' : 'var(--text-muted)' }} />,
      sub: 'Active WARNING severity',
    },
    {
      label: 'Critical Alerts',
      value: String(criticalCount),
      icon: <AlertOctagon size={14} style={{ color: criticalCount > 0 ? 'var(--warning-red)' : 'var(--text-muted)' }} />,
      sub: 'Active CRITICAL severity',
    },
    {
      label: 'Sensor Faults / Unavail.',
      value: `${sensorIssues} / ${sensors.length}`,
      icon: <Radio size={14} style={{ color: sensorIssues > 0 ? 'var(--signal-amber)' : 'var(--phosphor-green)' }} />,
      sub: dataSourceMode === 'DEMO' ? 'Stale or offline probes' : 'Physical sensors unwired',
    },
    {
      label: 'Comm Faults / Uncfg.',
      value: `${commIssues} / ${commLinks.length}`,
      icon: <Info size={14} style={{ color: 'var(--signal-amber)' }} />,
      sub: 'Includes JK BMS unconfigured',
    },
    {
      label: 'Last Diagnostic Update',
      value: lastUpdateLabel,
      icon: <CheckCircle2 size={14} style={{ color: dataSourceMode === 'DEMO' ? 'var(--phosphor-green)' : 'var(--text-muted)' }} />,
      sub: dataSourceMode === 'DEMO' ? 'Local rule engine (DEMO)' : 'Awaiting hardware feed',
    },
  ];

  return (
    <section
      aria-label="Diagnostic status overview"
      className="diag-overview-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '10px',
      }}
    >
      <style>{`
        @media (max-width: 1360px) {
          .diag-overview-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 780px) {
          .diag-overview-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      {cards.map((card) => (
        <div
          key={card.label}
          className="bv-panel"
          style={{
            padding: '10px 11px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span className="micro-label" style={{ fontSize: '8.5px' }}>
              {card.label}
            </span>
            {card.icon}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
            <span
              className="mono"
              style={{
                fontSize: card.pill ? '12.5px' : '20px',
                fontWeight: 600,
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}
            >
              {card.value}
            </span>
            {card.pill}
          </div>

          <div
            className="mono"
            style={{
              fontSize: '8.5px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={card.sub}
          >
            {card.sub}
          </div>
        </div>
      ))}
    </section>
  );
};
