import React, { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BatteryTelemetry,
  DataSourceMode,
  TelemetryHistoryPoint,
} from '../../types/telemetry';

interface MotionVibrationSectionProps {
  telemetry: BatteryTelemetry;
  history: TelemetryHistoryPoint[];
  dataSourceMode: DataSourceMode;
  hasLiveData?: boolean;
}

type AccelUnit = 'g' | 'm/s²';

const IMU_TOOLTIP = {
  backgroundColor: '#121513',
  border: '1px solid #4E564C',
  borderRadius: '2px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10.5px',
  color: '#F0F0E8',
};

export const MotionVibrationSection: React.FC<MotionVibrationSectionProps> = React.memo(
  ({ telemetry, history, dataSourceMode, hasLiveData }) => {
    const [accelUnit, setAccelUnit] = useState<AccelUnit>('g');
    const isDemo = hasLiveData ?? dataSourceMode === 'DEMO';

    const acc = telemetry.accelerometer;
    const gyro = telemetry.gyroscope;
    const recentImu = history.slice(-40);

    const accVals = isDemo
      ? accelUnit === 'g'
        ? { x: acc.xG, y: acc.yG, z: acc.zG, fmt: 3 }
        : { x: acc.xMs2, y: acc.yMs2, z: acc.zMs2, fmt: 2 }
      : null;

    const rmsG = isDemo ? acc.dynamicRmsG : null;

    const activityState =
      rmsG === null
        ? { label: 'UNAVAILABLE', badge: 'bv-badge--muted' }
        : rmsG < 0.035
        ? { label: 'STATIC / BENCH', badge: 'bv-badge--muted' }
        : rmsG < 0.14
        ? { label: 'LOW VIBRATION (SIM)', badge: 'bv-badge--phosphor' }
        : { label: 'ELEVATED MOTION (SIM)', badge: 'bv-badge--amber' };

    // Orientation crosshair coordinates (clamped inside reticle circle)
    const dotX = isDemo ? 56 + Math.max(-36, Math.min(36, acc.xG * 130)) : 56;
    const dotY = isDemo ? 56 - Math.max(-36, Math.min(36, acc.yG * 130)) : 56;

    return (
      <section className="bv-panel" aria-label="MPU6050 motion and vibration monitoring">
        <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
          <div className="bv-panel-title-group">
            <span
              className={`status-led ${isDemo ? 'status-led--phosphor' : 'status-led--offline'}`}
            />
            <h2 className="bv-panel-title">Motion &amp; Vibration // MPU6050 6-DOF IMU</h2>
            <span className={`bv-badge ${activityState.badge}`}>{activityState.label}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="micro-label" style={{ fontSize: '9px' }}>
              ACCEL UNIT
            </span>
            <div
              role="group"
              aria-label="Accelerometer measurement unit"
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-recessed)',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                padding: '2px',
                gap: '2px',
              }}
            >
              {(['g', 'm/s²'] as AccelUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setAccelUnit(u)}
                  className={`bv-btn ${accelUnit === u ? 'bv-btn--active' : ''}`}
                  style={{
                    border: 'none',
                    padding: '3px 7px',
                    fontSize: '9.5px',
                    textTransform: 'none',
                    backgroundColor: accelUnit === u ? 'var(--phosphor-green-dim)' : 'transparent',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
            <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
              {isDemo ? 'SIMULATED IMU' : 'NOT CONNECTED'}
            </span>
          </div>
        </div>

        <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            className="imu-layout-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(240px, 1.05fr) 150px minmax(280px, 1.35fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            <style>{`
              @media (max-width: 1120px) {
                .imu-layout-grid {
                  grid-template-columns: minmax(0, 1fr) !important;
                }
              }
            `}</style>

            {/* Left: Accelerometer & Gyroscope 6-Axis Numeric Readouts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-color)',
                  padding: '9px 10px',
                  borderRadius: '2px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="micro-label" style={{ fontSize: '9px' }}>
                    ACCELEROMETER (3-AXIS)
                  </span>
                  <span className="mono" style={{ fontSize: '9px', color: 'var(--phosphor-green)' }}>
                    UNIT: {accelUnit}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { ax: 'X', v: accVals?.x ?? null, c: '#B8D65A' },
                    { ax: 'Y', v: accVals?.y ?? null, c: '#E69A42' },
                    { ax: 'Z', v: accVals?.z ?? null, c: '#D6D2C5' },
                  ].map((item) => (
                    <div
                      key={item.ax}
                      style={{
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 7px',
                        borderRadius: '2px',
                      }}
                    >
                      <div className="mono" style={{ fontSize: '8.5px', color: item.c }}>
                        ACC-{item.ax}
                      </div>
                      <div className="mono" style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                        {item.v !== null
                          ? `${item.v >= 0 ? '+' : ''}${item.v.toFixed(accVals!.fmt)}`
                          : '--'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-color)',
                  padding: '9px 10px',
                  borderRadius: '2px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="micro-label" style={{ fontSize: '9px' }}>
                    GYROSCOPE (ANGULAR VELOCITY)
                  </span>
                  <span className="mono" style={{ fontSize: '9px', color: 'var(--warm-neutral)' }}>
                    UNIT: °/s
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {[
                    { ax: 'X', v: isDemo ? gyro.xDps : null },
                    { ax: 'Y', v: isDemo ? gyro.yDps : null },
                    { ax: 'Z', v: isDemo ? gyro.zDps : null },
                  ].map((item) => (
                    <div
                      key={item.ax}
                      style={{
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-subtle)',
                        padding: '6px 7px',
                        borderRadius: '2px',
                      }}
                    >
                      <div className="mono" style={{ fontSize: '8.5px', color: 'var(--text-secondary)' }}>
                        GYR-{item.ax}
                      </div>
                      <div className="mono" style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                        {item.v !== null ? `${item.v >= 0 ? '+' : ''}${item.v.toFixed(1)}` : '--'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle: 3-Axis Directional Vector / Horizon Reticle */}
            <div
              className="scope-grid-bg"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
              }}
            >
              <span className="micro-label" style={{ fontSize: '8.5px' }}>
                X-Y VECTOR RETICLE
              </span>
              <svg
                viewBox="0 0 112 112"
                width="106"
                height="106"
                role="img"
                aria-label="MPU6050 X-Y acceleration directional vector reticle"
              >
                <circle cx="56" cy="56" r="46" fill="#121513" stroke="#3B4139" strokeWidth="1" />
                <circle cx="56" cy="56" r="24" fill="none" stroke="#2C322B" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="56" x2="102" y2="56" stroke="#3B4139" strokeWidth="0.8" />
                <line x1="56" y1="10" x2="56" y2="102" stroke="#3B4139" strokeWidth="0.8" />
                {/* Vector stem from origin */}
                <line
                  x1="56"
                  y1="56"
                  x2={dotX}
                  y2={dotY}
                  stroke={isDemo ? '#B8D65A' : '#4E564C'}
                  strokeWidth="1.5"
                />
                <circle cx={dotX} cy={dotY} r="4.2" fill={isDemo ? '#B8D65A' : '#4E564C'} />
                <text x="56" y="19" textAnchor="middle" fill="#6E756A" fontFamily="IBM Plex Mono" fontSize="7.5">
                  +Y
                </text>
                <text x="95" y="53" textAnchor="end" fill="#6E756A" fontFamily="IBM Plex Mono" fontSize="7.5">
                  +X
                </text>
              </svg>
              <div className="mono" style={{ textAlign: 'center', fontSize: '9.5px', color: 'var(--warm-neutral)' }}>
                RMS:{' '}
                <strong style={{ color: isDemo ? 'var(--phosphor-green)' : 'var(--text-muted)' }}>
                  {rmsG !== null ? `${rmsG.toFixed(3)} g` : '--'}
                </strong>
              </div>
            </div>

            {/* Right: Compact 3-Axis Live Accelerometer Waveform */}
            <div
              style={{
                backgroundColor: '#131614',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'rgba(32, 36, 32, 0.72)',
                }}
              >
                <span className="mono" style={{ fontSize: '9.5px', color: 'var(--warm-neutral)' }}>
                  3-AXIS ACCELERATION WAVEFORM (g)
                </span>
                <span className="mono" style={{ fontSize: '9px', display: 'inline-flex', gap: '8px' }}>
                  <span style={{ color: '#B8D65A' }}>— X</span>
                  <span style={{ color: '#E69A42' }}>— Y</span>
                  <span style={{ color: '#D6D2C5' }}>— Z</span>
                </span>
              </div>

              <div className="scope-grid-bg" style={{ height: '148px', padding: '8px 8px 4px 0', flex: 1 }}>
                {!isDemo ? (
                  <div
                    className="mono"
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    MPU6050 I2C STREAM UNAVAILABLE (HARDWARE OFFLINE)
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentImu}>
                      <CartesianGrid stroke="#2C322B" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timeLabel"
                        tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
                        minTickGap={24}
                        stroke="#3B4139"
                      />
                      <YAxis
                        domain={[-0.6, 1.4]}
                        tick={{ fill: '#92998D', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
                        width={36}
                        stroke="#3B4139"
                      />
                      <Tooltip contentStyle={IMU_TOOLTIP} />
                      <Line type="monotone" dataKey="accXG" name="Acc X (g)" stroke="#B8D65A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="accYG" name="Acc Y (g)" stroke="#E69A42" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="accZG" name="Acc Z (g)" stroke="#D6D2C5" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Documented Vibration Formula & Honest Engineering Disclaimer */}
          <div
            className="mono"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              paddingTop: '6px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '9.5px',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              DYNAMIC RMS FORMULA: a_rms = √((a_x² + a_y² + (a_z − 1g)²) / 3)
            </span>
            <span>
              DIAGNOSTIC SCOPE: MPU6050 telemetry alone does not constitute validated battery damage or road-condition diagnosis.
            </span>
          </div>
        </div>
      </section>
    );
  }
);
