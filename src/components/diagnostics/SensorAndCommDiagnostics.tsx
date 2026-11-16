import React from 'react';
import {
  CommunicationLinkState,
  CommunicationStatus,
  SensorHealth,
  SensorHealthStatus,
} from '../../types/diagnostics';
import { DataSourceMode } from '../../types/telemetry';
import { SeverityPill } from './DiagnosticStatusOverview';

interface SensorAndCommDiagnosticsProps {
  sensors: SensorHealth[];
  commLinks: CommunicationStatus[];
  dataSourceMode: DataSourceMode;
  simulateTemp3Stale: boolean;
  onToggleSimulateTemp3Stale: () => void;
}

function sensorStatusBadge(status: SensorHealthStatus) {
  switch (status) {
    case 'ONLINE':
      return <span className="bv-badge bv-badge--phosphor">ONLINE</span>;
    case 'SIMULATED':
      return <span className="bv-badge bv-badge--amber">SIMULATED</span>;
    case 'STALE':
      return <span className="bv-badge bv-badge--amber">STALE</span>;
    case 'FAULT':
      return <span className="bv-badge bv-badge--red">FAULT</span>;
    case 'NOT_CONNECTED':
      return <span className="bv-badge bv-badge--muted">NOT CONNECTED</span>;
    case 'UNAVAILABLE':
    default:
      return <span className="bv-badge bv-badge--muted">UNAVAILABLE</span>;
  }
}

function commStatusBadge(status: CommunicationLinkState) {
  switch (status) {
    case 'CONNECTED':
      return <span className="bv-badge bv-badge--phosphor">CONNECTED</span>;
    case 'SIMULATED':
      return <span className="bv-badge bv-badge--amber">SIMULATED</span>;
    case 'DISCONNECTED':
      return <span className="bv-badge bv-badge--red">DISCONNECTED</span>;
    case 'NOT_CONFIGURED':
      return <span className="bv-badge bv-badge--muted">NOT CONFIGURED</span>;
    case 'UNKNOWN':
    default:
      return <span className="bv-badge bv-badge--muted">UNKNOWN</span>;
  }
}

export const SensorAndCommDiagnostics: React.FC<SensorAndCommDiagnosticsProps> = ({
  sensors,
  commLinks,
  dataSourceMode,
  simulateTemp3Stale,
  onToggleSimulateTemp3Stale,
}) => {
  const isDemo = dataSourceMode === 'DEMO';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* SECTION 7: SENSOR NETWORK DIAGNOSTICS */}
      <section className="bv-panel" aria-label="Sensor network diagnostics">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className={`status-led ${isDemo ? 'status-led--amber' : 'status-led--offline'}`} />
            <h2 className="bv-panel-title">SENSOR NETWORK DIAGNOSTICS // 8 Channels</h2>
            <span className="bv-badge bv-badge--muted">
              {isDemo ? 'DEMO: SIMULATED (NEVER ONLINE)' : 'HARDWARE: UNWIRED'}
            </span>
          </div>

          {isDemo && (
            <button
              type="button"
              className={`bv-btn ${simulateTemp3Stale ? 'bv-btn--amber' : ''}`}
              onClick={onToggleSimulateTemp3Stale}
              title="Test per-probe isolation by simulating a stale 1-Wire update on TEMP-03 only"
              style={{ fontSize: '9.5px', padding: '4px 9px' }}
            >
              {simulateTemp3Stale ? 'Restore TEMP-03 (Demo)' : 'Simulate TEMP-03 Stale'}
            </button>
          )}
        </div>

        <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bv-table">
            <thead>
              <tr>
                <th>Sensor ID</th>
                <th>Intended Measurement</th>
                <th>Interface</th>
                <th>Comm / Data Status</th>
                <th>Last Valid Measurement</th>
                <th>Freshness</th>
                <th>Errors</th>
                <th>Diag State</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor) => (
                <tr key={sensor.sensorId}>
                  <td>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--warm-neutral)' }}>
                      {sensor.sensorId}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {sensor.sensorName}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>
                      {sensor.intendedMeasurement}
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                      {sensor.engineeringNote}
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {sensor.interfaceType}
                  </td>
                  <td>{sensorStatusBadge(sensor.status)}</td>
                  <td
                    className="mono"
                    style={{
                      fontWeight: 600,
                      color:
                        sensor.lastValidMeasurement.includes('UNAVAILABLE') ||
                        sensor.lastValidMeasurement.includes('STALE')
                          ? 'var(--text-muted)'
                          : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sensor.lastValidMeasurement}
                  </td>
                  <td className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {sensor.freshnessLabel}
                  </td>
                  <td className="mono" style={{ color: sensor.errorCount ? 'var(--signal-amber)' : 'var(--text-secondary)' }}>
                    {sensor.errorCount !== null ? sensor.errorCount : 'N/A'}
                  </td>
                  <td>
                    <SeverityPill severity={sensor.diagnosticState} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 9: COMMUNICATION & CONNECTIVITY */}
      <section className="bv-panel" aria-label="Communication and connectivity diagnostics">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--amber" />
            <h2 className="bv-panel-title">COMMUNICATION &amp; CONNECTIVITY // 5 Planned Paths</h2>
          </div>
          <span className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
            JK SMART BMS INTERFACE REMAINS CONFIGURABLE PENDING HARDWARE VERIFICATION
          </span>
        </div>

        <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bv-table">
            <thead>
              <tr>
                <th>Connection Path</th>
                <th>Interface</th>
                <th>Status</th>
                <th>Last Received</th>
                <th>Freshness</th>
                <th>Errors</th>
                <th>Engineering Notes</th>
              </tr>
            </thead>
            <tbody>
              {commLinks.map((link) => (
                <tr key={link.id}>
                  <td style={{ fontWeight: 600, color: 'var(--warm-neutral)', whiteSpace: 'nowrap' }}>
                    {link.connectionName}
                  </td>
                  <td className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    {link.interfaceLabel}
                  </td>
                  <td>{commStatusBadge(link.status)}</td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {link.lastReceived}
                  </td>
                  <td className="mono" style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    {link.freshnessLabel}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {link.errorCount !== null ? link.errorCount : 'N/A'}
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{link.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
