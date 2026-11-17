import React, { useMemo, useState } from 'react';
import { Download, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TelemetryRecord } from '../../types/datalab';
import { DataSourceMode } from '../../types/telemetry';

interface HistoricalTelemetryExplorerProps {
  records: TelemetryRecord[];
  activeDatasetName: string;
  dataSourceMode: DataSourceMode;
  onExportVisibleCsv: (visible: TelemetryRecord[]) => void;
}

interface ChannelDef {
  key: keyof TelemetryRecord;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  axis: 'left' | 'right';
}

const CHANNELS: ChannelDef[] = [
  { key: 'packVoltage', label: 'Pack Voltage', shortLabel: 'Voltage (V)', unit: 'V', color: '#B8D65A', axis: 'left' },
  { key: 'packCurrent', label: 'Pack Current', shortLabel: 'Current (A)', unit: 'A', color: '#E69A42', axis: 'right' },
  { key: 'power', label: 'Electrical Power', shortLabel: 'Power (W)', unit: 'W', color: '#D6D2C5', axis: 'right' },
  { key: 'stateOfCharge', label: 'State of Charge', shortLabel: 'SoC (%)', unit: '%', color: '#8FB593', axis: 'right' },
  { key: 'temperature1', label: 'TEMP-01 (DS18B20)', shortLabel: 'TEMP-01 (°C)', unit: '°C', color: '#C5B883', axis: 'right' },
  { key: 'temperature2', label: 'TEMP-02 (DS18B20)', shortLabel: 'TEMP-02 (°C)', unit: '°C', color: '#E69A42', axis: 'right' },
  { key: 'temperature3', label: 'TEMP-03 (DS18B20)', shortLabel: 'TEMP-03 (°C)', unit: '°C', color: '#D75C4B', axis: 'right' },
  { key: 'temperature4', label: 'TEMP-04 (DS18B20)', shortLabel: 'TEMP-04 (°C)', unit: '°C', color: '#92998D', axis: 'right' },
  { key: 'accelerationX', label: 'Accel X (MPU6050)', shortLabel: 'Acc-X (g)', unit: 'g', color: '#B8D65A', axis: 'right' },
  { key: 'accelerationY', label: 'Accel Y (MPU6050)', shortLabel: 'Acc-Y (g)', unit: 'g', color: '#E69A42', axis: 'right' },
  { key: 'accelerationZ', label: 'Accel Z (MPU6050)', shortLabel: 'Acc-Z (g)', unit: 'g', color: '#D6D2C5', axis: 'right' },
  { key: 'gyroscopeX', label: 'Gyro X (MPU6050)', shortLabel: 'Gyr-X (°/s)', unit: '°/s', color: '#8FB593', axis: 'right' },
  { key: 'gyroscopeY', label: 'Gyro Y (MPU6050)', shortLabel: 'Gyr-Y (°/s)', unit: '°/s', color: '#C5B883', axis: 'right' },
  { key: 'gyroscopeZ', label: 'Gyro Z (MPU6050)', shortLabel: 'Gyr-Z (°/s)', unit: '°/s', color: '#92998D', axis: 'right' },
];

type RangePreset = '30' | '300' | '900' | '3600' | '86400' | 'ALL';

const PRESETS: { id: RangePreset; label: string; minSpanSec: number }[] = [
  { id: '30', label: '30s', minSpanSec: 0 },
  { id: '300', label: '5m', minSpanSec: 35 },
  { id: '900', label: '15m', minSpanSec: 300 },
  { id: '3600', label: '1h', minSpanSec: 900 },
  { id: '86400', label: '24h', minSpanSec: 3600 },
  { id: 'ALL', label: 'All Available', minSpanSec: 0 },
];

const TOOLTIP_STYLE = {
  backgroundColor: '#121513',
  border: '1px solid #4E564C',
  borderRadius: '2px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10.5px',
  color: '#F0F0E8',
};

export const HistoricalTelemetryExplorer: React.FC<HistoricalTelemetryExplorerProps> = ({
  records,
  activeDatasetName,
  dataSourceMode,
  onExportVisibleCsv,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<(keyof TelemetryRecord)[]>([
    'packVoltage',
    'packCurrent',
    'temperature3',
  ]);
  const [preset, setPreset] = useState<RangePreset>('ALL');
  const [zoomFactor, setZoomFactor] = useState<number>(1); // 1 = full range, 2 = latest 50%, 4 = latest 25%

  const spanSec = useMemo(() => {
    if (records.length < 2) return 0;
    return Math.max(
      0,
      Math.round((records[records.length - 1].epochMs - records[0].epochMs) / 1000)
    );
  }, [records]);

  const toggleChannel = (key: keyof TelemetryRecord) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      }
      return [...prev, key];
    });
  };

  const visibleRecords = useMemo(() => {
    if (!records.length) return [];
    let filtered = records;
    if (preset !== 'ALL') {
      const latestMs = records[records.length - 1].epochMs;
      const cutoff = latestMs - Number(preset) * 1000;
      const inRange = records.filter((r) => r.epochMs >= cutoff);
      filtered = inRange.length ? inRange : records.slice(-2);
    }
    if (zoomFactor > 1 && filtered.length > 6) {
      const count = Math.max(6, Math.floor(filtered.length / zoomFactor));
      return filtered.slice(filtered.length - count);
    }
    return filtered;
  }, [records, preset, zoomFactor]);

  const activeChannelDefs = useMemo(
    () => CHANNELS.filter((c) => selectedKeys.includes(c.key)),
    [selectedKeys]
  );

  const hasLeftAxis = activeChannelDefs.some((c) => c.axis === 'left');
  const hasRightAxis = activeChannelDefs.some((c) => c.axis === 'right');

  const dateBounds =
    visibleRecords.length > 0
      ? `${visibleRecords[0].timestamp.slice(0, 19).replace('T', ' ')} → ${visibleRecords[
          visibleRecords.length - 1
        ].timestamp
          .slice(0, 19)
          .replace('T', ' ')}`
      : 'NO RECORDS';

  return (
    <section className="bv-panel" aria-label="Historical telemetry explorer">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span
            className={`status-led ${
              records.length > 0 ? 'status-led--phosphor' : 'status-led--offline'
            }`}
          />
          <h2 className="bv-panel-title">Historical Telemetry Explorer // {activeDatasetName}</h2>
          <span className={`bv-badge ${dataSourceMode === 'DEMO' ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
            {dataSourceMode === 'DEMO' ? 'DEMO DATASET' : 'HARDWARE ARCHIVE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bv-btn"
            onClick={() => setZoomFactor((z) => Math.min(8, z * 2))}
            disabled={visibleRecords.length < 8}
            title="Zoom in on latest segment"
            style={{ padding: '4px 7px', fontSize: '9.5px' }}
          >
            <ZoomIn size={12} /> Zoom In
          </button>
          <button
            type="button"
            className="bv-btn"
            onClick={() => setZoomFactor((z) => Math.max(1, z / 2))}
            disabled={zoomFactor <= 1}
            title="Zoom out"
            style={{ padding: '4px 7px', fontSize: '9.5px' }}
          >
            <ZoomOut size={12} /> Zoom Out
          </button>
          <button
            type="button"
            className="bv-btn"
            onClick={() => {
              setZoomFactor(1);
              setPreset('ALL');
            }}
            style={{ padding: '4px 7px', fontSize: '9.5px' }}
          >
            <RotateCcw size={12} /> Reset View
          </button>
          <button
            type="button"
            className="bv-btn bv-btn--active"
            onClick={() => onExportVisibleCsv(visibleRecords)}
            disabled={visibleRecords.length === 0}
            style={{ padding: '4px 9px', fontSize: '9.5px' }}
          >
            <Download size={12} /> Export Visible CSV ({visibleRecords.length})
          </button>
        </div>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Time-Range Presets + Date Bounds */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '8px 10px',
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="micro-label" style={{ fontSize: '9px' }}>
              TIME RANGE:
            </span>
            {PRESETS.map((p) => {
              const supported = p.id === 'ALL' || p.id === '30' || spanSec >= p.minSpanSec;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!supported || records.length === 0}
                  onClick={() => {
                    setPreset(p.id);
                    setZoomFactor(1);
                  }}
                  className={`bv-btn ${preset === p.id ? 'bv-btn--active' : ''}`}
                  style={{
                    padding: '3px 8px',
                    fontSize: '9.5px',
                    opacity: supported && records.length > 0 ? 1 : 0.35,
                  }}
                  title={
                    supported
                      ? `Show ${p.label}`
                      : `Requires at least ${p.minSpanSec}s of recorded history`
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            SPAN: <strong style={{ color: 'var(--warm-neutral)' }}>{dateBounds}</strong> (Zoom {zoomFactor}×)
          </span>
        </div>

        {/* Multi-Channel Selector Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
          <span className="micro-label" style={{ fontSize: '9px', marginRight: '4px' }}>
            CHANNELS:
          </span>
          {CHANNELS.map((ch) => {
            const active = selectedKeys.includes(ch.key);
            return (
              <button
                key={String(ch.key)}
                type="button"
                onClick={() => toggleChannel(ch.key)}
                className="bv-btn"
                style={{
                  padding: '3px 7px',
                  fontSize: '9.5px',
                  borderColor: active ? ch.color : 'var(--border-subtle)',
                  backgroundColor: active ? 'rgba(39, 44, 39, 0.95)' : 'var(--bg-recessed)',
                  color: active ? ch.color : 'var(--text-muted)',
                }}
              >
                {ch.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Main Scientific Multi-Channel Plot */}
        {visibleRecords.length === 0 ? (
          <div
            className="scope-grid-bg"
            style={{
              border: '1px dashed var(--border-strong)',
              padding: '48px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--signal-amber)' }}>
              NO HISTORICAL TELEMETRY RECORDS AVAILABLE
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '500px' }}>
              In HARDWARE mode, BattVision does not fabricate historical telemetry. Import a CSV
              file in Dataset Manager or switch to DEMO mode to inspect simulated historical traces.
            </span>
          </div>
        ) : (
          <div
            className="scope-grid-bg"
            style={{
              height: '300px',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '12px 10px 6px 0',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visibleRecords}>
                <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fill: '#92998D', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  minTickGap={26}
                  stroke="#3B4139"
                />
                {hasLeftAxis && (
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{ fill: '#B8D65A', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                    stroke="#3B4139"
                    width={46}
                    unit="V"
                    domain={['auto', 'auto']}
                  />
                )}
                {(hasRightAxis || !hasLeftAxis) && (
                  <YAxis
                    yAxisId="right"
                    orientation={hasLeftAxis ? 'right' : 'left'}
                    tick={{ fill: '#D6D2C5', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                    stroke="#3B4139"
                    width={50}
                    domain={['auto', 'auto']}
                  />
                )}
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', paddingTop: '4px' }} />
                {activeChannelDefs.map((ch) => (
                  <Line
                    key={String(ch.key)}
                    yAxisId={ch.axis === 'left' && hasLeftAxis ? 'left' : 'right'}
                    type="monotone"
                    dataKey={String(ch.key)}
                    name={ch.shortLabel}
                    stroke={ch.color}
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
};
