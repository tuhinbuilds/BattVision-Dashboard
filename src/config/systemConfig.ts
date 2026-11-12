import {
  BatteryPackSpecifications,
  DemoScenarioId,
  NavSectionId,
  SimulationProfile,
} from '../types/telemetry';

export const SYSTEM_IDENTITY = {
  productName: 'BATTVISION',
  subtitle: 'BATTERY INTELLIGENCE SYSTEM',
  labLabel: 'ENERGY SYSTEMS LAB',
  divisionLabel: 'EDGE DIAGNOSTICS',
  revision: 'SYSTEM REVISION 01',
  softwareVersion: 'v0.1.0-alpha',
  buildChannel: 'OFFLINE-LAB',
} as const;

/**
 * Authoritative BattVision hardware specification.
 * 8S4P LiFePO4 architecture (32 x 32700 cells).
 */
export const BATTERY_PACK_SPEC = {
  packId: 'BV-PACK-8S4P',
  chemistry: 'LiFePO4',
  chemistryFull: 'Lithium Iron Phosphate',
  configuration: '8S4P',
  seriesCount: 8,
  parallelCount: 4,
  cellCount: 32,
  cellFormat: '32700 Cylindrical',
  cellNominalVoltageV: 3.2,
  cellFullVoltageV: 3.65,
  cellCutoffVoltageV: 2.5,
  cellCapacityAh: 6.0,
  nominalVoltageV: 25.6,
  fullChargeVoltageV: 29.2,
  cutoffVoltageV: 20.0,
  nominalCapacityAh: 24.0,
  nominalEnergyWh: 614.4,
  maxContinuousDischargeA: 40.0,
  maxChargeCurrentA: 12.0,
  operatingTempRangeC: { min: 0, max: 55, nominal: 28 },
} as const;

export const BATTERY_PACK_SPECIFICATIONS: BatteryPackSpecifications = {
  packId: 'BV-PACK-8S4P',
  chemistry: 'LiFePO4',
  chemistryCode: 'LFP',
  cellFormat: '32700',
  cellCount: 32,
  topology: '8S4P',
  cellNominalVoltageV: 3.2,
  cellCapacityAh: 6.0,
  parallelCellsPerGroup: 4,
  seriesGroups: 8,
  packNominalVoltageV: 25.6,
  packCapacityAh: 24.0,
  packEnergyWh: 614.4,
  nominalFullChargeVoltageV: 29.2,
};

/**
 * Explicitly configured UI display bands for thermal zone colouring.
 * Note: These are illustrative visualization bands, not validated hardware safety cutoffs.
 */
export const THERMAL_DISPLAY_BANDS = {
  coolMaxC: 24.0,
  normalMaxC: 36.0,
  warmMaxC: 45.0,
  disclaimer:
    'Illustrative UI display bands only — physical DS18B20 placement and validated thermal limits pending lab calibration.',
} as const;

export const HARDWARE_STACK = {
  controller: 'PCBCupid Glyph ESP32-S3',
  bms: 'JK Smart BMS (B1A8S10P — verification pending)',
  edgeComputer: 'Linux Single-Board Computer (Selection Pending)',
  sensors: [
    { id: 'INA226', role: 'Pack Bus Voltage & Power Monitor', bus: 'I2C (0x40)' },
    { id: 'ACS758-50B', role: 'Bidirectional Hall-Effect Current (±50 A)', bus: 'Analog → ADS1115' },
    { id: 'ADS1115', role: '16-Bit Precision ADC Interface', bus: 'I2C (0x48)' },
    { id: '4× DS18B20', role: 'Pack Core & Busbar Thermal Probes (T1–T4)', bus: '1-Wire Bus' },
    { id: 'MPU6050', role: '3-Axis Accelerometer / Vibration IMU', bus: 'I2C (0x68)' },
  ],
  softwareStack: [
    'Python Data Acquisition & Signal Pipeline',
    'Offline Edge ML Inference Runtime (SoH / RUL)',
    'Local Time-Series Database (SQLite / Edge Store)',
    'Offline Web Instrumentation Dashboard (React + TS)',
  ],
} as const;

export const SIMULATION_PROFILES: Record<
  SimulationProfile,
  {
    label: string;
    shortLabel: string;
    description: string;
    targetCurrentA: number;
    currentRippleA: number;
    vibrationBaseG: number;
    thermalBiasC: number;
  }
> = {
  NOMINAL_DRIVE: {
    label: 'Nominal Drive Cycle',
    shortLabel: 'NOMINAL',
    description: 'Steady EV cruise load (~11–14 A discharge, ~320 W nominal draw)',
    targetCurrentA: 12.4,
    currentRippleA: 1.8,
    vibrationBaseG: 0.14,
    thermalBiasC: 31.4,
  },
  IDLE_STANDBY: {
    label: 'Bench Idle / Standby',
    shortLabel: 'IDLE',
    description: 'Low quiescent auxiliary draw (~0.8 A) for OCV & thermal settle',
    targetCurrentA: 0.8,
    currentRippleA: 0.18,
    vibrationBaseG: 0.02,
    thermalBiasC: 25.2,
  },
  HIGH_LOAD: {
    label: 'High Acceleration Load',
    shortLabel: 'HIGH LOAD',
    description: 'Elevated transient discharge (~28–33 A, ~760 W) with voltage sag',
    targetCurrentA: 29.8,
    currentRippleA: 3.4,
    vibrationBaseG: 0.34,
    thermalBiasC: 37.8,
  },
  REGEN_CHARGE: {
    label: 'CC Charge / Regen Input',
    shortLabel: 'CHARGE',
    description: 'Controlled charging current (-8.5 A inflow) toward 29.2 V ceiling',
    targetCurrentA: -8.5,
    currentRippleA: 0.6,
    vibrationBaseG: 0.04,
    thermalBiasC: 28.6,
  },
};

export interface NavItemConfig {
  id: NavSectionId;
  label: string;
  shortCode: string;
  subtitle: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortCode: '01',
    subtitle: 'Primary battery system status & instruments',
  },
  {
    id: 'battery-pack',
    label: 'Battery Pack',
    shortCode: '02',
    subtitle: 'BV-PACK-8S4P cell topology & thermal array',
  },
  {
    id: 'live-telemetry',
    label: 'Live Telemetry',
    shortCode: '03',
    subtitle: 'Multi-channel time-series waveforms',
  },
  {
    id: 'intelligence',
    label: 'Battery Intelligence',
    shortCode: '04',
    subtitle: 'SoH, RUL, and SoC diagnostic estimators',
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics & Alerts',
    shortCode: '05',
    subtitle: 'Protection thresholds & simulated event bus',
  },
  {
    id: 'data-lab',
    label: 'Data Laboratory',
    shortCode: '06',
    subtitle: 'Session telemetry capture & CSV/JSON export',
  },
  {
    id: 'edge-ai',
    label: 'Edge AI',
    shortCode: '07',
    subtitle: 'Offline inference runtime & feature vector',
  },
  {
    id: 'system-config',
    label: 'System Configuration',
    shortCode: '08',
    subtitle: 'Data source mode, simulation & hardware spec',
  },
];

export const DEMO_SCENARIOS: Record<
  DemoScenarioId,
  {
    id: DemoScenarioId;
    label: string;
    shortLabel: string;
    severityTag: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    description: string;
  }
> = {
  NORMAL_OPERATION: {
    id: 'NORMAL_OPERATION',
    label: 'Normal Operation',
    shortLabel: 'NORMAL',
    severityTag: 'NOMINAL',
    description: 'Balanced 8S4P LiFePO4 operation with nominal thermal and bus readings.',
  },
  TEMPERATURE_WARNING: {
    id: 'TEMPERATURE_WARNING',
    label: 'Temperature Warning',
    shortLabel: 'TEMP WARN',
    severityTag: 'WARNING',
    description: 'Simulates elevated core temperature on TEMP-03 (~42.5 °C) above UI warning marker.',
  },
  SENSOR_DISCONNECTION: {
    id: 'SENSOR_DISCONNECTION',
    label: 'Sensor Disconnection',
    shortLabel: 'SENSOR DROP',
    severityTag: 'WARNING',
    description: 'Simulates TEMP-03 1-Wire probe going stale while TEMP-01/02/04 stay active.',
  },
  COMMUNICATION_FAILURE: {
    id: 'COMMUNICATION_FAILURE',
    label: 'Communication Failure',
    shortLabel: 'COMM FAULT',
    severityTag: 'CRITICAL',
    description: 'Simulates ESP32-S3 ↔ Edge SBC telemetry link timeout and packet loss.',
  },
  VOLTAGE_VARIATION: {
    id: 'VOLTAGE_VARIATION',
    label: 'Voltage Variation',
    shortLabel: 'CELL ΔV',
    severityTag: 'WARNING',
    description: 'Simulates elevated 8S series-group voltage spread (~78 mV ΔV) under load.',
  },
  DATA_QUALITY_WARNING: {
    id: 'DATA_QUALITY_WARNING',
    label: 'Data Quality Warning',
    shortLabel: 'DATA QUAL',
    severityTag: 'WARNING',
    description: 'Simulates irregular sample freshness and noisy ADC jitter for quality checks.',
  },
};

export const TELEMETRY_LIMITS = {
  voltage: { min: 20.0, warnLow: 22.4, nominal: 25.6, max: 29.2 },
  current: { min: -15.0, nominal: 0, warnHigh: 32.0, max: 45.0 },
  power: { min: -400, nominal: 350, warnHigh: 850, max: 1150 },
  temperature: { min: 10, nominal: 28, warnHigh: 42, faultHigh: 52, max: 60 },
  soc: { min: 0, warnLow: 20, nominal: 75, max: 100 },
  cellVoltage: { min: 2.5, warnLow: 2.85, nominal: 3.2, warnHigh: 3.55, max: 3.65 },
  cellDeltaMv: { warn: 45, fault: 90 },
} as const;
