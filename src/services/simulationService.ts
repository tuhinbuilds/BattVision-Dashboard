import {
  BATTERY_PACK_SPEC,
  SIMULATION_PROFILES,
  THERMAL_DISPLAY_BANDS,
} from '../config/systemConfig';
import {
  AccelerometerVector,
  BatteryCell,
  BatteryTelemetry,
  CellGroupReading,
  DataSourceMode,
  DemoScenarioId,
  DiagnosticRuleCheck,
  GyroscopeVector,
  SensorChannelStatus,
  SeriesGroup,
  SimulationProfile,
  SystemSubsystemStatus,
  TemperatureSensor,
  TempProbeReading,
  ThermalZoneStatus,
} from '../types/telemetry';

const GRAVITY_MS2 = 9.80665;

/**
 * Realistic LiFePO4 single-cell OCV curve (32700 chemistry).
 * Captures the flat 3.22V–3.33V plateau between 15% and 90% SoC,
 * steep knee above 94%, and drop-off below 12%.
 */
function lifepo4CellOcv(socPercent: number): number {
  const s = Math.max(0, Math.min(100, socPercent));
  if (s >= 95) {
    return 3.36 + ((s - 95) / 5) * 0.29; // 3.36V -> 3.65V
  }
  if (s >= 80) {
    return 3.32 + ((s - 80) / 15) * 0.04; // 3.32V -> 3.36V
  }
  if (s >= 20) {
    return 3.22 + ((s - 20) / 60) * 0.1; // flat plateau 3.22V -> 3.32V
  }
  if (s >= 10) {
    return 3.05 + ((s - 10) / 10) * 0.17; // 3.05V -> 3.22V
  }
  return 2.5 + (s / 10) * 0.55; // 2.50V -> 3.05V
}

const CELL_GROUP_OFFSETS_V = [0.004, -0.003, 0.006, 0.002, -0.005, 0.003, -0.004, -0.003];
const CELL_GROUP_RESISTANCE_OHM = [0.0082, 0.0085, 0.0079, 0.0084, 0.0088, 0.0081, 0.0086, 0.0083];

const PROBE_META = [
  {
    id: 'TEMP-01',
    probeId: 'T1',
    location: 'Bank S1–S2 Terminal',
    zoneTitle: 'Zone A · Negative Bus Side',
    zoneSubtitle: 'Illustrative placement near S1–S2 banks',
    biasC: -0.6,
  },
  {
    id: 'TEMP-02',
    probeId: 'T2',
    location: 'Bank S3–S4 Core',
    zoneTitle: 'Zone B · Inner Core Left',
    zoneSubtitle: 'Illustrative placement near S3–S4 banks',
    biasC: 0.9,
  },
  {
    id: 'TEMP-03',
    probeId: 'T3',
    location: 'Bank S5–S6 Core',
    zoneTitle: 'Zone C · Inner Core Right',
    zoneSubtitle: 'Illustrative placement near S5–S6 banks',
    biasC: 1.1,
  },
  {
    id: 'TEMP-04',
    probeId: 'T4',
    location: 'Bank S7–S8 Busbar',
    zoneTitle: 'Zone D · Positive Bus Side',
    zoneSubtitle: 'Illustrative placement near S7–S8 banks',
    biasC: -0.4,
  },
] as const;

export function classifyThermalZone(tempC: number | null): ThermalZoneStatus {
  if (tempC === null) return 'UNAVAILABLE';
  if (tempC < THERMAL_DISPLAY_BANDS.coolMaxC) return 'COOL';
  if (tempC <= THERMAL_DISPLAY_BANDS.normalMaxC) return 'NORMAL';
  if (tempC <= THERMAL_DISPLAY_BANDS.warmMaxC) return 'WARM';
  return 'CRITICAL';
}

function buildCellsForGroup(
  groupIndex: number,
  dataSource: 'DEMO' | 'HARDWARE' | 'UNAVAILABLE'
): BatteryCell[] {
  const groupId = `S${groupIndex}`;
  return [1, 2, 3, 4].map((parallelIndex) => ({
    id: `${groupId}-C${parallelIndex}`,
    seriesGroupId: groupId,
    groupIndex,
    parallelIndex,
    format: '32700',
    nominalVoltageV: BATTERY_PACK_SPEC.cellNominalVoltageV,
    nominalCapacityAh: BATTERY_PACK_SPEC.cellCapacityAh,
    measurement: {
      available: false,
      voltageV: null,
      dataSource,
      note: 'Individual cell voltage is not independently measured. All 4 parallel cells share the parent series-group electrical potential.',
    },
  }));
}

export function buildUnavailableHardwareSeriesGroups(): SeriesGroup[] {
  return Array.from({ length: 8 }, (_, idx) => {
    const groupIndex = idx + 1;
    const id = `S${groupIndex}`;
    return {
      id,
      groupIndex,
      parallelCellCount: 4,
      nominalVoltageV: BATTERY_PACK_SPEC.cellNominalVoltageV,
      nominalCapacityAh: BATTERY_PACK_SPEC.nominalCapacityAh,
      cells: buildCellsForGroup(groupIndex, 'UNAVAILABLE'),
      measurement: {
        available: false,
        voltageV: null,
        deltaFromMeanMv: null,
        status: 'UNAVAILABLE',
        dataSource: 'UNAVAILABLE',
        timestamp: null,
      },
    };
  });
}

export function buildUnavailableHardwareSensors(): TemperatureSensor[] {
  return PROBE_META.map((p) => ({
    id: p.id,
    probeCode: p.probeId,
    hardwareModel: 'DS18B20',
    zoneTitle: p.zoneTitle,
    zoneSubtitle: p.zoneSubtitle,
    illustrativePlacement: true,
    temperatureC: null,
    status: 'UNAVAILABLE',
    freshnessSeconds: null,
    timestamp: null,
    dataSource: 'UNAVAILABLE',
  }));
}

export function buildSensorChannelStatuses(
  mode: DataSourceMode,
  timeLabel: string | null
): SensorChannelStatus[] {
  const isDemo = mode === 'DEMO';
  const state = isDemo ? 'SIMULATED' : 'NOT_CONNECTED';
  const source = isDemo ? 'DEMO' : 'UNAVAILABLE';
  const lastUpdate = isDemo ? timeLabel : null;
  const availability = isDemo ? 'Simulated Demo Stream' : 'Unavailable (Offline)';

  return [
    {
      channel: 'CH-01',
      sensor: 'INA226',
      measurement: 'Bus Voltage / Shunt Power Monitor',
      interfaceType: 'I2C (0x40)',
      status: state,
      lastUpdate,
      dataSource: source,
      availabilityNote: availability,
      engineeringNote:
        'Pack-level connection requires verified external shunt sizing and voltage-divider/bus rating.',
    },
    {
      channel: 'CH-02',
      sensor: 'ACS758-50B',
      measurement: 'Hall-Effect Current (±50 A Nominal)',
      interfaceType: 'Analog → ADS1115',
      status: state,
      lastUpdate,
      dataSource: source,
      availabilityNote: availability,
      engineeringNote:
        'Nominal ±50 A bidirectional range; distinct from INA226 shunt monitor (not assumed redundant).',
    },
    {
      channel: 'CH-03',
      sensor: 'ADS1115',
      measurement: '16-Bit External ADC Interface',
      interfaceType: 'I2C (0x48)',
      status: state,
      lastUpdate,
      dataSource: source,
      availabilityNote: availability,
      engineeringNote:
        'Digitizes analog sensor channels (e.g., ACS758-50B output) with 16-bit resolution.',
    },
    {
      channel: 'CH-04',
      sensor: 'DS18B20 × 4',
      measurement: 'Pack Zone Temperatures (TEMP-01..04)',
      interfaceType: '1-Wire Bus',
      status: state,
      lastUpdate,
      dataSource: source,
      availabilityNote: availability,
      engineeringNote:
        '4 waterproof probes monitoring selected pack zones (does not individually measure all 32 cells).',
    },
    {
      channel: 'CH-05',
      sensor: 'MPU6050',
      measurement: '3-Axis Accelerometer & Gyroscope',
      interfaceType: 'I2C (0x68)',
      status: state,
      lastUpdate,
      dataSource: source,
      availabilityNote: availability,
      engineeringNote:
        'Tracks enclosure motion & vibration telemetry; not a standalone validated damage diagnostic.',
    },
    {
      channel: 'CH-06',
      sensor: 'JK Smart BMS (B1A8S10P)',
      measurement: '8S Series Group Telemetry',
      interfaceType: 'RS485 / BLE',
      status: 'NOT_CONNECTED',
      lastUpdate: null,
      dataSource: 'UNAVAILABLE',
      availabilityNote: 'Not Connected (Pending Verification)',
      engineeringNote:
        'Hardware device and communication protocol verification pending before live integration.',
    },
  ];
}

export interface SimulationInternalState {
  tick: number;
  socPercent: number;
  currentA: number;
  coreTempC: number;
  profile: SimulationProfile;
}

export function createInitialSimulationState(
  profile: SimulationProfile = 'NOMINAL_DRIVE'
): SimulationInternalState {
  return {
    tick: 0,
    socPercent: 78.4,
    currentA: SIMULATION_PROFILES[profile].targetCurrentA,
    coreTempC: 30.8,
    profile,
  };
}

export function buildSubsystemStatuses(): SystemSubsystemStatus[] {
  return [
    {
      id: 'esp32',
      name: 'ESP32-S3',
      hardwareSpec: 'PCBCupid Glyph ESP32-S3',
      status: 'SIMULATED',
      detail: 'Virtual telemetry stream active (no USB/UART bridge)',
      interfaceBus: 'UART / Wi-Fi (Sim)',
    },
    {
      id: 'jk-bms',
      name: 'JK BMS',
      hardwareSpec: 'JK Smart BMS B1A8S10P',
      status: 'NOT_CONNECTED',
      detail: 'Awaiting hardware interface verification',
      interfaceBus: 'RS485 / BLE (Offline)',
    },
    {
      id: 'edge-sbc',
      name: 'Edge Computer',
      hardwareSpec: 'Linux SBC (Selection Pending)',
      status: 'SIMULATED',
      detail: 'Local browser simulation runtime active',
      interfaceBus: 'Localhost Loopback',
    },
    {
      id: 'sensor-net',
      name: 'Sensor Network',
      hardwareSpec: 'INA226 · ACS758 · ADS1115 · 4×DS18B20 · MPU6050',
      status: 'DEMO',
      detail: 'Synthesized 8S4P multi-channel sensor frames',
      interfaceBus: 'I2C + 1-Wire (Demo)',
    },
    {
      id: 'local-db',
      name: 'Local Database',
      hardwareSpec: 'In-Memory Session Ring Buffer',
      status: 'DEMO',
      detail: 'Temporary browser buffer (SQLite edge store pending)',
      interfaceBus: 'Volatile Session Store',
    },
    {
      id: 'ml-engine',
      name: 'ML Inference Engine',
      hardwareSpec: 'Offline SoH / RUL Edge Runtime',
      status: 'NOT_CONNECTED',
      detail: 'No trained model artifact loaded',
      interfaceBus: 'Python IPC (Offline)',
    },
  ];
}

export function stepSimulation(
  prev: SimulationInternalState,
  profile: SimulationProfile,
  dtSeconds: number,
  timestampMs: number,
  isPaused: boolean,
  scenario: DemoScenarioId = 'NORMAL_OPERATION'
): { nextState: SimulationInternalState; frame: BatteryTelemetry } {
  const cfg = SIMULATION_PROFILES[profile];
  const tick = prev.tick + 1;
  const phase = tick * 0.28;

  // Smooth deterministic + subtle stochastic current variation
  const jitterBoost = scenario === 'DATA_QUALITY_WARNING' ? 2.6 : 1.0;
  const wave =
    Math.sin(phase) * 0.55 +
    Math.sin(phase * 2.3 + 1.1) * 0.3 +
    Math.cos(phase * 0.45) * 0.15;
  const noise = ((Math.sin(tick * 12.9898) * 43758.5453) % 1) * jitterBoost;
  const targetCurrent = cfg.targetCurrentA + wave * cfg.currentRippleA + noise * 0.22;

  const currentA = isPaused
    ? prev.currentA
    : prev.currentA + (targetCurrent - prev.currentA) * 0.32;

  // Coulomb counting over dtSeconds (gently scaled for live lab demo visibility)
  const demoTimeScale = 3;
  const deltaAh = (currentA * dtSeconds * demoTimeScale) / 3600;
  let socPercent = isPaused
    ? prev.socPercent
    : prev.socPercent - (deltaAh / BATTERY_PACK_SPEC.nominalCapacityAh) * 100;

  // Keep demo SoC within healthy demonstration bounds
  if (socPercent < 14) socPercent = 14;
  if (socPercent > 98.5) socPercent = 98.5;

  // Thermal model with inertia (elevated smoothly during TEMPERATURE_WARNING scenario)
  const scenarioTempBoostC = scenario === 'TEMPERATURE_WARNING' ? 9.8 : 0;
  const i2rHeat = (currentA * currentA) * 0.0022;
  const targetTempC =
    cfg.thermalBiasC + scenarioTempBoostC + i2rHeat + Math.sin(phase * 0.18) * 0.35;
  const coreTempC = isPaused
    ? prev.coreTempC
    : prev.coreTempC + (targetTempC - prev.coreTempC) * (scenario === 'TEMPERATURE_WARNING' ? 0.28 : 0.12);

  // Build 8S series group voltages (amplified spread during VOLTAGE_VARIATION scenario)
  const baseCellOcv = lifepo4CellOcv(socPercent);
  const spreadMultiplier = scenario === 'VOLTAGE_VARIATION' ? 6.8 : 1.0;
  const rawVoltages = CELL_GROUP_OFFSETS_V.map((offset, idx) => {
    const r = CELL_GROUP_RESISTANCE_OHM[idx];
    const microDrift = Math.sin(phase * 0.6 + idx * 0.9) * 0.0025;
    const v = baseCellOcv + offset * spreadMultiplier + microDrift - currentA * r;
    return Number(Math.max(2.5, Math.min(3.65, v)).toFixed(3));
  });

  const meanCellV = rawVoltages.reduce((acc, v) => acc + v, 0) / rawVoltages.length;
  const maxCellV = Math.max(...rawVoltages);
  const minCellV = Math.min(...rawVoltages);
  const cellDeltaMv = Math.round((maxCellV - minCellV) * 1000);

  const cellVoltages: CellGroupReading[] = rawVoltages.map((v, idx) => {
    const deltaMv = Math.round((v - meanCellV) * 1000);
    return {
      groupIndex: idx + 1,
      label: `S${idx + 1}`,
      voltage: v,
      deltaFromMeanMv: deltaMv,
      balancing: false, // JK BMS not connected
    };
  });

  const packVoltage = Number(
    rawVoltages.reduce((acc, v) => acc + v, 0).toFixed(2)
  );
  const roundedCurrent = Number(currentA.toFixed(2));
  const power = Number((packVoltage * roundedCurrent).toFixed(1));

  // Build 4x DS18B20 probe readings
  const cellTemperatures: TempProbeReading[] = PROBE_META.map((p, idx) => {
    const ripple = Math.sin(phase * 0.35 + idx * 1.4) * 0.18;
    return {
      probeId: p.probeId,
      location: p.location,
      sensor: 'DS18B20',
      temperature: Number((coreTempC + p.biasC + ripple).toFixed(1)),
    };
  });

  const temps = cellTemperatures.map((t) => t.temperature);
  const meanTemp = Number(
    (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
  );
  const maxTemperature = Math.max(...temps);
  const minTemperature = Math.min(...temps);

  // MPU6050 3-axis accelerometer & gyroscope simulation
  const vibX = Number((Math.sin(phase * 3.1) * cfg.vibrationBaseG * 0.72).toFixed(3));
  const vibY = Number((Math.cos(phase * 2.7 + 0.8) * cfg.vibrationBaseG * 0.64).toFixed(3));
  const vibZ = Number((1.0 + Math.sin(phase * 4.3) * cfg.vibrationBaseG * 0.55).toFixed(3));
  const vibDynZ = vibZ - 1.0;
  const rms = Number(
    Math.sqrt((vibX * vibX + vibY * vibY + vibDynZ * vibDynZ) / 3).toFixed(3)
  );

  const accelerometer: AccelerometerVector = {
    xG: vibX,
    yG: vibY,
    zG: vibZ,
    xMs2: Number((vibX * GRAVITY_MS2).toFixed(2)),
    yMs2: Number((vibY * GRAVITY_MS2).toFixed(2)),
    zMs2: Number((vibZ * GRAVITY_MS2).toFixed(2)),
    dynamicRmsG: rms,
  };

  const gyroScale = cfg.vibrationBaseG * 16.5;
  const gx = Number((Math.sin(phase * 2.1 + 0.4) * gyroScale).toFixed(2));
  const gy = Number((Math.cos(phase * 1.9 + 1.2) * gyroScale * 0.82).toFixed(2));
  const gz = Number((Math.sin(phase * 1.4 + 2.3) * gyroScale * 0.65).toFixed(2));
  const gyroscope: GyroscopeVector = {
    xDps: gx,
    yDps: gy,
    zDps: gz,
    magnitudeDps: Number(Math.sqrt(gx * gx + gy * gy + gz * gz).toFixed(2)),
  };

  const subsystems = buildSubsystemStatuses();
  const isoTs = new Date(timestampMs).toISOString();
  const shortTime = formatTimeShort(timestampMs);
  const sensorStatuses = buildSensorChannelStatuses('DEMO', shortTime);

  const seriesGroups: SeriesGroup[] = cellVoltages.map((cv) => ({
    id: cv.label,
    groupIndex: cv.groupIndex,
    parallelCellCount: 4,
    nominalVoltageV: BATTERY_PACK_SPEC.cellNominalVoltageV,
    nominalCapacityAh: BATTERY_PACK_SPEC.nominalCapacityAh,
    cells: buildCellsForGroup(cv.groupIndex, 'DEMO'),
    measurement: {
      available: true,
      voltageV: cv.voltage,
      deltaFromMeanMv: cv.deltaFromMeanMv,
      status:
        cv.voltage > 3.55 ? 'ELEVATED' : cv.voltage < 2.85 ? 'LOW' : 'NOMINAL',
      dataSource: 'DEMO',
      timestamp: isoTs,
    },
  }));

  const temperatureSensors: TemperatureSensor[] = PROBE_META.map((p, idx) => {
    const reading = cellTemperatures[idx];
    const isDropped = scenario === 'SENSOR_DISCONNECTION' && p.id === 'TEMP-03';
    const extraHot = scenario === 'TEMPERATURE_WARNING' && p.id === 'TEMP-03' ? 2.4 : 0;
    const tempVal = isDropped ? null : Number((reading.temperature + extraHot).toFixed(1));
    return {
      id: p.id,
      probeCode: p.probeId,
      hardwareModel: 'DS18B20',
      zoneTitle: p.zoneTitle,
      zoneSubtitle: p.zoneSubtitle,
      illustrativePlacement: true,
      temperatureC: tempVal,
      status: isDropped ? 'UNAVAILABLE' : classifyThermalZone(tempVal),
      freshnessSeconds: isDropped || isPaused ? null : 0,
      timestamp: isDropped ? null : isoTs,
      dataSource: isDropped ? 'UNAVAILABLE' : 'DEMO',
    };
  });

  const isCommFail = scenario === 'COMMUNICATION_FAILURE';
  const adjustedSubsystems = subsystems.map((sub) => {
    if (isCommFail && (sub.id === 'esp32' || sub.id === 'edge-sbc')) {
      return {
        ...sub,
        status: 'FAULT' as const,
        detail: 'Simulated communication timeout (DEMO SCENARIO)',
      };
    }
    return sub;
  });

  const frame: BatteryTelemetry = {
    timestamp: isoTs,
    epochMs: timestampMs,
    source: 'DEMO',
    packVoltage,
    packCurrent: roundedCurrent,
    power,
    stateOfCharge: Number(socPercent.toFixed(1)),
    temperature: meanTemp,
    maxTemperature:
      scenario === 'TEMPERATURE_WARNING'
        ? Number((maxTemperature + 2.4).toFixed(1))
        : maxTemperature,
    minTemperature,
    vibration: { x: vibX, y: vibY, z: vibZ, rms },
    accelerometer,
    gyroscope,
    cellVoltages,
    cellTemperatures,
    seriesGroups,
    temperatureSensors,
    sensorStatuses: sensorStatuses.map((s) => {
      if (isCommFail && s.channel !== 'CH-06') {
        return { ...s, status: 'STALE', availabilityNote: 'Simulated Link Timeout (Demo)' };
      }
      if (scenario === 'SENSOR_DISCONNECTION' && s.channel === 'CH-04') {
        return { ...s, status: 'STALE', availabilityNote: 'TEMP-03 Disconnected (Demo)' };
      }
      return s;
    }),
    dataFreshness: isCommFail
      ? 'STALE'
      : isPaused
      ? 'PAUSED_DISPLAY'
      : 'LIVE',
    cellDeltaMv,
    soh: {
      status: 'MODEL_NOT_CONNECTED',
      value: null,
      unit: '%',
      confidence: null,
      sourceLabel: 'MODEL NOT CONNECTED',
      description:
        'Measures remaining usable pack capacity relative to the 24.0 Ah (614.4 Wh) LiFePO4 nominal baseline.',
    },
    rul: {
      status: 'MODEL_NOT_CONNECTED',
      value: null,
      unit: 'cycles',
      confidence: null,
      sourceLabel: 'MODEL NOT CONNECTED',
      description:
        'Projects remaining charge-discharge cycles before pack capacity degrades to the 80% end-of-life threshold.',
    },
    socEstimate: {
      status: 'DEMO_ESTIMATE',
      value: Number(socPercent.toFixed(1)),
      unit: '%',
      confidence: null,
      sourceLabel: 'DEMO ESTIMATE · SIMULATED',
      description:
        'Estimated remaining charge fraction derived from simulated Coulomb counting and LiFePO4 OCV lookup (ML fusion offline).',
    },
    systemStatus: {
      operatingMode: 'DEMO',
      simulationProfile: profile,
      demoScenario: scenario,
      monitoringState: isCommFail
        ? 'FAULT'
        : isPaused
        ? 'PAUSED'
        : 'ACTIVE_SIMULATION',
      subsystems: adjustedSubsystems,
      esp32Status: isCommFail ? 'FAULT' : 'SIMULATED',
      edgeComputerStatus: isCommFail ? 'FAULT' : 'SIMULATED',
      bmsStatus: 'NOT_CONNECTED',
    },
  };

  return {
    nextState: {
      tick,
      socPercent,
      currentA,
      coreTempC,
      profile,
    },
    frame,
  };
}

export function evaluateDiagnostics(telemetry: BatteryTelemetry): DiagnosticRuleCheck[] {
  const maxCell = Math.max(...telemetry.cellVoltages.map((c) => c.voltage));
  const minCell = Math.min(...telemetry.cellVoltages.map((c) => c.voltage));

  return [
    {
      id: 'ovp-pack',
      code: 'DIAG-V01',
      parameter: 'Pack Over-Voltage Ceiling',
      thresholdLabel: '≤ 29.20 V',
      currentValueLabel: `${telemetry.packVoltage.toFixed(2)} V`,
      state:
        telemetry.packVoltage > 29.2
          ? 'FAULT'
          : telemetry.packVoltage > 28.8
          ? 'WARN'
          : 'PASS',
      sensorSource: 'INA226 (DEMO)',
    },
    {
      id: 'uvp-pack',
      code: 'DIAG-V02',
      parameter: 'Pack Under-Voltage Floor',
      thresholdLabel: '≥ 20.00 V',
      currentValueLabel: `${telemetry.packVoltage.toFixed(2)} V`,
      state:
        telemetry.packVoltage < 20.0
          ? 'FAULT'
          : telemetry.packVoltage < 22.4
          ? 'WARN'
          : 'PASS',
      sensorSource: 'INA226 (DEMO)',
    },
    {
      id: 'ocp-discharge',
      code: 'DIAG-I01',
      parameter: 'Discharge Current Envelope',
      thresholdLabel: '≤ 40.0 A cont.',
      currentValueLabel: `${telemetry.packCurrent.toFixed(2)} A`,
      state:
        telemetry.packCurrent > 40.0
          ? 'FAULT'
          : telemetry.packCurrent > 32.0
          ? 'WARN'
          : 'PASS',
      sensorSource: 'ACS758-50B / ADS1115 (DEMO)',
    },
    {
      id: 'otp-thermal',
      code: 'DIAG-T01',
      parameter: 'Core Thermal Envelope',
      thresholdLabel: '0.0 °C – 55.0 °C',
      currentValueLabel: `${telemetry.maxTemperature.toFixed(1)} °C max`,
      state:
        telemetry.maxTemperature >= 52
          ? 'FAULT'
          : telemetry.maxTemperature >= 42
          ? 'WARN'
          : 'PASS',
      sensorSource: '4× DS18B20 Array (DEMO)',
    },
    {
      id: 'cell-imbalance',
      code: 'DIAG-C01',
      parameter: '8S Cell Group Voltage Spread (ΔV)',
      thresholdLabel: '< 45 mV nominal',
      currentValueLabel: `${telemetry.cellDeltaMv} mV (${minCell.toFixed(3)}–${maxCell.toFixed(3)} V)`,
      state:
        telemetry.cellDeltaMv >= 90
          ? 'FAULT'
          : telemetry.cellDeltaMv >= 45
          ? 'WARN'
          : 'PASS',
      sensorSource: '8S Tap Simulator (DEMO)',
    },
    {
      id: 'bms-link',
      code: 'DIAG-B01',
      parameter: 'JK Smart BMS Telemetry Link',
      thresholdLabel: 'Active RS485/BLE Frame',
      currentValueLabel: 'NOT CONNECTED',
      state: 'UNAVAILABLE',
      sensorSource: 'JK B1A8S10P (Pending)',
    },
    {
      id: 'ml-model',
      code: 'DIAG-M01',
      parameter: 'Edge ML Diagnostic Engine',
      thresholdLabel: 'Validated Model Loaded',
      currentValueLabel: 'MODEL NOT CONNECTED',
      state: 'UNAVAILABLE',
      sensorSource: 'Offline Edge Runtime',
    },
  ];
}

export function formatTimeShort(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toTimeString().slice(0, 8);
}
