import React from 'react';
import {
  DataSourceMode,
  SensorChannelState,
  SensorChannelStatus,
} from '../../types/telemetry';

interface MeasurementSourcesAndStatusProps {
  sensorStatuses: SensorChannelStatus[];
  dataSourceMode: DataSourceMode;
}

function statusBadge(state: SensorChannelState) {
  switch (state) {
    case 'ONLINE':
      return (
        <span className="bv-badge bv-badge--phosphor">
          <span className="status-led status-led--phosphor status-led--pulse" />
          ONLINE
        </span>
      );
    case 'SIMULATED':
      return (
        <span className="bv-badge bv-badge--amber">
          <span className="status-led status-led--amber" />
          SIMULATED
        </span>
      );
    case 'STALE':
      return (
        <span className="bv-badge bv-badge--amber">
          <span className="status-led status-led--amber" />
          STALE
        </span>
      );
    case 'FAULT':
      return (
        <span className="bv-badge bv-badge--red">
          <span className="status-led status-led--red" />
          FAULT
        </span>
      );
    case 'NOT_CONNECTED':
    default:
      return (
        <span className="bv-badge bv-badge--muted">
          <span className="status-led status-led--offline" />
          NOT CONNECTED
        </span>
      );
  }
}

export const MeasurementSourcesAndStatus: React.FC<MeasurementSourcesAndStatusProps> = React.memo(
  ({ sensorStatuses, dataSourceMode }) => {
    const isDemo = dataSourceMode === 'DEMO';
    const measurementSources = sensorStatuses.filter((s) => s.channel !== 'CH-06');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* SECTION 8: MEASUREMENT SOURCE HARDWARE INFORMATION */}
        <section className="bv-panel" aria-label="Planned hardware measurement sources">
          <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
            <div className="bv-panel-title-group">
              <span className="status-led status-led--amber" />
              <h2 className="bv-panel-title">
                Measurement Sources // Planned Hardware Instrumentation
              </h2>
            </div>
            <span className="bv-badge bv-badge--muted">
              PHYSICAL WIRING PENDING · {isDemo ? 'SIMULATION ACTIVE' : 'HARDWARE OFFLINE'}
            </span>
          </div>

          <div className="bv-panel-body">
            <div
              className="sources-5-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '10px',
              }}
            >
              <style>{`
                @media (max-width: 1260px) {
                  .sources-5-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                  }
                }
                @media (max-width: 780px) {
                  .sources-5-grid {
                    grid-template-columns: minmax(0, 1fr) !important;
                  }
                }
              `}</style>
              {measurementSources.map((src) => (
                <div
                  key={src.channel}
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2px',
                    padding: '10px 11px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--warm-neutral)' }}
                      >
                        {src.sensor}
                      </span>
                      <span className="mono" style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                        {src.interfaceType}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {src.measurement}
                    </div>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: '10.5px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {src.engineeringNote}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>
                        LINK
                      </span>
                      {statusBadge(src.status)}
                    </div>
                    <div className="mono" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                      DATA: {src.availabilityNote}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 9: SENSOR CHANNEL STATUS TABLE */}
        <section className="bv-panel" aria-label="Sensor channel status table">
          <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
            <div className="bv-panel-title-group">
              <span
                className={`status-led ${isDemo ? 'status-led--amber' : 'status-led--offline'}`}
              />
              <h2 className="bv-panel-title">Sensor Channel Status // Diagnostic Registry</h2>
            </div>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              {isDemo
                ? 'DEMO MODE: CHANNELS MARKED SIMULATED (NEVER ONLINE)'
                : 'HARDWARE MODE: ALL UNWIRED CHANNELS MARKED NOT CONNECTED'}
            </span>
          </div>

          <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Sensor</th>
                  <th>Measurement</th>
                  <th>Interface</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th>Data Source</th>
                </tr>
              </thead>
              <tbody>
                {sensorStatuses.map((ch) => (
                  <tr key={ch.channel}>
                    <td className="mono" style={{ color: 'var(--warm-neutral)', fontWeight: 600 }}>
                      {ch.channel}
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {ch.sensor}
                    </td>
                    <td>{ch.measurement}</td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ch.interfaceType}
                    </td>
                    <td>{statusBadge(ch.status)}</td>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {ch.lastUpdate ?? 'N/A'}
                    </td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ch.dataSource}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }
);
