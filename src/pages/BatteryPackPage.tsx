import React, { useState } from 'react';
import { CellGroupConsistencyPanel } from '../components/pack/CellGroupConsistencyPanel';
import { EnergyFlowPanel } from '../components/pack/EnergyFlowPanel';
import { PackExplorerVisual } from '../components/pack/PackExplorerVisual';
import { PackSpecsDatasheet } from '../components/pack/PackSpecsDatasheet';
import { PackSummaryStrip } from '../components/pack/PackSummaryStrip';
import { SeriesGroupInspector } from '../components/pack/SeriesGroupInspector';
import { ThermalDistributionPanel } from '../components/pack/ThermalDistributionPanel';
import { BATTERY_PACK_SPECIFICATIONS } from '../config/systemConfig';
import { useTelemetry } from '../services/dataService';
import { BatteryCell } from '../types/telemetry';

type ExplorerViewMode = 'VISUALISATION' | 'TECHNICAL_DATA';

export const BatteryPackPage: React.FC = () => {
  const {
    telemetry,
    dataSourceMode,
    setDataSourceMode,
    activeSeriesGroups,
    activeTemperatureSensors,
    isPaused,
    hardwareConnected,
    backendHealth,
    backendPacketSeq,
  } = useTelemetry();

  const [viewMode, setViewMode] = useState<ExplorerViewMode>('VISUALISATION');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('S1');
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [selectedSensorId, setSelectedSensorId] = useState<string>('TEMP-01');

  const isDemo = dataSourceMode === 'DEMO';
  const hasLiveData = isDemo || hardwareConnected;

  const handleSelectCell = (cell: BatteryCell | null) => {
    setSelectedCellId(cell ? cell.id : null);
    if (cell) {
      setSelectedGroupId(cell.seriesGroupId);
    }
  };

  const metadataItems = [
    { k: 'PACK ID', v: BATTERY_PACK_SPECIFICATIONS.packId, accent: true },
    { k: 'CHEMISTRY', v: BATTERY_PACK_SPECIFICATIONS.chemistryCode },
    { k: 'TOPOLOGY', v: BATTERY_PACK_SPECIFICATIONS.topology },
    { k: 'CELL COUNT', v: '032' },
    { k: 'NOMINAL VOLTAGE', v: `${BATTERY_PACK_SPECIFICATIONS.packNominalVoltageV.toFixed(1)}V` },
    { k: 'NOMINAL CAPACITY', v: `${BATTERY_PACK_SPECIFICATIONS.packCapacityAh.toFixed(0)}Ah` },
  ];

  return (
    <div className="canvas-container page-enter">
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="section-kicker">MODULE 02 // DIAGNOSTIC CAD WORKSTATION</span>
            <span
              className={`bv-badge ${
                isDemo
                  ? 'bv-badge--amber'
                  : hardwareConnected
                  ? 'bv-badge--phosphor'
                  : backendHealth?.reachable
                  ? 'bv-badge--amber'
                  : 'bv-badge--muted'
              }`}
            >
              <span
                className={`status-led ${
                  isDemo
                    ? 'status-led--amber status-led--pulse'
                    : hardwareConnected
                    ? 'status-led--phosphor status-led--pulse'
                    : backendHealth?.reachable
                    ? 'status-led--amber'
                    : 'status-led--offline'
                }`}
              />
              {isDemo
                ? 'SIMULATION DATA / HARDWARE NOT CONNECTED'
                : hardwareConnected
                ? `EDGE BACKEND LIVE (#${backendPacketSeq ?? 0} · ${backendHealth?.activeSource ?? 'WS'})`
                : backendHealth?.reachable
                ? 'EDGE API READY / AWAITING PACKETS'
                : 'HARDWARE MODE / BACKEND NOT CONNECTED'}
            </span>
          </div>

          <h1 className="page-header__title">BATTERY PACK EXPLORER</h1>
          <p className="page-header__subtitle mono" style={{ fontSize: '12px', letterSpacing: '0.07em' }}>
            8S4P LiFePO4 / 32-CELL CONFIGURATION
          </p>
        </div>

        {/* View Mode & Data Source Mode Controls */}
        <div className="page-header__controls">
          <div
            role="group"
            aria-label="Data source mode"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setDataSourceMode('DEMO')}
              className={`bv-btn ${isDemo ? 'bv-btn--amber' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor: isDemo ? 'var(--signal-amber-dim)' : 'transparent',
              }}
            >
              DEMO MODE
            </button>
            <button
              type="button"
              onClick={() => setDataSourceMode('HARDWARE')}
              className={`bv-btn ${!isDemo ? 'bv-btn--active' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor: !isDemo ? 'var(--phosphor-green-dim)' : 'transparent',
              }}
              title="Inspect strict HARDWARE mode behavior with zero fabricated readings"
            >
              HARDWARE MODE
            </button>
          </div>

          <div
            role="group"
            aria-label="Explorer display mode"
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '2px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('VISUALISATION')}
              className={`bv-btn ${viewMode === 'VISUALISATION' ? 'bv-btn--active' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor:
                  viewMode === 'VISUALISATION' ? 'var(--phosphor-green-dim)' : 'transparent',
              }}
            >
              VISUALISATION
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TECHNICAL_DATA')}
              className={`bv-btn ${viewMode === 'TECHNICAL_DATA' ? 'bv-btn--active' : ''}`}
              style={{
                border: 'none',
                padding: '5px 9px',
                fontSize: '10px',
                backgroundColor:
                  viewMode === 'TECHNICAL_DATA' ? 'var(--phosphor-green-dim)' : 'transparent',
              }}
            >
              TECHNICAL DATA
            </button>
          </div>
        </div>
      </div>

      {/* COMPACT TECHNICAL METADATA STRIP */}
      <div
        className="bv-panel"
        style={{
          padding: '8px 14px',
          backgroundColor: '#1B1F1C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
        aria-label="Pack specification metadata strip"
      >
        <div
          className="mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '11px',
          }}
        >
          {metadataItems.map((item) => (
            <span key={item.k} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', letterSpacing: '0.08em' }}>
                {item.k}:
              </span>
              <strong
                style={{
                  color: item.accent ? 'var(--phosphor-green)' : 'var(--warm-neutral)',
                  fontWeight: 600,
                }}
              >
                {item.v}
              </strong>
            </span>
          ))}
        </div>

        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          8 × (4P 32700) · 614.4 Wh · 29.2 V FULL
        </span>
      </div>

      {/* COMPACT BATTERY PACK SUMMARY INSTRUMENTS (6 INSTRUMENTS) */}
      <PackSummaryStrip
        telemetry={telemetry}
        dataSourceMode={dataSourceMode}
        hasLiveData={hasLiveData}
        isPaused={isPaused}
      />

      {viewMode === 'VISUALISATION' ? (
        <>
          {/* CENTRAL INTERACTIVE 32-CELL 8S4P VISUALISATION + CELL DRAWER */}
          <PackExplorerVisual
            seriesGroups={activeSeriesGroups}
            selectedGroupId={selectedGroupId}
            selectedCellId={selectedCellId}
            dataSourceMode={dataSourceMode}
            onSelectGroup={(gid) => setSelectedGroupId(gid)}
            onSelectCell={handleSelectCell}
          />

          {/* SERIES GROUP S1-S8 INSPECTOR + CELL GROUP CONSISTENCY */}
          <div className="two-col-grid">
            <SeriesGroupInspector
              seriesGroups={activeSeriesGroups}
              selectedGroupId={selectedGroupId}
              selectedCellId={selectedCellId}
              dataSourceMode={dataSourceMode}
              onSelectGroup={(gid) => setSelectedGroupId(gid)}
              onSelectCell={(cell) => handleSelectCell(cell)}
            />

            <CellGroupConsistencyPanel
              seriesGroups={activeSeriesGroups}
              selectedGroupId={selectedGroupId}
              dataSourceMode={dataSourceMode}
              onSelectGroup={(gid) => setSelectedGroupId(gid)}
            />
          </div>

          {/* PACK ENERGY FLOW (BATTERY PACK -> BMS -> LOAD) */}
          <EnergyFlowPanel
            telemetry={telemetry}
            dataSourceMode={dataSourceMode}
            hasLiveData={hasLiveData}
            isPaused={isPaused}
          />

          {/* THERMAL DISTRIBUTION (4x DS18B20) + ELECTRICAL SPECIFICATIONS DATASHEET */}
          <div className="two-col-grid">
            <ThermalDistributionPanel
              sensors={activeTemperatureSensors}
              selectedSensorId={selectedSensorId}
              dataSourceMode={dataSourceMode}
              hasLiveData={hasLiveData}
              isPaused={isPaused}
              onSelectSensor={(sid) => setSelectedSensorId(sid)}
            />

            <PackSpecsDatasheet />
          </div>
        </>
      ) : (
        /* TECHNICAL DATA VIEW */
        <>
          <div className="two-col-grid">
            <PackSpecsDatasheet />

            <section className="bv-panel">
              <div className="bv-panel-header">
                <div className="bv-panel-title-group">
                  <span className="status-led status-led--amber" />
                  <h2 className="bv-panel-title">DS18B20 Thermal Sensor Registry (Illustrative Zones)</h2>
                </div>
                <span className="bv-badge bv-badge--muted">4 PROBES</span>
              </div>
              <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="bv-table">
                  <thead>
                    <tr>
                      <th>Sensor ID</th>
                      <th>Zone (Illustrative)</th>
                      <th>Temp</th>
                      <th>Status</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTemperatureSensors.map((s) => (
                      <tr key={s.id}>
                        <td className="mono" style={{ fontWeight: 600, color: 'var(--warm-neutral)' }}>
                          {s.id}
                        </td>
                        <td>{s.zoneTitle}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {s.temperatureC !== null ? `${s.temperatureC.toFixed(1)} °C` : 'UNAVAILABLE'}
                        </td>
                        <td className="mono">{s.status}</td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {s.dataSource}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Complete 8S Series Group & 32-Cell Tabular Matrix */}
          <section className="bv-panel">
            <div className="bv-panel-header">
              <div className="bv-panel-title-group">
                <span className="status-led status-led--phosphor" />
                <h2 className="bv-panel-title">8S4P Series Group &amp; 32-Cell Electrical Matrix</h2>
              </div>
              <span className={`bv-badge ${isDemo ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                {isDemo ? 'SIMULATED GROUP VOLTAGES' : 'HARDWARE UNAVAILABLE'}
              </span>
            </div>
            <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Parallel Cells (4P)</th>
                    <th>Nom. V</th>
                    <th>Nom. Ah</th>
                    <th>Group Voltage</th>
                    <th>Δ Mean</th>
                    <th>Individual Cell V</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSeriesGroups.map((grp) => (
                    <tr key={grp.id}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--phosphor-green)' }}>
                        {grp.id}
                      </td>
                      <td className="mono" style={{ fontSize: '11px' }}>
                        {grp.cells.map((c) => c.id).join(' · ')}
                      </td>
                      <td className="mono">{grp.nominalVoltageV.toFixed(1)} V</td>
                      <td className="mono">{grp.nominalCapacityAh.toFixed(0)} Ah</td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {grp.measurement.available && grp.measurement.voltageV !== null
                          ? `${grp.measurement.voltageV.toFixed(3)} V`
                          : 'UNAVAILABLE'}
                      </td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                        {grp.measurement.available && grp.measurement.deltaFromMeanMv !== null
                          ? `${grp.measurement.deltaFromMeanMv >= 0 ? '+' : ''}${grp.measurement.deltaFromMeanMv} mV`
                          : '—'}
                      </td>
                      <td className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        NOT INDIVIDUALLY MEASURED
                      </td>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                        {grp.measurement.dataSource}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
