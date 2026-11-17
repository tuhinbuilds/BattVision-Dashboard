import {
  ColumnQualityMetric,
  DataQualityReport,
  DataValidationIssue,
  DataValidationStatus,
  TelemetryRecord,
} from '../types/datalab';
import { TelemetryHistoryPoint } from '../types/telemetry';
import { formatTimeShort } from './simulationService';

export function historyToTelemetryRecords(
  history: TelemetryHistoryPoint[]
): TelemetryRecord[] {
  return history.map((pt) => ({
    epochMs: pt.epochMs,
    timestamp: new Date(pt.epochMs).toISOString(),
    timeLabel: pt.timeLabel,
    packVoltage: pt.packVoltage,
    packCurrent: pt.packCurrent,
    power: pt.power,
    stateOfCharge: pt.stateOfCharge,
    temperature1: pt.temp1,
    temperature2: pt.temp2,
    temperature3: pt.temp3,
    temperature4: pt.temp4,
    accelerationX: pt.accXG,
    accelerationY: pt.accYG,
    accelerationZ: pt.accZG,
    gyroscopeX: pt.gyroXDps,
    gyroscopeY: pt.gyroYDps,
    gyroscopeZ: pt.gyroZDps,
    source: 'DEMO',
  }));
}

export interface ChargeDischargeMetrics {
  sampleCount: number;
  startLabel: string;
  durationSec: number;
  initialVoltageV: number | null;
  finalVoltageV: number | null;
  minVoltageV: number | null;
  maxVoltageV: number | null;
  avgCurrentA: number | null;
  energyEstimateWh: number | null;
  hasSamplingGaps: boolean;
  gapCount: number;
  state: 'CHARGING' | 'DISCHARGING' | 'IDLE' | 'UNKNOWN';
}

/**
 * Integrates power over time using actual sample timestamps (trapezoidal rule).
 * Never uses an arbitrary fixed step when real timestamps are present.
 */
export function computeChargeDischargeMetrics(
  records: TelemetryRecord[],
  signConventionConfigured: boolean
): ChargeDischargeMetrics {
  if (!records.length) {
    return {
      sampleCount: 0,
      startLabel: 'N/A',
      durationSec: 0,
      initialVoltageV: null,
      finalVoltageV: null,
      minVoltageV: null,
      maxVoltageV: null,
      avgCurrentA: null,
      energyEstimateWh: null,
      hasSamplingGaps: false,
      gapCount: 0,
      state: 'UNKNOWN',
    };
  }

  const sorted = [...records].sort((a, b) => a.epochMs - b.epochMs);
  const voltages = sorted.map((r) => r.packVoltage).filter((v): v is number => v !== null);
  const currents = sorted.map((r) => r.packCurrent).filter((v): v is number => v !== null);

  const durationSec = Math.max(
    0,
    Math.round((sorted[sorted.length - 1].epochMs - sorted[0].epochMs) / 1000)
  );

  // Compute timestamp deltas & detect sampling irregularities
  const deltasSec: number[] = [];
  for (let idx = 1; idx < sorted.length; idx++) {
    const dt = (sorted[idx].epochMs - sorted[idx - 1].epochMs) / 1000;
    if (dt > 0) deltasSec.push(dt);
  }
  const sortedDeltas = [...deltasSec].sort((a, b) => a - b);
  const medianDt = sortedDeltas.length
    ? sortedDeltas[Math.floor(sortedDeltas.length / 2)]
    : 1;

  let energyWh = 0;
  let validSegments = 0;
  let gapCount = 0;

  for (let idx = 1; idx < sorted.length; idx++) {
    const prev = sorted[idx - 1];
    const curr = sorted[idx];
    const dtSec = (curr.epochMs - prev.epochMs) / 1000;
    if (dtSec <= 0) continue;
    if (dtSec > medianDt * 3.0) {
      gapCount++;
    }
    if (prev.power !== null && curr.power !== null) {
      const avgPowerW = (prev.power + curr.power) / 2;
      energyWh += avgPowerW * (dtSec / 3600);
      validSegments++;
    }
  }

  const avgCurrentA = currents.length
    ? Number((currents.reduce((a, b) => a + b, 0) / currents.length).toFixed(2))
    : null;

  let state: ChargeDischargeMetrics['state'] = 'UNKNOWN';
  if (signConventionConfigured && avgCurrentA !== null) {
    if (avgCurrentA < -0.3) state = 'CHARGING';
    else if (avgCurrentA > 0.3) state = 'DISCHARGING';
    else state = 'IDLE';
  }

  return {
    sampleCount: sorted.length,
    startLabel: formatTimeShort(sorted[0].epochMs),
    durationSec,
    initialVoltageV: voltages.length ? voltages[0] : null,
    finalVoltageV: voltages.length ? voltages[voltages.length - 1] : null,
    minVoltageV: voltages.length ? Math.min(...voltages) : null,
    maxVoltageV: voltages.length ? Math.max(...voltages) : null,
    avgCurrentA,
    energyEstimateWh: validSegments > 0 ? Number(energyWh.toFixed(3)) : null,
    hasSamplingGaps: gapCount > 0,
    gapCount,
    state,
  };
}

interface FieldRangeRule {
  key: keyof TelemetryRecord;
  label: string;
  min: number;
  max: number;
}

const VALIDATION_FIELDS: FieldRangeRule[] = [
  { key: 'packVoltage', label: 'pack_voltage (V)', min: 18, max: 32 },
  { key: 'packCurrent', label: 'pack_current (A)', min: -55, max: 55 },
  { key: 'power', label: 'power (W)', min: -1500, max: 1800 },
  { key: 'stateOfCharge', label: 'state_of_charge (%)', min: 0, max: 100 },
  { key: 'temperature1', label: 'temperature_1 (°C)', min: -10, max: 85 },
  { key: 'temperature2', label: 'temperature_2 (°C)', min: -10, max: 85 },
  { key: 'temperature3', label: 'temperature_3 (°C)', min: -10, max: 85 },
  { key: 'temperature4', label: 'temperature_4 (°C)', min: -10, max: 85 },
  { key: 'accelerationX', label: 'acceleration_x (g)', min: -16, max: 16 },
  { key: 'accelerationY', label: 'acceleration_y (g)', min: -16, max: 16 },
  { key: 'accelerationZ', label: 'acceleration_z (g)', min: -16, max: 16 },
  { key: 'gyroscopeX', label: 'gyroscope_x (°/s)', min: -500, max: 500 },
  { key: 'gyroscopeY', label: 'gyroscope_y (°/s)', min: -500, max: 500 },
  { key: 'gyroscopeZ', label: 'gyroscope_z (°/s)', min: -500, max: 500 },
];

export function analyzeDataQuality(
  records: TelemetryRecord[],
  datasetName: string
): DataQualityReport {
  const totalRecords = records.length;

  if (totalRecords === 0) {
    return {
      datasetName,
      totalRecords: 0,
      missingValuesTotal: 0,
      duplicateTimestamps: 0,
      invalidTimestamps: 0,
      outOfRangeTotal: 0,
      missingChannels: VALIDATION_FIELDS.map((f) => f.label),
      samplingIrregularities: 0,
      overallCompletenessPct: 0,
      columns: VALIDATION_FIELDS.map((f) => ({
        columnName: f.label,
        dataType: 'number',
        availableCount: 0,
        missingCount: 0,
        completenessPct: 0,
        outOfRangeCount: 0,
        status: 'NOT_EVALUATED',
      })),
      issues: [
        {
          id: 'dq-empty',
          field: 'dataset',
          issueType: 'NO_RECORDS',
          count: 0,
          status: 'NOT_EVALUATED',
          detail: 'No records present in selected dataset to evaluate.',
        },
      ],
    };
  }

  let duplicateTimestamps = 0;
  let invalidTimestamps = 0;
  let samplingIrregularities = 0;
  const seenTs = new Set<number>();

  const sorted = [...records].sort((a, b) => a.epochMs - b.epochMs);
  const dts: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const ts = sorted[i].epochMs;
    if (!Number.isFinite(ts) || ts <= 0) {
      invalidTimestamps++;
    } else if (seenTs.has(ts)) {
      duplicateTimestamps++;
    } else {
      seenTs.add(ts);
    }
    if (i > 0) {
      const dt = sorted[i].epochMs - sorted[i - 1].epochMs;
      if (dt > 0) dts.push(dt);
    }
  }
  const medDt = dts.length ? [...dts].sort((a, b) => a - b)[Math.floor(dts.length / 2)] : 1000;
  for (const dt of dts) {
    if (dt > medDt * 2.5 || dt < medDt * 0.2) samplingIrregularities++;
  }

  let missingValuesTotal = 0;
  let outOfRangeTotal = 0;
  const missingChannels: string[] = [];
  const issues: DataValidationIssue[] = [];

  const columns: ColumnQualityMetric[] = VALIDATION_FIELDS.map((rule) => {
    let availableCount = 0;
    let missingCount = 0;
    let outOfRangeCount = 0;

    for (const r of records) {
      const val = r[rule.key];
      if (typeof val === 'number' && Number.isFinite(val)) {
        availableCount++;
        if (val < rule.min || val > rule.max) {
          outOfRangeCount++;
        }
      } else {
        missingCount++;
      }
    }

    missingValuesTotal += missingCount;
    outOfRangeTotal += outOfRangeCount;
    const completenessPct = Number(((availableCount / totalRecords) * 100).toFixed(1));

    let status: DataValidationStatus = 'VALID';
    if (availableCount === 0) {
      status = 'NOT_EVALUATED';
      missingChannels.push(rule.label);
    } else if (outOfRangeCount > 0 || completenessPct < 80) {
      status = 'INVALID';
    } else if (missingCount > 0) {
      status = 'WARNING';
    }

    if (outOfRangeCount > 0) {
      issues.push({
        id: `oor-${String(rule.key)}`,
        field: rule.label,
        issueType: 'OUT_OF_RANGE',
        count: outOfRangeCount,
        status: 'INVALID',
        detail: `${outOfRangeCount} values outside configured validation envelope [${rule.min}, ${rule.max}]. Inspect sensor scaling or CSV formatting (not automatically a physical fault).`,
      });
    }

    return {
      columnName: rule.label,
      dataType: 'number',
      availableCount,
      missingCount,
      completenessPct,
      outOfRangeCount,
      status,
    };
  });

  if (duplicateTimestamps > 0) {
    issues.push({
      id: 'dq-dup-ts',
      field: 'timestamp',
      issueType: 'DUPLICATE_TIMESTAMPS',
      count: duplicateTimestamps,
      status: 'WARNING',
      detail: `${duplicateTimestamps} duplicate timestamps detected; deduplication recommended prior to energy integration.`,
    });
  }
  if (invalidTimestamps > 0) {
    issues.push({
      id: 'dq-inv-ts',
      field: 'timestamp',
      issueType: 'INVALID_TIMESTAMPS',
      count: invalidTimestamps,
      status: 'INVALID',
      detail: `${invalidTimestamps} invalid timestamps found.`,
    });
  }
  if (samplingIrregularities > 0) {
    issues.push({
      id: 'dq-gap',
      field: 'timestamp',
      issueType: 'SAMPLING_IRREGULARITY',
      count: samplingIrregularities,
      status: 'WARNING',
      detail: `${samplingIrregularities} interval gaps deviated significantly from median sampling interval (${(
        medDt / 1000
      ).toFixed(2)} s).`,
    });
  }

  const totalCells = totalRecords * VALIDATION_FIELDS.length;
  const overallCompletenessPct = Number(
    (((totalCells - missingValuesTotal) / totalCells) * 100).toFixed(1)
  );

  return {
    datasetName,
    totalRecords,
    missingValuesTotal,
    duplicateTimestamps,
    invalidTimestamps,
    outOfRangeTotal,
    missingChannels,
    samplingIrregularities,
    overallCompletenessPct,
    columns,
    issues,
  };
}
