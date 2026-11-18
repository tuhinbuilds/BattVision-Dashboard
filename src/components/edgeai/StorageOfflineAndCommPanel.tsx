import React, { useMemo, useState } from 'react';
import { WifiOff } from 'lucide-react';
import {
  CommunicationLink,
  DatabaseStatus,
  EdgeBlockStatus,
} from '../../types/edgeai';
import { edgeStatusBadge } from './SystemArchitectureDiagram';

interface StorageOfflineAndCommPanelProps {
  database: DatabaseStatus;
  commLinks: CommunicationLink[];
}

export const StorageOfflineAndCommPanel: React.FC<StorageOfflineAndCommPanelProps> = ({
  database,
  commLinks,
}) => {
  const [commFilter, setCommFilter] = useState<'ALL' | EdgeBlockStatus>('ALL');

  const filteredLinks = useMemo(() => {
    if (commFilter === 'ALL') return commLinks;
    return commLinks.filter((l) => l.connectionStatus === commFilter);
  }, [commLinks, commFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* SECTION 11: OFFLINE AUTONOMY STATUS */}
      <section className="bv-panel" aria-label="Offline autonomy status">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <WifiOff size={14} style={{ color: 'var(--phosphor-green)' }} />
            <h2 className="bv-panel-title">OFFLINE AUTONOMY STATUS // Zero-Cloud Operation</h2>
          </div>
          <span className="bv-badge bv-badge--phosphor">
            INTERNET DEPENDENCY: NONE REQUIRED FOR CORE OPERATION
          </span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Visual Offline Loopback Flow */}
          <div
            className="scope-grid-bg"
            style={{
              border: '1px solid var(--border-color)',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            {[
              { step: '01 · ESP32-S3', detail: 'Direct local sensor acquisition (I2C · 1-Wire · ADC)' },
              { step: '02 · EDGE COMPUTER', detail: 'Local Python processing & offline ML inference' },
              { step: '03 · LOCAL DATABASE', detail: 'On-device SQLite storage (zero external server)' },
              { step: '04 · LOCAL DASHBOARD', detail: 'Offline browser UI on local loopback / LAN' },
            ].map((node) => (
              <div
                key={node.step}
                style={{
                  backgroundColor: '#181C19',
                  border: '1px solid var(--phosphor-green-border)',
                  padding: '9px 10px',
                  borderRadius: '2px',
                }}
              >
                <div className="mono" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--phosphor-green)' }}>
                  {node.step}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {node.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="four-col-grid mono" style={{ fontSize: '10.5px' }}>
            {[
              ['Local Telemetry Processing', 'LOCAL (NO CLOUD)'],
              ['Local Model Inference', 'OFFLINE RUNTIME'],
              ['Local Database', 'LOCAL SQLITE TARGET'],
              ['External Cloud Requirement', 'NONE (0% DEPENDENCY)'],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ color: 'var(--warm-neutral)', fontWeight: 600, marginTop: '2px' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 10: LOCAL DATA STORAGE */}
      <section className="bv-panel" aria-label="Local SQLite database storage status">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className={`status-led ${database.connected ? 'status-led--phosphor' : 'status-led--offline'}`} />
            <h2 className="bv-panel-title">LOCAL DATA STORAGE // {database.engine}</h2>
          </div>
          <span className={`bv-badge ${database.statusLabel.includes('SIMULATED') ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {database.statusLabel}
          </span>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="four-col-grid mono" style={{ fontSize: '10.5px' }}>
            {[
              ['Database Status', database.statusLabel],
              ['Database Size', database.sizeLabel],
              ['Total Buffered Records', database.totalRecords !== null ? String(database.totalRecords) : 'N/A'],
              ['Last Write / Read', `${database.lastWrite} / ${database.lastRead}`],
              ['Storage Location', database.storageLocation],
              ['Backup Status', database.backupStatus],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-subtle)',
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ color: 'var(--warm-neutral)', marginTop: '2px' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Planned SQLite Table</th>
                  <th>Stored Records</th>
                  <th>Current State</th>
                </tr>
              </thead>
              <tbody>
                {database.schemas.map((tbl) => (
                  <tr key={tbl.tableName}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--warm-neutral)' }}>
                      {tbl.tableName}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>{tbl.content}</td>
                    <td className="mono" style={{ fontSize: '10px', color: 'var(--signal-amber)' }}>
                      {tbl.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 12: COMMUNICATION & INTERFACE MONITOR */}
      <section className="bv-panel" aria-label="Communication and hardware interface monitor">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span className="status-led status-led--amber" />
            <h2 className="bv-panel-title">COMMUNICATION &amp; INTERFACE MONITOR // 7 Planned Links</h2>
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(['ALL', 'SIMULATED', 'NOT_CONNECTED', 'NOT_CONFIGURED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setCommFilter(st)}
                className={`bv-btn ${commFilter === st ? 'bv-btn--active' : ''}`}
                style={{ padding: '3px 7px', fontSize: '9px' }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bv-table">
            <thead>
              <tr>
                <th>Link Path</th>
                <th>Interface Type</th>
                <th>Configuration State</th>
                <th>Status</th>
                <th>Last Packet</th>
                <th>Errors</th>
                <th>Freshness</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.map((lnk) => (
                <tr key={lnk.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--warm-neutral)' }}>{lnk.path}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{lnk.note}</div>
                  </td>
                  <td className="mono" style={{ fontSize: '10.5px', color: 'var(--phosphor-green)' }}>
                    {lnk.interfaceType}
                  </td>
                  <td className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {lnk.configState}
                  </td>
                  <td>{edgeStatusBadge(lnk.connectionStatus)}</td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {lnk.lastPacket}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {lnk.errorCount !== null ? lnk.errorCount : 'N/A'}
                  </td>
                  <td className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {lnk.freshness}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
