import React from 'react';
import { ControllerStatus, SensorInterfaceStatus } from '../../types/edgeai';
import { edgeStatusBadge } from './SystemArchitectureDiagram';

interface EmbeddedControllerPanelProps {
  controller: ControllerStatus;
  sensorInterfaces: SensorInterfaceStatus[];
}

export const EmbeddedControllerPanel: React.FC<EmbeddedControllerPanelProps> = ({
  controller,
  sensorInterfaces,
}) => {
  return (
    <section className="bv-panel" aria-label="Embedded acquisition controller ESP32-S3">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className="status-led status-led--amber" />
          <h2 className="bv-panel-title">EMBEDDED ACQUISITION NODE // {controller.identity}</h2>
          {edgeStatusBadge(controller.commStatus)}
        </div>
        <span className="bv-badge bv-badge--muted">{controller.firmware.installedLabel}</span>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Controller Metadata Grid */}
        <div className="four-col-grid">
          {[
            ['Controller Identity', controller.identity],
            ['Processor Architecture', controller.architecture],
            ['Firmware Version / Build', `${controller.firmware.version} · ${controller.firmware.build}`],
            ['Operating State', controller.operatingState],
            ['Acquisition Status', controller.acquisitionStatus],
            ['Planned Sensor Channels', '8 Channels (5 Sensor Types)'],
            ['Communication Status', controller.commStatus.replace('_', ' ')],
            ['Last Data Packet', controller.lastPacketTimestamp],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-subtle)',
                padding: '8px 10px',
              }}
            >
              <div className="micro-label" style={{ fontSize: '8.5px' }}>
                {k}
              </div>
              <div className="mono" style={{ fontSize: '11px', fontWeight: 600, marginTop: '3px', color: 'var(--warm-neutral)' }}>
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Conceptual 8-Module Firmware Architecture + Sensor Interfaces */}
        <div className="two-col-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="micro-label">CONCEPTUAL ESP32-S3 FIRMWARE MODULES (8 STAGES)</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
              {controller.firmware.modules.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-subtle)',
                    padding: '7px 9px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mono">
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--warm-neutral)' }}>
                      {mod.order}. {mod.name}
                    </span>
                    <span style={{ fontSize: '8.5px', color: 'var(--signal-amber)' }}>{mod.status}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{mod.role}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span className="micro-label">INTENDED SENSOR INTERFACES (NO GPIO ASSUMED)</span>
              <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                BUS ADDRESSES &amp; WIRING PENDING VERIFICATION
              </span>
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Interface</th>
                    <th>Signal Path</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorInterfaces.map((s) => (
                    <tr key={s.sensor}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--warm-neutral)' }}>
                        {s.sensor}
                      </td>
                      <td className="mono" style={{ fontSize: '10.5px', color: 'var(--phosphor-green)' }}>
                        {s.interfaceType}
                      </td>
                      <td style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        {s.signalPath}
                      </td>
                      <td>{edgeStatusBadge(s.wiringStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
