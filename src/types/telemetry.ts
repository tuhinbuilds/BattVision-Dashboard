export type DataSourceMode = 'DEMO' | 'HARDWARE';

export type SimulationProfile = 'NOMINAL_DRIVE' | 'IDLE_STANDBY' | 'HIGH_LOAD' | 'REGEN_CHARGE';

export type DemoScenarioId =
  | 'NORMAL_OPERATION'
  | 'TEMPERATURE_WARNING'
  | 'SENSOR_DISCONNECTION'
  | 'COMMUNICATION_FAILURE'
  | 'VOLTAGE_VARIATION'
  | 'DATA_QUALITY_WARNING';

export type MeasurementSourceLabel = 'DEMO' | 'HARDWARE' | 'UNAVAILABLE';

export type ThermalZoneStatus = 'COOL' | 'NORMAL' | 'WARM' | 'CRITICAL' | 'UNAVAILABLE';

export interface BatteryPackSpecifications {
  packId: string;
  chemistry: string;
  chemistryCode: string;
  cellFormat: string;
  cellCount: number;
  topology: string;
  cellNominalVoltageV: number;
  cellCapacityAh: number;
  parallelCellsPerGroup: number;
  seriesGroups: number;
  packNominalVoltageV: number;
  packCapacityAh: number;
  packEnergyWh: number;
  nominalFullChargeVoltageV: number;
}

export interface CellMeasurement {
  available: boolean;
  voltageV: number | null;
  dataSource: MeasurementSourceLabel;
  note: string;
}

export interface BatteryCell {
  id: string; // "S1-C1" .. "S8-C4"
  seriesGroupId: string; // "S1" .. "S8"
  groupIndex: number; // 1..8
  parallelIndex: number; // 1..4
  format: string; // "32700"
  nominalVoltageV: number; // 3.2
  nominalCapacityAh: number; // 6.0
  measurement: CellMeasurement;
}

export interface GroupMeasurement {
  available: boolean;
  voltageV: number | null;
  deltaFromMeanMv: number | null;
  status: 'NOMINAL' | 'ELEVATED' | 'LOW' | 'UNAVAILABLE';
  dataSource: MeasurementSourceLabel;
  timestamp: string | null;
}

export interface SeriesGroup {
  id: string; // "S1" .. "S8"
  groupIndex: number; // 1..8
  parallelCellCount: number; // 4
  nominalVoltageV: number; // 3.2
  nominalCapacityAh: number; // 24.0
  cells: BatteryCell[]; // 4 parallel cells
  measurement: GroupMeasurement;
}

export interface TemperatureSensor {
  id: string; // "TEMP-01" .. "TEMP-04"
  probeCode: string; // "T1" .. "T4"
  hardwareModel: string; // "DS18B20"
  zoneTitle: string;
  zoneSubtitle: string;
  illustrativePlacement: true;
  temperatureC: number | null;
  status: ThermalZoneStatus;
  freshnessSeconds: number | null;
  timestamp: string | null;
  dataSource: MeasurementSourceLabel;
}

export type SubsystemStatusKind =
  | 'CONNECTED'
  | 'SIMULATED'
  | 'DEMO'
  | 'NOT_CONNECTED'
  | 'WARNING'
  | 'FAULT';

export type NavSectionId =
  | 'overview'
  | 'battery-pack'
  | 'live-telemetry'
  | 'intelligence'
  | 'diagnostics'
  | 'data-lab'
  | 'edge-ai'
  | 'system-config';

export interface VibrationVector {
  x: number; // g
  y: number; // g
  z: number; // g
  rms: number; // dynamic g RMS = sqrt((x^2 + y^2 + (z-1)^2)/3)
}

export interface AccelerometerVector {
  xG: number;
  yG: number;
  zG: number;
  xMs2: number;
  yMs2: number;
  zMs2: number;
  dynamicRmsG: number;
}

export interface GyroscopeVector {
  xDps: number; // deg/s
  yDps: number; // deg/s
  zDps: number; // deg/s
  magnitudeDps: number; // deg/s
}

export type SensorChannelState =
  | 'ONLINE'
  | 'SIMULATED'
  | 'NOT_CONNECTED'
  | 'STALE'
  | 'FAULT';

export interface SensorChannelStatus {
  channel: string; // e.g. "CH-01"
  sensor: string; // e.g. "INA226"
  measurement: string;
  interfaceType: string;
  status: SensorChannelState;
  lastUpdate: string | null;
  dataSource: MeasurementSourceLabel;
  availabilityNote: string;
  engineeringNote: string;
}

export type TelemetryTimeWindowSec = 30 | 60 | 300 | 900;

export type DataFreshnessState = 'LIVE' | 'PAUSED_DISPLAY' | 'STALE' | 'OFFLINE';

export interface CellGroupReading {
  groupIndex: number; // 1..8 (8S groups, each 4P parallel)
  label: string; // e.g. "S1"
  voltage: number; // Volts (LiFePO4 2.50V - 3.65V)
  deltaFromMeanMv: number; // mV
  balancing: boolean;
}

export interface TempProbeReading {
  probeId: string; // e.g. "T1"
  location: string; // e.g. "Bank S1–S2 Core"
  sensor: string; // "DS18B20"
  temperature: number; // °C
}

export interface IntelligenceMetric {
  status: 'MODEL_NOT_CONNECTED' | 'DEMO_ESTIMATE' | 'LIVE_INFERENCE';
  value: number | null;
  unit: string;
  confidence: number | null;
  sourceLabel: string;
  description: string;
}

export interface SystemSubsystemStatus {
  id: string;
  name: string;
  hardwareSpec: string;
  status: SubsystemStatusKind;
  detail: string;
  interfaceBus: string;
}

export interface SystemStatusSnapshot {
  operatingMode: DataSourceMode;
  simulationProfile: SimulationProfile;
  demoScenario: DemoScenarioId;
  monitoringState: 'ACTIVE_SIMULATION' | 'PAUSED' | 'STANDBY' | 'FAULT';
  subsystems: SystemSubsystemStatus[];
  esp32Status: SubsystemStatusKind;
  edgeComputerStatus: SubsystemStatusKind;
  bmsStatus: SubsystemStatusKind;
}

/**
 * Primary telemetry frame contract.
 * Designed so the UI consumes one consistent structure whether sourced from
 * the local simulation engine (DEMO) or a future local Edge API / WebSocket (LIVE).
 */
export interface BatteryTelemetry {
  timestamp: string; // ISO-8601
  epochMs: number;
  source: DataSourceMode;
  packVoltage: number; // V (nominal 25.6V, full 29.2V)
  packCurrent: number; // A (positive = discharge, negative = charge/regen)
  power: number; // W (V * I)
  stateOfCharge: number; // % (0 - 100)
  temperature: number; // °C (mean of 4x DS18B20 probes)
  maxTemperature: number; // °C
  minTemperature: number; // °C
  vibration: VibrationVector; // MPU6050 IMU (compat)
  accelerometer: AccelerometerVector; // MPU6050 3-axis accelerometer
  gyroscope: GyroscopeVector; // MPU6050 3-axis gyroscope (°/s)
  cellVoltages: CellGroupReading[]; // 8 series groups (each 4P)
  cellTemperatures: TempProbeReading[]; // 4x DS18B20 probes
  seriesGroups: SeriesGroup[]; // Structured 8S4P model (8 groups x 4 cells = 32 cells)
  temperatureSensors: TemperatureSensor[]; // Structured TEMP-01..TEMP-04 sensors
  sensorStatuses: SensorChannelStatus[]; // Planned hardware sensor channel table
  dataFreshness: DataFreshnessState;
  cellDeltaMv: number; // max - min group voltage in mV
  soh: IntelligenceMetric;
  rul: IntelligenceMetric;
  socEstimate: IntelligenceMetric;
  systemStatus: SystemStatusSnapshot;
}

export interface TelemetryHistoryPoint {
  epochMs: number;
  timeLabel: string;
  packVoltage: number;
  packCurrent: number;
  power: number;
  temperature: number;
  stateOfCharge: number;
  vibrationRms: number;
  cellDeltaMv: number;
  temp1: number;
  temp2: number;
  temp3: number;
  temp4: number;
  accXG: number;
  accYG: number;
  accZG: number;
  gyroXDps: number;
  gyroYDps: number;
  gyroZDps: number;
}

export type EventSeverity = 'INFO' | 'NOMINAL' | 'WARNING' | 'ALERT';

export interface SystemEvent {
  id: string;
  timestamp: string;
  timeLabel: string;
  code: string;
  subsystem: string;
  message: string;
  severity: EventSeverity;
  simulated: boolean;
}

export interface DiagnosticRuleCheck {
  id: string;
  code: string;
  parameter: string;
  thresholdLabel: string;
  currentValueLabel: string;
  state: 'PASS' | 'WARN' | 'FAULT' | 'UNAVAILABLE';
  sensorSource: string;
}
