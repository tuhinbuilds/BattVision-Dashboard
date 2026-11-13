import React, { useMemo } from 'react';

interface SparklinePlotProps {
  values: number[];
  color?: string;
  height?: number;
  minOverride?: number;
  maxOverride?: number;
  paused?: boolean;
}

export const SparklinePlot: React.FC<SparklinePlotProps> = ({
  values,
  color = 'var(--phosphor-green)',
  height = 42,
  minOverride,
  maxOverride,
  paused = false,
}) => {
  const width = 220;
  const padX = 4;
  const padY = 5;

  const { linePath, areaPath, lastPoint } = useMemo(() => {
    if (!values.length) {
      return { linePath: '', areaPath: '', lastPoint: null };
    }

    const rawMin = minOverride !== undefined ? minOverride : Math.min(...values);
    const rawMax = maxOverride !== undefined ? maxOverride : Math.max(...values);
    const span = rawMax - rawMin || 1;
    const min = rawMin - span * 0.12;
    const max = rawMax + span * 0.12;
    const range = max - min || 1;

    const coords = values.map((v, idx) => {
      const x =
        values.length === 1
          ? width - padX
          : padX + (idx / (values.length - 1)) * (width - padX * 2);
      const normY = (v - min) / range;
      const y = height - padY - normY * (height - padY * 2);
      return { x, y };
    });

    const line = coords
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${height} L${coords[0].x.toFixed(
      1
    )},${height} Z`;

    return {
      linePath: line,
      areaPath: area,
      lastPoint: coords[coords.length - 1],
    };
  }, [values, height, minOverride, maxOverride]);

  const gradId = useMemo(
    () => `spark-grad-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  return (
    <div
      className="scope-grid-bg"
      style={{
        width: '100%',
        height: `${height}px`,
        border: '1px solid var(--border-subtle)',
        borderRadius: '2px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Center oscilloscope reference graticule */}
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#3B4139"
          strokeWidth="0.75"
          strokeDasharray="3 3"
        />

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="miter"
            strokeLinecap="square"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {lastPoint && (
          <g>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="2.4"
              fill={color}
              opacity={paused ? 0.55 : 1}
            />
          </g>
        )}
      </svg>
    </div>
  );
};
