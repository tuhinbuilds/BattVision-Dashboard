import { BATTERY_PACK_SPEC } from '../config/systemConfig';
import {
  BatteryTelemetry,
  CellGroupReading,
  SeriesGroup,
  TemperatureSensor,
  TelemetryHistoryPoint,
} from '../types/telemetry';
import {
  buildSensorChannelStatuses,
  buildSubsystemStatuses,
  buildUnavailableHardwareSeriesGroups,
  classifyThermalZone,
  formatTimeShort,
} from './simulationService';

export interface BackendHealthSnapshot {
  reachable: boolean;
  systemId: string;
  databaseConnected: boolean;
  telemetryRecordsCount: number;
  activeSource: string | null;
  freshness: string;
  websocketClients: number;
  mlStatus: string;
  bmsStatus: string;
}

export interface BackendTelemetryPayload {
  id?: number;
  schema_version: string;
  device_id: string;
  sequence: number;
  timestamp: string;
  source: string;
  freshness?: string;
  pack_voltage: number | null;
  pack_current: number | null;
  power: number | null;
  state_of_charge: number | null;
  temperatures: Record<string, number | null>;
  accelerometer: { x: number | null; y: number | null; z: number | null };
  gyroscope: { x: number | null; y: number | null; z: number | null };
  cell_voltages?: (number | null)[] | null;
  sensor_status?: Record<string, string>;
}

export function getBackendHttpBase(): string {
  const envBase = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    // When served directly by the backend or in production (not Vite dev ports 5173 / 3000 / 4173)
    if (window.location.port !== '5173' && window.location.port !== '3000' && window.location.port !== '4173') {
      return window.location.origin;
    }
  }
  return 'http://127.0.0.1:8000';
}

export function getBackendWsUrl(): string {
  const httpBase = getBackendHttpBase();
  return `${httpBase.replace(/^http/, 'ws')}/ws/telemetry`;
}

export async function fetchBackendHealth(): Promise<BackendHealthSnapshot | null> {
  try {
    const res = await fetch(`${getBackendHttpBase()}/api/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return {
      reachable: true,
      systemId: body.system_id ?? 'BATTVISION-EDGE-01',
      databaseConnected: Boolean(body.database_connected),
      telemetryRecordsCount: Number(body.telemetry_records_count ?? 0),
      activeSource: body.active_source ?? null,
      freshness: body.freshness ?? 'OFFLINE',
      websocketClients: Number(body.websocket_clients ?? 0),
      mlStatus: body.ml_status ?? 'MODEL_NOT_DEPLOYED',
      bmsStatus: body.bms_status ?? 'NOT_CONFIGURED',
    };
  } catch {
    return null;
  }
}

export async function fetchBackendHistory(limit = 60): Promise<BackendTelemetryPayload[]> {
  try {
    const res = await fetch(`${getBackendHttpBase()}/api/v1/telemetry/history?limit=${limit}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body.records) ? body.records : [];
  } catch {
    return [];
  }
}

const PROBE_ZONES = [
  { id: 'TEMP-01', probeId: 'T1', title: 'Zone A · Negative Bus Side', sub: 'Illustrative placement near S1-S2 banks' },
  { id: 'TEMP-02', probeId: 'T2', title: 'Zone B · Inner Core Left', sub: 'Illustrative placement near S3-S4 banks' },
  { id: 'TEMP-03', probeId: 'T3', title: 'Zone C · Inner Core Right', sub: 'Illustrative placement near S5-S6 banks' },
  { id: 'TEMP-04', probeId: 'T4', title: 'Zone D · Positive Bus Side', sub: 'Illustrative placement near S7-S8 banks' },
] as const;

/**
 * Converts a validated Python backend WebSocket/REST packet into the shared BatteryTelemetry
 * contract while preserving null/missing sensor channels honestly.
 */
export function mapBackendPayloadToTelemetry(p: BackendTelemetryPayload): {
  frame: BatteryTelemetry;
  historyPoint: TelemetryHistoryPoint;
} {
  const parsedMs = Date.parse(p.timestamp);
  const epochMs = Number.isNaN(parsedMs) ? Date.now() : parsedMs;
  const timeLabel = formatTimeShort(epochMs);
  const isBackendSim = p.source === 'SIMULATION';
  const sourceLabel = isBackendSim ? 'DEMO' : 'HARDWARE';

  const validTemps = PROBE_ZONES.map((z) => p.temperatures?.[z.id]).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );
  const meanTemp = validTemps.length
    ? Number((validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1))
    : 0;
  const maxTemp = validTemps.length ? Math.max(...validTemps) : 0;
  const minTemp = validTemps.length ? Math.min(...validTemps) : 0;

  const temperatureSensors: TemperatureSensor[] = PROBE_ZONES.map((z) => {
    const val = p.temperatures?.[z.id];
    const valid = typeof val === 'number' && Number.isFinite(val);
    return {
      id: z.id,
      probeCode: z.probeId,
      hardwareModel: 'DS18B20',
      zoneTitle: z.title,
      zoneSubtitle: z.sub,
      illustrativePlacement: true,
      temperatureC: valid ? val : null,
      status: valid ? classifyThermalZone(val) : 'UNAVAILABLE',
      freshnessSeconds: valid ? 0 : null,
      timestamp: valid ? p.timestamp : null,
      dataSource: valid ? sourceLabel : 'UNAVAILABLE',
    };
  });

  // Series groups only if 8 group voltages were supplied by backend packet
  const suppliedCells =
    Array.isArray(p.cell_voltages) && p.cell_voltages.length === 8
      ? p.cell_voltages
      : null;

  let seriesGroups: SeriesGroup[] = buildUnavailableHardwareSeriesGroups();
  let cellVoltages: CellGroupReading[] = Array.from({ length: 8 }, (_, idx) => ({
    groupIndex: idx + 1,
    label: `S${idx + 1}`,
    voltage: 0,
    deltaFromMeanMv: 0,
    balancing: false,
  }));
  let cellDeltaMv = 0;

  if (suppliedCells && suppliedCells.every((v) => typeof v === 'number')) {
    const nums = suppliedCells as number[];
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    cellDeltaMv = Math.round((Math.max(...nums) - Math.min(...nums)) * 1000);
    cellVoltages = nums.map((v, idx) => ({
      groupIndex: idx + 1,
      label: `S${idx + 1}`,
      voltage: Number(v.toFixed(3)),
      deltaFromMeanMv: Math.round((v - mean) * 1000),
      balancing: false,
    }));
    seriesGroups = cellVoltages.map((cv) => ({
      id: cv.label,
      groupIndex: cv.groupIndex,
      parallelCellCount: 4,
      nominalVoltageV: BATTERY_PACK_SPEC.cellNominalVoltageV,
      nominalCapacityAh: BATTERY_PACK_SPEC.nominalCapacityAh,
      cells: [1, 2, 3, 4].map((pi) => ({
        id: `${cv.label}-C${pi}`,
        seriesGroupId: cv.label,
        groupIndex: cv.groupIndex,
        parallelIndex: pi,
        format: '32700',
        nominalVoltageV: BATTERY_PACK_SPEC.cellNominalVoltageV,
        nominalCapacityAh: BATTERY_PACK_SPEC.cellCapacityAh,
        measurement: {
          available: false,
          voltageV: null,
          dataSource: sourceLabel,
          note: 'Individual cell voltage is not independently measured. All 4 parallel cells share the parent series-group electrical potential.',
        },
      })),
      measurement: {
        available: true,
        voltageV: cv.voltage,
        deltaFromMeanMv: cv.deltaFromMeanMv,
        status: cv.voltage > 3.55 ? 'ELEVATED' : cv.voltage < 2.85 ? 'LOW' : 'NOMINAL',
        dataSource: sourceLabel,
        timestamp: p.timestamp,
      },
    }));
  }

  const ax = p.accelerometer?.x ?? 0;
  const ay = p.accelerometer?.y ?? 0;
  const az = p.accelerometer?.z ?? 1;
  const rms = Number(Math.sqrt((ax * ax + ay * ay + (az - 1) * (az - 1)) / 3).toFixed(3));
  const gx = p.gyroscope?.x ?? 0;
  const gy = p.gyroscope?.y ?? 0;
  const gz = p.gyroscope?.z ?? 0;

  const packVoltage = p.pack_voltage ?? 0;
  const packCurrent = p.pack_current ?? 0;
  const power =
    p.power !== null && p.power !== undefined
      ? p.power
      : Number((packVoltage * packCurrent).toFixed(1));
  const soc = p.state_of_charge ?? 0;

  const subsystems = buildSubsystemStatuses().map((sub) => {
    if (sub.id === 'edge-sbc' || sub.id === 'local-db') {
      return {
        ...sub,
        status: 'CONNECTED' as const,
        detail: `Python FastAPI + SQLite live (${p.device_id} seq #${p.sequence})`,
      };
    }
    if (sub.id === 'esp32') {
      return {
        ...sub,
        status: isBackendSim ? ('SIMULATED' as const) : ('CONNECTED' as const),
        detail: `${p.device_id} streaming ${p.source} packets`,
      };
    }
    return sub;
  });

  const sensorStatuses = buildSensorChannelStatuses(
    isBackendSim ? 'DEMO' : 'HARDWARE',
    timeLabel
  ).map((ch) => {
    if (ch.channel === 'CH-04' && p.temperatures?.['TEMP-03'] === null) {
      return {
        ...ch,
        status: 'STALE' as const,
        availabilityNote: 'TEMP-03 Missing (null in packet)',
      };
    }
    return ch;
  });

  const frame: BatteryTelemetry = {
    timestamp: p.timestamp,
    epochMs,
    source: isBackendSim ? 'DEMO' : 'HARDWARE',
    packVoltage,
    packCurrent,
    power,
    stateOfCharge: soc,
    temperature: meanTemp,
    maxTemperature: maxTemp,
    minTemperature: minTemp,
    vibration: { x: ax, y: ay, z: az, rms },
    accelerometer: {
      xG: ax,
      yG: ay,
      zG: az,
      xMs2: Number((ax * 9.80665).toFixed(2)),
      yMs2: Number((ay * 9.80665).toFixed(2)),
      zMs2: Number((az * 9.80665).toFixed(2)),
      dynamicRmsG: rms,
    },
    gyroscope: {
      xDps: gx,
      yDps: gy,
      zDps: gz,
      magnitudeDps: Number(Math.sqrt(gx * gx + gy * gy + gz * gz).toFixed(2)),
    },
    cellVoltages,
    cellTemperatures: PROBE_ZONES.map((z) => ({
      probeId: z.probeId,
      location: z.title,
      sensor: 'DS18B20',
      temperature: p.temperatures?.[z.id] ?? 0,
    })),
    seriesGroups,
    temperatureSensors,
    sensorStatuses,
    dataFreshness: p.freshness === 'STALE' ? 'STALE' : 'LIVE',
    cellDeltaMv,
    soh: {
      status: 'MODEL_NOT_CONNECTED',
      value: null,
      unit: '%',
      confidence: null,
      sourceLabel: 'MODEL NOT DEPLOYED',
      description: 'Backend ML runtime reports MODEL_NOT_DEPLOYED.',
    },
    rul: {
      status: 'MODEL_NOT_CONNECTED',
      value: null,
      unit: 'cycles',
      confidence: null,
      sourceLabel: 'MODEL NOT DEPLOYED',
      description: 'Backend ML runtime reports insufficient ageing data & no deployed model.',
    },
    socEstimate: {
      status: 'DEMO_ESTIMATE',
      value: p.state_of_charge,
      unit: '%',
      confidence: null,
      sourceLabel: `BACKEND COULOMB (${p.source})`,
      description: 'Received from Python backend Coulomb-counting SoC service.',
    },
    systemStatus: {
      operatingMode: isBackendSim ? 'DEMO' : 'HARDWARE',
      simulationProfile: 'NOMINAL_DRIVE',
      demoScenario: 'NORMAL_OPERATION',
      monitoringState: 'ACTIVE_SIMULATION',
      subsystems,
      esp32Status: isBackendSim ? 'SIMULATED' : 'CONNECTED',
      edgeComputerStatus: 'CONNECTED',
      bmsStatus: 'NOT_CONNECTED',
    },
  };

  const historyPoint: TelemetryHistoryPoint = {
    epochMs,
    timeLabel,
    packVoltage,
    packCurrent,
    power,
    temperature: meanTemp,
    stateOfCharge: soc,
    vibrationRms: rms,
    cellDeltaMv,
    temp1: p.temperatures?.['TEMP-01'] ?? meanTemp,
    temp2: p.temperatures?.['TEMP-02'] ?? meanTemp,
    temp3: p.temperatures?.['TEMP-03'] ?? meanTemp,
    temp4: p.temperatures?.['TEMP-04'] ?? meanTemp,
    accXG: ax,
    accYG: ay,
    accZG: az,
    gyroXDps: gx,
    gyroYDps: gy,
    gyroZDps: gz,
  };

  return { frame, historyPoint };
}
