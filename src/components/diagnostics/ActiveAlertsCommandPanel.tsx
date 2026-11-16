import React, { useMemo, useState } from 'react';
import { Check, CheckCheck, Search, X } from 'lucide-react';
import {
  AlertLifecycleStatus,
  DiagnosticAlert,
  DiagnosticSeverity,
} from '../../types/diagnostics';
import { SeverityPill } from './DiagnosticStatusOverview';

interface ActiveAlertsCommandPanelProps {
  alerts: DiagnosticAlert[];
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string | null) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
}

export const ActiveAlertsCommandPanel: React.FC<ActiveAlertsCommandPanelProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onAcknowledgeAlert,
  onResolveAlert,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | AlertLifecycleStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | DiagnosticSeverity>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sources = useMemo(() => {
    const uniq = Array.from(new Set(alerts.map((a) => a.sourceComponent)));
    return ['ALL', ...uniq];
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alerts.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (sourceFilter !== 'ALL' && a.sourceComponent !== sourceFilter) return false;
      if (
        q &&
        !a.id.toLowerCase().includes(q) &&
        !a.title.toLowerCase().includes(q) &&
        !a.sourceComponent.toLowerCase().includes(q) &&
        !a.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [alerts, statusFilter, severityFilter, sourceFilter, searchQuery]);

  const selectedAlert = useMemo(
    () => alerts.find((a) => a.id === selectedAlertId) ?? null,
    [alerts, selectedAlertId]
  );

  return (
    <section className="bv-panel" aria-label="Active diagnostic alerts command panel">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--amber status-led--pulse" />
          <h2 className="bv-panel-title">ACTIVE ALERTS // Command &amp; Inspection Panel</h2>
          <span className="bv-badge bv-badge--muted">
            {filteredAlerts.length} OF {alerts.length} RECORDS
          </span>
        </div>

        <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
          CLICK ANY ALERT ROW TO OPEN DIAGNOSTIC INSPECTION DRAWER
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(19, 22, 20, 0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`bv-btn ${statusFilter === st ? 'bv-btn--active' : ''}`}
              style={{ padding: '4px 8px', fontSize: '9.5px' }}
            >
              {st}
            </button>
          ))}

          <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`bv-btn ${severityFilter === sev ? 'bv-btn--amber' : ''}`}
              style={{ padding: '4px 8px', fontSize: '9.5px' }}
            >
              {sev}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            aria-label="Filter alerts by source component"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="mono"
            style={{
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '5px 8px',
              fontSize: '10px',
              color: 'var(--text-primary)',
            }}
          >
            {sources.map((src) => (
              <option key={src} value={src}>
                {src === 'ALL' ? 'ALL SOURCES' : src}
              </option>
            ))}
          </select>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-recessed)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '4px 8px',
            }}
          >
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alert ID or keyword..."
              aria-label="Search alerts by ID or keyword"
              className="mono"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '10.5px',
                width: '170px',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Split Layout: Alert Table + Inspection Drawer */}
      <div
        className={`alerts-drawer-split ${selectedAlert ? 'alerts-drawer-split--open' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: selectedAlert ? 'minmax(0, 1fr) 338px' : 'minmax(0, 1fr)',
        }}
      >
        <style>{`
          @media (max-width: 1120px) {
            .alerts-drawer-split--open {
              grid-template-columns: minmax(0, 1fr) !important;
            }
            .alert-inspect-drawer {
              border-left: none !important;
              border-top: 1px solid var(--border-color) !important;
            }
          }
        `}</style>

        <div style={{ overflowX: 'auto' }}>
          {filteredAlerts.length === 0 ? (
            <div
              className="mono"
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              NO DIAGNOSTIC ALERTS MATCHING CURRENT FILTERS
            </div>
          ) : (
            <table className="bv-table">
              <thead>
                <tr>
                  <th style={{ padding: '8px 9px' }}>Event ID</th>
                  <th style={{ padding: '8px 9px' }}>Time</th>
                  <th style={{ padding: '8px 9px' }}>Severity</th>
                  <th style={{ padding: '8px 9px' }}>Alert Title &amp; Supporting Measurement</th>
                  <th style={{ padding: '8px 9px' }}>Source</th>
                  <th style={{ padding: '8px 9px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const isSelected = alert.id === selectedAlertId;
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => onSelectAlert(alert.id)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'rgba(184, 214, 90, 0.08)'
                          : undefined,
                      }}
                    >
                      <td className="mono" style={{ padding: '9px', fontWeight: 600, color: 'var(--warm-neutral)', whiteSpace: 'nowrap' }}>
                        {alert.id}
                      </td>
                      <td className="mono" style={{ padding: '9px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {alert.timeLabel}
                      </td>
                      <td style={{ padding: '9px' }}>
                        <SeverityPill severity={alert.severity} />
                      </td>
                      <td style={{ padding: '9px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>
                            {alert.title}
                          </span>
                          <span
                            className={`bv-badge ${alert.simulated ? 'bv-badge--amber' : 'bv-badge--muted'}`}
                            style={{ fontSize: '8.5px', padding: '1px 5px' }}
                          >
                            {alert.simulated ? 'SIMULATED' : alert.dataSource}
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {alert.supportingMeasurement}
                        </div>
                      </td>
                      <td className="mono" style={{ padding: '9px', fontSize: '10px', color: 'var(--warm-neutral)' }}>
                        {alert.sourceComponent}
                      </td>
                      <td style={{ padding: '9px' }}>
                        <span
                          className={`bv-badge ${
                            alert.status === 'ACTIVE'
                              ? 'bv-badge--amber'
                              : alert.status === 'ACKNOWLEDGED'
                              ? 'bv-badge--muted'
                              : 'bv-badge--phosphor'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* SECTION 11: ALERT INSPECTION DRAWER */}
        {selectedAlert && (
          <aside
            className="alert-inspect-drawer"
            aria-label={`Diagnostic inspection drawer for ${selectedAlert.id}`}
            style={{
              borderLeft: '1px solid var(--border-color)',
              backgroundColor: '#1B1F1C',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '8px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '10px',
              }}
            >
              <div>
                <div className="micro-label" style={{ color: 'var(--signal-amber)' }}>
                  ALERT INSPECTION DRAWER · {selectedAlert.ruleId}
                </div>
                <div className="mono" style={{ fontSize: '14px', fontWeight: 700, marginTop: '3px', color: 'var(--text-primary)' }}>
                  {selectedAlert.id}
                </div>
                <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <SeverityPill severity={selectedAlert.severity} />
                  <span className={`bv-badge ${selectedAlert.simulated ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                    {selectedAlert.simulated ? 'SIMULATED EXAMPLE' : selectedAlert.dataSource}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="bv-btn"
                onClick={() => onSelectAlert(null)}
                aria-label="Close alert inspection drawer"
                style={{ padding: '4px 6px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--warm-neutral)' }}>
              {selectedAlert.title}
            </div>

            {/* Structured Diagnostic Readout Plate */}
            <div
              className="mono"
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-color)',
                padding: '10px',
                borderRadius: '2px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '10.5px',
              }}
            >
              {[
                ['DETECTION TIME', selectedAlert.timeLabel],
                ['SOURCE COMPONENT', selectedAlert.sourceComponent],
                ['MEASUREMENT', selectedAlert.measurementName],
                ['OBSERVED VALUE', selectedAlert.observedValueLabel],
                ['CONFIGURED THRESHOLD', selectedAlert.configuredThresholdLabel],
                ['DATA SOURCE', selectedAlert.simulated ? 'SIMULATION (DEMO)' : selectedAlert.dataSource],
                ['CURRENT STATUS', selectedAlert.status],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
              {selectedAlert.acknowledgement && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ACKNOWLEDGED AT</span>
                  <span style={{ color: 'var(--phosphor-green)' }}>
                    {selectedAlert.acknowledgement.acknowledgedAt}
                  </span>
                </div>
              )}
              {selectedAlert.resolvedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>RESOLVED AT</span>
                  <span style={{ color: 'var(--phosphor-green)' }}>{selectedAlert.resolvedAt}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="micro-label">DIAGNOSTIC EXPLANATION</span>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {selectedAlert.diagnosticExplanation}
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                borderLeft: '2px solid var(--phosphor-green)',
                padding: '9px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span className="micro-label" style={{ color: 'var(--phosphor-green)' }}>
                RECOMMENDED INSPECTION STEP
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                {selectedAlert.recommendedInspection}
              </span>
            </div>

            {/* Dashboard Record Management Actions (No BMS/Hardware Control) */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="bv-btn bv-btn--amber"
                disabled={selectedAlert.status !== 'ACTIVE'}
                onClick={() => onAcknowledgeAlert(selectedAlert.id)}
                style={{ flex: 1, opacity: selectedAlert.status === 'ACTIVE' ? 1 : 0.45 }}
              >
                <Check size={12} />
                Acknowledge
              </button>
              <button
                type="button"
                className="bv-btn bv-btn--active"
                disabled={selectedAlert.status === 'RESOLVED'}
                onClick={() => onResolveAlert(selectedAlert.id)}
                style={{ flex: 1, opacity: selectedAlert.status !== 'RESOLVED' ? 1 : 0.45 }}
              >
                <CheckCheck size={12} />
                Mark Resolved
              </button>
            </div>
            <div className="mono" style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
              DASHBOARD RECORD ACTION ONLY · DOES NOT MODIFY OR DISABLE BMS PROTECTION
            </div>
          </aside>
        )}
      </div>
    </section>
  );
};
