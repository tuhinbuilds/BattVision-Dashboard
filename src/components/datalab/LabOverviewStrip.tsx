import React from 'react';
import { DataSourceMode } from '../../types/telemetry';

interface LabOverviewStripProps {
  totalSamples: number;
  experimentCount: number;
  capacityTestCount: number;
  datasetCount: number;
  lastImportLabel: string;
  lastSessionLabel: string;
  dataSourceMode: DataSourceMode;
}

export const LabOverviewStrip: React.FC<LabOverviewStripProps> = ({
  totalSamples,
  experimentCount,
  capacityTestCount,
  datasetCount,
  lastImportLabel,
  lastSessionLabel,
  dataSourceMode,
}) => {
  const isDemo = dataSourceMode === 'DEMO';

  const items = [
    {
      label: 'Total Recorded Samples',
      value: totalSamples.toLocaleString(),
      sub: isDemo ? 'Bounded demo ring / imported' : 'Hardware DB not connected',
    },
    {
      label: 'Experimental Sessions',
      value: String(experimentCount),
      sub: isDemo ? 'Demo + local sessions' : 'Backend archive offline',
    },
    {
      label: 'Capacity Tests',
      value: String(capacityTestCount),
      sub: isDemo ? 'Illustrative demo tests' : '0 validated tests',
    },
    {
      label: 'Available Datasets',
      value: String(datasetCount),
      sub: 'Local registry + CSV imports',
    },
    {
      label: 'Storage Usage',
      value: 'N/A',
      sub: isDemo ? 'Volatile browser session only' : 'Edge SQLite not connected',
    },
    {
      label: 'Last Data Import',
      value: lastImportLabel,
      sub: 'CSV import workflow',
    },
    {
      label: 'Last Recording Session',
      value: lastSessionLabel,
      sub: isDemo ? 'Active demo stream' : 'No hardware session',
    },
  ];

  return (
    <section
      aria-label="Laboratory overview summary"
      className="lab-overview-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '10px',
      }}
    >
      <style>{`
        @media (max-width: 1360px) {
          .lab-overview-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 780px) {
          .lab-overview-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      {items.map((item) => (
        <div
          key={item.label}
          className="bv-panel"
          style={{
            padding: '10px 11px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '5px',
          }}
        >
          <span className="micro-label" style={{ fontSize: '8.5px' }}>
            {item.label}
          </span>
          <span
            className="mono"
            style={{
              fontSize: item.value.length > 8 ? '12.5px' : '19px',
              fontWeight: 600,
              color: item.value === 'N/A' || item.value === 'NONE' ? 'var(--text-muted)' : 'var(--warm-neutral)',
              lineHeight: 1.15,
            }}
          >
            {item.value}
          </span>
          <span
            className="mono"
            style={{
              fontSize: '8.5px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={item.sub}
          >
            {item.sub}
          </span>
        </div>
      ))}
    </section>
  );
};
