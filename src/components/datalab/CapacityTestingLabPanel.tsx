import React, { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { BATTERY_PACK_SPEC } from '../../config/systemConfig';
import { LabCapacityTestRecord } from '../../types/datalab';
import { DataSourceMode } from '../../types/telemetry';

interface CapacityTestingLabPanelProps {
  tests: LabCapacityTestRecord[];
  dataSourceMode: DataSourceMode;
  onAddCapacityTest: (test: LabCapacityTestRecord) => void;
  onExportTests: () => void;
}

export const CapacityTestingLabPanel: React.FC<CapacityTestingLabPanelProps> = ({
  tests,
  dataSourceMode,
  onAddCapacityTest,
  onExportTests,
}) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(tests[0]?.testId ?? null);
  const [useNominalRef, setUseNominalRef] = useState<boolean>(true);
  const [customRefAh, setCustomRefAh] = useState<number>(23.42);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Add test fields
  const [newCapAh, setNewCapAh] = useState<string>('23.10');
  const [newEnergyWh, setNewEnergyWh] = useState<string>('589.5');
  const [newTempC, setNewTempC] = useState<string>('28.2');
  const [newProfile, setNewProfile] = useState<string>('0.3C Constant Current (~7.2 A)');
  const [newDurationMin, setNewDurationMin] = useState<string>('190');

  const activeRefAh = useNominalRef ? BATTERY_PACK_SPEC.nominalCapacityAh : customRefAh;
  const selectedTest = tests.find((t) => t.testId === selectedTestId) ?? tests[0] ?? null;

  const validatedTestsCount = tests.filter((t) => t.validationStatus === 'VALIDATED').length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(newCapAh);
    if (!Number.isFinite(cap) || cap <= 0) return;
    const record: LabCapacityTestRecord = {
      testId: `CAP-LAB-${String(tests.length + 1).padStart(2, '0')}`,
      packId: BATTERY_PACK_SPEC.packId,
      testDate: new Date().toISOString().slice(0, 10),
      initialConditions: 'Charged to 29.2 V full-charge voltage, OCV rest complete',
      testTemperatureC: Number(newTempC) || null,
      startingSocPct: 100,
      endingCondition: 'Pack cutoff 20.0 V / 2.50 V min group',
      dischargeCurrentProfile: newProfile.trim() || 'Constant Current',
      testDurationMin: Number(newDurationMin) || 180,
      measuredCapacityAh: cap,
      measuredEnergyWh: Number(newEnergyWh) || null,
      referenceCapacityAh: activeRefAh,
      procedureNotes:
        dataSourceMode === 'DEMO'
          ? 'Local demo entry logged via Capacity Testing Lab (unvalidated).'
          : 'Manual lab record entered in HARDWARE mode (unvalidated until backend verified).',
      dataSource: dataSourceMode === 'DEMO' ? 'DEMO' : 'HARDWARE',
      validationStatus: dataSourceMode === 'DEMO' ? 'ILLUSTRATIVE_DEMO' : 'UNVALIDATED',
      dataQualityLabel: 'Manual Lab Entry',
      simulated: dataSourceMode === 'DEMO',
    };
    onAddCapacityTest(record);
    setSelectedTestId(record.testId);
    setShowAddForm(false);
  };

  return (
    <section className="bv-panel" aria-label="Battery capacity testing laboratory">
      <div className="bv-panel-header" style={{ flexWrap: 'wrap' }}>
        <div className="bv-panel-title-group">
          <span className={`status-led ${tests.length ? 'status-led--amber' : 'status-led--offline'}`} />
          <h2 className="bv-panel-title">BATTERY CAPACITY TESTING // Usable Capacity &amp; SoH Basis</h2>
          <span className="bv-badge bv-badge--muted">
            {validatedTestsCount === 0
              ? 'NO VALIDATED CAPACITY TEST AVAILABLE'
              : `${validatedTestsCount} VALIDATED`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bv-btn bv-btn--active"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <Plus size={12} /> {showAddForm ? 'Cancel' : 'Log Capacity Test'}
          </button>
          <button
            type="button"
            className="bv-btn"
            onClick={onExportTests}
            disabled={tests.length === 0}
          >
            <Download size={12} /> Export Tests CSV
          </button>
        </div>
      </div>

      <div className="bv-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Formula & Explicit Reference Capacity Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '9px 12px',
            backgroundColor: 'var(--bg-recessed)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="mono" style={{ fontSize: '11px', color: 'var(--warm-neutral)' }}>
            FORMULA:{' '}
            <strong style={{ color: 'var(--phosphor-green)' }}>
              SoH (%) = (Measured usable capacity / Reference capacity) × 100
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="micro-label" style={{ fontSize: '9px' }}>
              CONFIGURED REFERENCE:
            </span>
            <button
              type="button"
              onClick={() => setUseNominalRef(true)}
              className={`bv-btn ${useNominalRef ? 'bv-btn--active' : ''}`}
              style={{ padding: '3px 8px', fontSize: '9.5px' }}
            >
              24.0 Ah Nominal Spec
            </button>
            <button
              type="button"
              onClick={() => setUseNominalRef(false)}
              className={`bv-btn ${!useNominalRef ? 'bv-btn--amber' : ''}`}
              style={{ padding: '3px 8px', fontSize: '9.5px' }}
            >
              Measured Baseline ({customRefAh} Ah)
            </button>
            {!useNominalRef && (
              <input
                type="number"
                step="0.1"
                min="10"
                max="30"
                value={customRefAh}
                onChange={(e) => setCustomRefAh(Number(e.target.value) || 24)}
                aria-label="Custom reference capacity in Ah"
                className="mono"
                style={{
                  width: '66px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  padding: '3px 6px',
                  fontSize: '10.5px',
                }}
              />
            )}
          </div>
        </div>

        <div className="mono" style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
          NOTE: Nominal pack capacity (24.0 Ah) is used as a configured reference only when explicitly selected above — it is never assumed to equal measured initial usable capacity.
        </div>

        {/* Log Capacity Test Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            style={{
              padding: '12px',
              backgroundColor: '#191D1A',
              border: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {[
              { label: 'Measured Cap (Ah) *', val: newCapAh, set: setNewCapAh },
              { label: 'Energy (Wh)', val: newEnergyWh, set: setNewEnergyWh },
              { label: 'Test Temp (°C)', val: newTempC, set: setNewTempC },
              { label: 'Duration (min)', val: newDurationMin, set: setNewDurationMin },
              { label: 'Discharge Profile', val: newProfile, set: setNewProfile },
            ].map((f) => (
              <label key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="micro-label" style={{ fontSize: '8.5px' }}>
                  {f.label}
                </span>
                <input
                  type="text"
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  className="mono"
                  style={{
                    backgroundColor: 'var(--bg-recessed)',
                    border: '1px solid var(--border-color)',
                    padding: '5px 7px',
                    fontSize: '11px',
                  }}
                />
              </label>
            ))}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="bv-btn bv-btn--active">
                Save Capacity Record
              </button>
            </div>
          </form>
        )}

        {tests.length === 0 ? (
          <div
            className="scope-grid-bg"
            style={{
              border: '1px dashed var(--border-strong)',
              padding: '40px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--signal-amber)' }}>
              NO VALIDATED CAPACITY TEST AVAILABLE
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '520px' }}>
              In HARDWARE mode, BattVision never generates synthetic capacity tests. Record a
              controlled constant-current discharge test or switch to DEMO mode to inspect illustrative
              capacity-test records.
            </span>
          </div>
        ) : (
          <div className="two-col-grid">
            {/* Test Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
              <table className="bv-table">
                <thead>
                  <tr>
                    <th>Test ID</th>
                    <th>Date</th>
                    <th>Measured Ah</th>
                    <th>Calc SoH</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => {
                    const soh = (t.measuredCapacityAh / activeRefAh) * 100;
                    return (
                      <tr
                        key={t.testId}
                        onClick={() => setSelectedTestId(t.testId)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor:
                            selectedTest?.testId === t.testId
                              ? 'rgba(184, 214, 90, 0.08)'
                              : undefined,
                        }}
                      >
                        <td className="mono" style={{ fontWeight: 600, color: 'var(--warm-neutral)' }}>
                          {t.testId}
                        </td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {t.testDate}
                        </td>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {t.measuredCapacityAh.toFixed(2)} Ah
                        </td>
                        <td className="mono" style={{ color: 'var(--phosphor-green)', fontWeight: 600 }}>
                          {soh.toFixed(1)}%
                        </td>
                        <td>
                          <span
                            className={`bv-badge ${
                              t.validationStatus === 'VALIDATED'
                                ? 'bv-badge--phosphor'
                                : 'bv-badge--amber'
                            }`}
                          >
                            {t.validationStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Capacity Test Result Panel */}
            {selectedTest && (
              <div
                style={{
                  backgroundColor: 'var(--bg-recessed)',
                  border: '1px solid var(--border-color)',
                  padding: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="micro-label" style={{ color: 'var(--phosphor-green)' }}>
                    CAPACITY TEST RESULT // {selectedTest.testId}
                  </span>
                  <span className={`bv-badge ${selectedTest.simulated ? 'bv-badge--amber' : 'bv-badge--muted'}`}>
                    {selectedTest.simulated ? 'ILLUSTRATIVE DEMO' : selectedTest.dataSource}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div className="micro-label" style={{ fontSize: '8.5px' }}>Measured Cap</div>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: 600, marginTop: '2px' }}>
                      {selectedTest.measuredCapacityAh.toFixed(2)} Ah
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div className="micro-label" style={{ fontSize: '8.5px' }}>Reference Cap</div>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: 600, marginTop: '2px', color: 'var(--warm-neutral)' }}>
                      {activeRefAh.toFixed(2)} Ah
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div className="micro-label" style={{ fontSize: '8.5px' }}>Calculated SoH</div>
                    <div className="mono" style={{ fontSize: '18px', fontWeight: 600, marginTop: '2px', color: 'var(--phosphor-green)' }}>
                      {((selectedTest.measuredCapacityAh / activeRefAh) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="mono" style={{ fontSize: '10.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>PROFILE:</span> {selectedTest.dischargeCurrentProfile} ({selectedTest.testDurationMin} min)</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>ENERGY / TEMP:</span> {selectedTest.measuredEnergyWh ?? 'N/A'} Wh · {selectedTest.testTemperatureC ?? 'N/A'} °C</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>INITIAL / END:</span> {selectedTest.initialConditions} → {selectedTest.endingCondition}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>VALIDITY / QUALITY:</span> {selectedTest.validationStatus} · {selectedTest.dataQualityLabel}</div>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {selectedTest.procedureNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
