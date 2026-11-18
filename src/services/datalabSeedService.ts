import { BATTERY_PACK_SPEC } from '../config/systemConfig';
import {
  DatasetMetadata,
  ExperimentSession,
  LabCapacityTestRecord,
} from '../types/datalab';

/**
 * Illustrative DEMO records only.
 * Explicitly withheld in HARDWARE mode so real hardware sessions are never confused with demo data.
 */
export function buildDemoExperimentSessions(liveSampleCount: number): ExperimentSession[] {
  const now = Date.now();
  return [
    {
      id: 'EXP-DEMO-001',
      title: '8S4P Bench Telemetry Stream Characterisation (Demo)',
      packId: BATTERY_PACK_SPEC.packId,
      startTimestamp: new Date(now - 3600_000).toISOString(),
      endTimestamp: null,
      category: 'Initial characterisation',
      description:
        'Illustrative demonstration session validating multi-channel voltage, current, thermal, and IMU acquisition layouts.',
      testConditions: 'Simulated nominal drive cycle (~12 A discharge, ~31 °C core)',
      dataSource: 'DEMO',
      sampleCount: liveSampleCount,
      status: 'ACTIVE',
      notes: [
        'DEMO RECORD: No physical battery pack connected yet.',
        'Used to validate BV-PACK-8S4P dashboard data pipeline and CSV schema.',
      ],
      simulated: true,
    },
    {
      id: 'EXP-DEMO-002',
      title: 'Thermal Gradient Bench Profile - 4× DS18B20 (Demo)',
      packId: BATTERY_PACK_SPEC.packId,
      startTimestamp: new Date(now - 86400_000 * 2).toISOString(),
      endTimestamp: new Date(now - 86400_000 * 2 + 2700_000).toISOString(),
      category: 'Thermal monitoring',
      description:
        'Illustrative thermal zone logging session comparing inner-core zones (TEMP-02/03) against terminal zones (TEMP-01/04).',
      testConditions: 'Simulated elevated load (~28 A step), ambient ~25 °C',
      dataSource: 'DEMO',
      sampleCount: 1800,
      status: 'CLOSED',
      notes: [
        'DEMO RECORD: Illustrative probe placement only; physical mounting pending.',
      ],
      simulated: true,
    },
    {
      id: 'EXP-DEMO-003',
      title: 'Reference Discharge Capacity Baseline Protocol (Demo)',
      packId: BATTERY_PACK_SPEC.packId,
      startTimestamp: new Date(now - 86400_000 * 5).toISOString(),
      endTimestamp: new Date(now - 86400_000 * 5 + 10800_000).toISOString(),
      category: 'Capacity test',
      description:
        'Illustrative 0.3C constant-current discharge test template demonstrating Ah integration and capacity-based SoH computation.',
      testConditions: '29.2 V full charge → 20.0 V cutoff at 7.2 A CC (illustrative)',
      dataSource: 'DEMO',
      sampleCount: 3600,
      status: 'CLOSED',
      notes: [
        'DEMO RECORD: Not a physical lab discharge measurement.',
      ],
      simulated: true,
    },
  ];
}

export function buildDemoCapacityTests(): LabCapacityTestRecord[] {
  return [
    {
      testId: 'CAP-DEMO-01',
      packId: BATTERY_PACK_SPEC.packId,
      testDate: '2026-10-14',
      initialConditions: 'Charged to 29.2 V (3.65 V/group), 30 min OCV rest (Illustrative)',
      testTemperatureC: 27.4,
      startingSocPct: 100,
      endingCondition: 'Pack cutoff 20.0 V / 2.50 V min group',
      dischargeCurrentProfile: '0.3C Constant Current (~7.2 A)',
      testDurationMin: 194,
      measuredCapacityAh: 23.42,
      measuredEnergyWh: 598.1,
      referenceCapacityAh: BATTERY_PACK_SPEC.nominalCapacityAh,
      procedureNotes:
        'ILLUSTRATIVE DEMO TEST ONLY - demonstrates baseline usable-capacity capture vs. 24.0 Ah nominal spec.',
      dataSource: 'DEMO',
      validationStatus: 'ILLUSTRATIVE_DEMO',
      dataQualityLabel: 'Demo Complete (0% missing)',
      simulated: true,
    },
    {
      testId: 'CAP-DEMO-02',
      packId: BATTERY_PACK_SPEC.packId,
      testDate: '2026-11-08',
      initialConditions: 'Charged to 29.2 V, 30 min OCV rest after illustrative cycling',
      testTemperatureC: 29.1,
      startingSocPct: 100,
      endingCondition: 'Pack cutoff 20.0 V / 2.50 V min group',
      dischargeCurrentProfile: '0.5C Constant Current (~12.0 A)',
      testDurationMin: 113,
      measuredCapacityAh: 22.61,
      measuredEnergyWh: 574.3,
      referenceCapacityAh: BATTERY_PACK_SPEC.nominalCapacityAh,
      procedureNotes:
        'ILLUSTRATIVE DEMO TEST ONLY - shows how measured usable capacity feeds capacity-based SoH calculation.',
      dataSource: 'DEMO',
      validationStatus: 'ILLUSTRATIVE_DEMO',
      dataQualityLabel: 'Demo Complete (0% missing)',
      simulated: true,
    },
  ];
}

export function buildDemoDatasetRegistry(liveSampleCount: number): DatasetMetadata[] {
  return [
    {
      id: 'DS-DEMO-LIVE',
      name: 'BattVision Live Simulation Buffer (8S4P Demo)',
      category: 'Illustrative demo datasets',
      source: 'In-Browser Simulation Engine (DEMO)',
      chemistry: 'LiFePO4',
      cellFormat: '32700 (8S4P · 32 cells)',
      recordCount: liveSampleCount,
      features: [
        { name: 'Pack Voltage', canonicalField: 'pack_voltage', unit: 'V', dataType: 'number', available: true },
        { name: 'Pack Current', canonicalField: 'pack_current', unit: 'A', dataType: 'number', available: true },
        { name: 'Electrical Power', canonicalField: 'power', unit: 'W', dataType: 'number', available: true },
        { name: '4× DS18B20 Temp', canonicalField: 'temperature_1..4', unit: '°C', dataType: 'number', available: true },
        { name: 'MPU6050 6-DOF IMU', canonicalField: 'acceleration/gyroscope', unit: 'g, °/s', dataType: 'number', available: true },
      ],
      targetLabels: ['state_of_charge (Demo Est Only)'],
      samplingInterval: '1.0 s (1.0 Hz)',
      format: 'In-Memory Ring Buffer / CSV',
      validationStatus: 'ILLUSTRATIVE_DEMO',
      notes:
        'Synthetic telemetry for dashboard demonstration. Does NOT contain experimental ageing labels for SoH/RUL training.',
      simulated: true,
    },
    {
      id: 'DS-EXP-PENDING',
      name: 'BattVision Experimental Lab Archive (Local SQLite Target)',
      category: 'BattVision experimental records',
      source: 'Pending Linux SBC + ESP32-S3 Acquisition',
      chemistry: 'LiFePO4',
      cellFormat: '32700 (8S4P)',
      recordCount: 0,
      features: [],
      targetLabels: [],
      samplingInterval: 'TBD (Configurable)',
      format: 'SQLite / CSV',
      validationStatus: 'NOT_DOWNLOADED',
      notes:
        'Reserved slot for verified physical bench experiments once ESP32-S3, sensors, and JK BMS are wired.',
      simulated: false,
    },
    {
      id: 'DS-PUB-PLACEHOLDER',
      name: 'External Public Battery Ageing Datasets (Not Imported)',
      category: 'Public battery ageing datasets',
      source: 'None Imported Yet (e.g., NASA / CALCE / MIT-Stanford)',
      chemistry: 'LFP / NMC (External)',
      cellFormat: 'Varies by Dataset',
      recordCount: 0,
      features: [],
      targetLabels: [],
      samplingInterval: 'N/A',
      format: 'CSV Import Ready',
      validationStatus: 'NOT_DOWNLOADED',
      notes:
        'No external public ageing dataset has been downloaded or imported. Use the CSV Importer below to ingest real CSV files.',
      simulated: false,
    },
  ];
}
