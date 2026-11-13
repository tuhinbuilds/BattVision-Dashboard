import React from 'react';
import { BATTERY_PACK_SPECIFICATIONS } from '../../config/systemConfig';

export const PackSpecsDatasheet: React.FC = () => {
  const spec = BATTERY_PACK_SPECIFICATIONS;

  const rows = [
    { parameter: 'Chemistry', value: spec.chemistry, note: 'Prismatic/Cylindrical Iron Phosphate' },
    { parameter: 'Cell format', value: spec.cellFormat, note: '32 mm × 70 mm cylindrical cell' },
    { parameter: 'Cell count', value: String(spec.cellCount), note: '8 series groups × 4 parallel cells' },
    { parameter: 'Topology', value: spec.topology, note: 'Eight 4P modules wired in series' },
    { parameter: 'Cell nominal voltage', value: `${spec.cellNominalVoltageV.toFixed(1)} V`, note: 'Per 32700 LiFePO4 cell' },
    { parameter: 'Cell capacity', value: `${spec.cellCapacityAh.toFixed(0)} Ah`, note: 'Rated capacity per cell' },
    { parameter: 'Parallel cells per group', value: String(spec.parallelCellsPerGroup), note: 'Shared voltage node per group' },
    { parameter: 'Series groups', value: String(spec.seriesGroups), note: 'S1 through S8 series stack' },
    { parameter: 'Pack nominal voltage', value: `${spec.packNominalVoltageV.toFixed(1)} V`, note: '8 × 3.2 V nominal' },
    { parameter: 'Pack capacity', value: `${spec.packCapacityAh.toFixed(0)} Ah`, note: '4 × 6 Ah per parallel group' },
    { parameter: 'Pack energy', value: `${spec.packEnergyWh.toFixed(1)} Wh`, note: '25.6 V × 24 Ah nominal' },
    { parameter: 'Nominal full-charge voltage', value: `${spec.nominalFullChargeVoltageV.toFixed(1)} V`, note: '8 × 3.65 V charge ceiling' },
  ];

  return (
    <section className="bv-panel" aria-label="Pack electrical specifications datasheet">
      <div className="bv-panel-header">
        <div className="bv-panel-title-group">
          <span className="status-led status-led--phosphor" />
          <h2 className="bv-panel-title">Pack Electrical Specifications // Datasheet</h2>
        </div>
        <span className="bv-badge bv-badge--muted">{spec.packId} · REV 01</span>
      </div>

      <div className="bv-panel-body" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="bv-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Engineering Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.parameter}>
                <td style={{ color: 'var(--warm-neutral)', fontWeight: 500 }}>{row.parameter}</td>
                <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {row.value}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
