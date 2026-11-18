import {
  ArchitectureBlock,
  CommunicationLink,
  ControllerStatus,
  DatabaseStatus,
  EdgeNodeStatus,
  EdgeResourcePoint,
  EdgeSystemLogEntry,
  MLRuntimeStatus,
  ModelLifecycleStatus,
  SensorInterfaceStatus,
  TelemetryPipelineStage,
} from '../types/edgeai';
import {
  BatteryTelemetry,
  DataSourceMode,
  TelemetryHistoryPoint,
} from '../types/telemetry';
import { formatTimeShort } from './simulationService';

export function buildArchitectureBlocks(mode: DataSourceMode): ArchitectureBlock[] {
  const isDemo = mode === 'DEMO';
  const simOrOff = isDemo ? 'SIMULATED' : 'NOT_CONNECTED';
  const src = isDemo ? 'DEMO' : 'UNAVAILABLE';

  return [
    // Layer 1 — Battery & Sensing
    {
      id: 'blk-pack',
      layer: 'sensing',
      name: '8S4P LiFePO4 Battery Pack',
      shortTag: 'BV-PACK-8S4P · 32×32700',
      responsibility: 'Primary EV energy storage pack (25.6 V nominal, 24 Ah, 614.4 Wh, 29.2 V full charge).',
      inputs: 'Charge / EV traction load current',
      outputs: 'Pack DC bus voltage, current, thermal & vibration signatures',
      interfaceLabel: 'HV/LV DC Bus + Sensor Taps',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Pack topology locked (8S4P LiFePO4); physical telemetry bridge pending.',
    },
    {
      id: 'blk-bms',
      layer: 'sensing',
      name: 'JK Smart BMS (B1A8S10P)',
      shortTag: 'INDEPENDENT PROTECTION',
      responsibility: 'Independent hardware battery protection (OVP/UVP/OCP/balancing) and optional 8S cell-group telemetry.',
      inputs: '8S balance taps, pack current shunt, temperature probes',
      outputs: 'Independent MOSFET safety cutoff & optional serial/BLE status',
      interfaceLabel: 'Configurable (Protocol Verification Pending)',
      status: 'NOT_CONFIGURED',
      dataSource: 'UNAVAILABLE',
      integrationState: 'Model B1A8S10P subject to hardware & protocol verification. Independent from ESP32.',
    },
    {
      id: 'blk-electrical-sensors',
      layer: 'sensing',
      name: 'Electrical Sensors (INA226 · ACS758-50B · ADS1115)',
      shortTag: 'I2C + ANALOG → ADC',
      responsibility: 'INA226 bus voltage/shunt power monitor; ACS758-50B (±50 A nominal) Hall-effect current digitized via 16-bit ADS1115.',
      inputs: 'Pack bus voltage tap, bidirectional pack current conductor',
      outputs: 'I2C digital registers & conditioned 16-bit ADC counts',
      interfaceLabel: 'I2C (INA226, ADS1115) · Conditioned Analog (ACS758-50B)',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Planned sensor suite; shunt sizing & physical wiring verification pending.',
    },
    {
      id: 'blk-env-sensors',
      layer: 'sensing',
      name: 'Thermal & Motion Sensors (4× DS18B20 · MPU6050)',
      shortTag: '1-WIRE + I2C IMU',
      responsibility: '4 waterproof DS18B20 zone probes (TEMP-01..04) and MPU6050 6-DOF accelerometer/gyroscope.',
      inputs: 'Enclosure thermal zones & mechanical acceleration/rotation',
      outputs: '1-Wire temperature frames & I2C 6-DOF motion vectors',
      interfaceLabel: '1-Wire Bus (DS18B20) · I2C (MPU6050)',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Probe physical mounting positions and I2C bus wiring pending final assembly.',
    },

    // Layer 2 — Embedded Acquisition
    {
      id: 'blk-esp32',
      layer: 'embedded',
      name: 'PCBCupid Glyph ESP32-S3',
      shortTag: 'EMBEDDED MCU NODE',
      responsibility: 'Deterministic multi-sensor polling, signal conditioning, calibration, validation, timestamping, and packet framing.',
      inputs: 'I2C, 1-Wire, ADC sensor channels & optional BMS feed',
      outputs: 'Structured telemetry packets to Linux Edge SBC',
      interfaceLabel: 'Configurable Host Transport (Pending Selection)',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Target controller selected; production firmware & GPIO map pending hardware bench test.',
    },
    {
      id: 'blk-conditioning',
      layer: 'embedded',
      name: 'Conditioning, Calibration & Packet Framing',
      shortTag: 'FIRMWARE PIPELINE',
      responsibility: 'Converts raw ADC/I2C counts into calibrated engineering units, validates bounds, timestamps packets, and tracks bus errors.',
      inputs: 'Raw driver registers & ADC counts',
      outputs: 'Checksummed JSON/binary telemetry frames',
      interfaceLabel: 'Internal MCU Firmware Pipeline',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Conceptual firmware architecture defined; firmware deployment pending.',
    },

    // Layer 3 — Edge Computing
    {
      id: 'blk-sbc',
      layer: 'edge',
      name: 'Linux Single-Board Computer',
      shortTag: 'MODEL PENDING SELECTION',
      responsibility: 'Offline local compute host running Python telemetry ingestion, validation, storage, ML inference, and local web API.',
      inputs: 'Telemetry packets from ESP32-S3',
      outputs: 'Persisted records, diagnostic evaluations, and local dashboard API',
      interfaceLabel: 'Local OS IPC / Loopback / LAN',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Linux SBC hardware selection pending (no final board locked yet).',
    },
    {
      id: 'blk-python-proc',
      layer: 'edge',
      name: 'Python Processing & Feature Pipeline',
      shortTag: 'LOCAL PYTHON RUNTIME',
      responsibility: 'Ingests packets, verifies schema/timestamps, computes derived power & coulomb integrals, and formats model feature vectors.',
      inputs: 'Raw ESP32-S3 telemetry packets',
      outputs: 'Validated records & prepared inference feature vectors',
      interfaceLabel: 'Python Local Service',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Planned offline Python daemon; browser simulation engine currently substitutes in DEMO.',
    },
    {
      id: 'blk-sqlite',
      layer: 'edge',
      name: 'Local SQLite Data Storage',
      shortTag: 'OFFLINE DATABASE',
      responsibility: 'Stores time-series telemetry, experiment sessions, capacity tests, diagnostic events, model metadata, and prediction logs locally.',
      inputs: 'Validated telemetry & diagnostic records',
      outputs: 'Historical queries, CSV exports & training datasets',
      interfaceLabel: 'Local SQLite File Store',
      status: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
      dataSource: src,
      integrationState: 'In-memory browser ring buffer active in DEMO; persistent SQLite backend pending.',
    },
    {
      id: 'blk-ml-runtime',
      layer: 'edge',
      name: 'Offline ML Inference Runtime',
      shortTag: 'MODEL NOT DEPLOYED',
      responsibility: 'Executes approved offline SoH & RUL models locally on the Linux SBC without cloud connectivity.',
      inputs: 'Prepared feature vectors & historical cycle summaries',
      outputs: 'Validated SoH & RUL predictions (once model is trained & approved)',
      interfaceLabel: 'Python Local Inference IPC',
      status: 'NOT_CONNECTED',
      dataSource: 'UNAVAILABLE',
      integrationState: 'Model not yet trained or deployed; runtime framework pending selection.',
    },
    {
      id: 'blk-local-api',
      layer: 'edge',
      name: 'Local API & Web Service',
      shortTag: 'OFFLINE HTTP / WS',
      responsibility: 'Serves the BattVision dashboard and streams live telemetry, diagnostics, and historical records over local network/loopback.',
      inputs: 'Python pipeline, SQLite store & ML inference outputs',
      outputs: 'Structured JSON / WebSocket payloads to offline dashboard',
      interfaceLabel: 'Local HTTP / WebSocket (Zero Cloud)',
      status: simOrOff,
      dataSource: src,
      integrationState: 'Frontend dataService contract ready for direct swap from DEMO to local API.',
    },

    // Layer 4 — Application
    {
      id: 'blk-dashboard',
      layer: 'application',
      name: 'Offline Web Dashboard',
      shortTag: 'REACT + TS WORKSTATION',
      responsibility: 'Provides Overview, 8S4P Pack Explorer, Live Telemetry, Battery Intelligence, Diagnostics & Alerts, Data Lab, and Edge AI views.',
      inputs: 'Local API stream (or local simulation in DEMO mode)',
      outputs: 'Real-time instrumentation visualisations & CSV/JSON exports',
      interfaceLabel: 'Local Browser UI (No Internet Required)',
      status: isDemo ? 'SIMULATED' : 'CONNECTED',
      dataSource: isDemo ? 'DEMO' : 'HARDWARE',
      integrationState: 'Frontend application active locally; awaiting live backend hardware link.',
    },
    {
      id: 'blk-analytics-ui',
      layer: 'application',
      name: 'Estimation, Prognostics & Alert Views',
      shortTag: 'SOC · SOH · RUL · DIAG',
      responsibility: 'Presents transparent SoC estimation, capacity-based SoH/RUL prognostics, and rule-based monitoring diagnostics.',
      inputs: 'Shared telemetry snapshot & local diagnostic rule evaluations',
      outputs: 'Operator diagnostics, inspection drawers & exportable lab reports',
      interfaceLabel: 'Frontend State Architecture',
      status: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
      dataSource: src,
      integrationState: 'UI modules operational; prognostic predictions await deployed Edge-AI model.',
    },
  ];
}

export function buildControllerStatus(
  telemetry: BatteryTelemetry,
  mode: DataSourceMode
): ControllerStatus {
  const isDemo = mode === 'DEMO';
  return {
    identity: 'PCBCupid Glyph ESP32-S3',
    architecture: 'Dual-Core Xtensa LX7 (Target MCU)',
    firmware: {
      version: 'N/A (Not Installed)',
      build: isDemo ? 'SIMULATED STUB' : 'NOT DETECTED',
      installedLabel: 'FIRMWARE NOT CONFIRMED ON HARDWARE',
      modules: [
        { id: 'fw-1', order: '01', name: 'Sensor Drivers', role: 'I2C / 1-Wire / ADC low-level polling', status: isDemo ? 'SIMULATED' : 'PENDING' },
        { id: 'fw-2', order: '02', name: 'Measurement Acquisition', role: 'Synchronized multi-channel sampling', status: isDemo ? 'SIMULATED' : 'PENDING' },
        { id: 'fw-3', order: '03', name: 'Signal Conversion', role: 'Raw register counts → physical units', status: isDemo ? 'SIMULATED' : 'PENDING' },
        { id: 'fw-4', order: '04', name: 'Calibration', role: 'Zero-offset & shunt gain scaling', status: 'PENDING' },
        { id: 'fw-5', order: '05', name: 'Data Validation', role: 'CRC / range sanity / timestamp check', status: isDemo ? 'SIMULATED' : 'PENDING' },
        { id: 'fw-6', order: '06', name: 'Packet Generation', role: 'Structured telemetry frame assembly', status: isDemo ? 'SIMULATED' : 'PENDING' },
        { id: 'fw-7', order: '07', name: 'Comm Interface', role: 'Host transport to Linux Edge SBC', status: 'NOT CONFIGURED' },
        { id: 'fw-8', order: '08', name: 'Error Handling', role: 'Bus timeout & sensor fault flagging', status: isDemo ? 'SIMULATED' : 'PENDING' },
      ],
    },
    operatingState: isDemo ? 'SIMULATED (DEMO)' : 'NOT CONNECTED',
    acquisitionStatus: isDemo ? 'SIMULATED STREAM (1.0 Hz)' : 'OFFLINE',
    sensorChannelCount: '8 Planned Channels (INA226 · ACS758 · ADS1115 · 4×DS18B20 · MPU6050)',
    commStatus: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
    lastPacketTimestamp: isDemo ? formatTimeShort(telemetry.epochMs) : 'N/A',
  };
}

export function buildSensorInterfaces(mode: DataSourceMode): SensorInterfaceStatus[] {
  const status = mode === 'DEMO' ? 'SIMULATED' : 'NOT_CONNECTED';
  return [
    {
      sensor: 'INA226',
      interfaceType: 'I2C',
      signalPath: 'I2C bus (final address & shunt verification pending)',
      wiringStatus: status,
      notes: 'No GPIO pins or bus addresses assumed finalized yet.',
    },
    {
      sensor: 'ADS1115',
      interfaceType: 'I2C',
      signalPath: 'I2C 16-bit external ADC interface',
      wiringStatus: status,
      notes: 'Digitizes conditioned analog sensor channels.',
    },
    {
      sensor: 'MPU6050',
      interfaceType: 'I2C',
      signalPath: 'I2C 6-DOF accelerometer & gyroscope interface',
      wiringStatus: status,
      notes: 'Bus pull-ups and mounting orientation pending bench test.',
    },
    {
      sensor: 'DS18B20 × 4',
      interfaceType: '1-Wire',
      signalPath: 'Shared 1-Wire bus with external pull-up (TEMP-01..04)',
      wiringStatus: status,
      notes: 'Each waterproof probe carries a unique 64-bit ROM address.',
    },
    {
      sensor: 'ACS758-50B',
      interfaceType: 'Conditioned Analog → ADC',
      signalPath: 'Voltage-conditioned Hall output (±50 A nominal) into ADS1115',
      wiringStatus: status,
      notes: 'Analog scaling & zero-current calibration pending verification.',
    },
  ];
}

export function buildEdgeNodeStatus(
  history: TelemetryHistoryPoint[],
  sessionStartMs: number,
  mode: DataSourceMode
): EdgeNodeStatus {
  const isDemo = mode === 'DEMO';

  if (!isDemo) {
    return {
      platform: 'LINUX SBC',
      model: 'PENDING SELECTION',
      runtime: 'PYTHON',
      execution: 'LOCAL',
      internetRequirement: 'NONE',
      resources: {
        cpuPct: null,
        memPct: null,
        storagePct: null,
        cpuTempC: null,
        uptimeLabel: 'N/A',
        processHealth: 'NOT CONNECTED',
        networkStatus: 'LOCAL OFFLINE',
        localApiHealth: 'NOT CONNECTED',
        history: [],
        isIllustrative: false,
      },
    };
  }

  // Deterministic illustrative OS telemetry derived cleanly from shared history timestamps (no independent RNG!)
  const resourceHistory: EdgeResourcePoint[] = history.slice(-90).map((pt, idx) => {
    const loadFactor = Math.min(1, Math.abs(pt.power) / 900);
    const cpuPct = Number((16.5 + loadFactor * 9.5 + Math.sin(idx * 0.45) * 3.2).toFixed(1));
    const memPct = Number((34.2 + (idx / 90) * 1.4 + Math.cos(idx * 0.25) * 0.8).toFixed(1));
    const tempC = Number((43.5 + loadFactor * 4.2 + Math.sin(idx * 0.2) * 0.9).toFixed(1));
    return { timeLabel: pt.timeLabel, cpuPct, memPct, tempC };
  });

  const latest = resourceHistory[resourceHistory.length - 1];
  const uptimeSec = Math.max(1, Math.floor((Date.now() - sessionStartMs) / 1000));
  const mins = Math.floor(uptimeSec / 60);
  const secs = uptimeSec % 60;

  return {
    platform: 'LINUX SBC',
    model: 'PENDING SELECTION',
    runtime: 'PYTHON',
    execution: 'LOCAL',
    internetRequirement: 'NONE',
    resources: {
      cpuPct: latest?.cpuPct ?? 18.4,
      memPct: latest?.memPct ?? 34.8,
      storagePct: null, // Never fabricate OS disk usage
      cpuTempC: latest?.tempC ?? 44.2,
      uptimeLabel: `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s (DEMO)`,
      processHealth: 'SIMULATED RUNTIME',
      networkStatus: 'LOCAL LOOPBACK (NO CLOUD)',
      localApiHealth: 'SIMULATED (IN-BROWSER)',
      history: resourceHistory,
      isIllustrative: true,
    },
  };
}

export function buildTelemetryPipelineStages(
  telemetry: BatteryTelemetry,
  sampleCount: number,
  mode: DataSourceMode
): TelemetryPipelineStage[] {
  const isDemo = mode === 'DEMO';
  const ts = isDemo ? formatTimeShort(telemetry.epochMs) : 'N/A';

  return [
    {
      id: 'pipe-1',
      order: '01',
      name: 'Sensor Acquisition',
      status: isDemo ? 'SIMULATED' : 'WAITING_FOR_CONNECTION',
      inputRecords: isDemo ? sampleCount : null,
      outputRecords: isDemo ? sampleCount : null,
      lastProcessed: ts,
      errorCount: isDemo ? 0 : null,
      latencyMs: isDemo ? 4.2 : null,
      description: 'Reads INA226, ACS758-50B/ADS1115, 4×DS18B20, and MPU6050 on ESP32-S3.',
    },
    {
      id: 'pipe-2',
      order: '02',
      name: 'ESP32 Data Packet',
      status: isDemo ? 'SIMULATED' : 'WAITING_FOR_CONNECTION',
      inputRecords: isDemo ? sampleCount : null,
      outputRecords: isDemo ? sampleCount : null,
      lastProcessed: ts,
      errorCount: isDemo ? 0 : null,
      latencyMs: isDemo ? 1.8 : null,
      description: 'Packages calibrated readings with monotonic timestamp into structured frame.',
    },
    {
      id: 'pipe-3',
      order: '03',
      name: 'Communication',
      status: isDemo ? 'SIMULATED' : 'WAITING_FOR_CONNECTION',
      inputRecords: isDemo ? sampleCount : null,
      outputRecords: isDemo ? sampleCount : null,
      lastProcessed: ts,
      errorCount: isDemo ? 0 : null,
      latencyMs: isDemo ? 3.5 : null,
      description: 'Transfers packet from ESP32-S3 to Linux SBC over configurable local transport.',
    },
    {
      id: 'pipe-4',
      order: '04',
      name: 'Edge Ingestion',
      status: isDemo ? 'SIMULATED' : 'WAITING_FOR_CONNECTION',
      inputRecords: isDemo ? sampleCount : null,
      outputRecords: isDemo ? sampleCount : null,
      lastProcessed: ts,
      errorCount: isDemo ? 0 : null,
      latencyMs: isDemo ? 2.1 : null,
      description: 'Python edge daemon parses incoming packet and assigns system receive timestamp.',
    },
    {
      id: 'pipe-5',
      order: '05',
      name: 'Validation',
      status: isDemo ? 'SIMULATED' : 'WAITING_FOR_CONNECTION',
      inputRecords: isDemo ? sampleCount : null,
      outputRecords: isDemo ? sampleCount : null,
      lastProcessed: ts,
      errorCount: isDemo ? 0 : null,
      latencyMs: isDemo ? 1.2 : null,
      description: 'Verifies schema integrity, range bounds, missing channels, and freshness.',
    },
    {
      id: 'pipe-6',
      order: '06',
      name: 'Feature Processing',
      status: isDemo ? 'SIMULATED' : 'WAITING_FOR_CONNECTION',
      inputRecords: isDemo ? sampleCount : null,
      outputRecords: isDemo ? sampleCount : null,
      lastProcessed: ts,
      errorCount: isDemo ? 0 : null,
      latencyMs: isDemo ? 2.6 : null,
      description: 'Computes derived power (V × I), thermal deltas, RMS vibration, and Coulomb SoC.',
    },
    {
      id: 'pipe-7',
      order: '07',
      name: 'Storage',
      status: isDemo ? 'SIMULATED' : 'NOT_IMPLEMENTED',
      inputRecords: isDemo ? sampleCount : null,
      outputRecords: isDemo ? Math.min(900, sampleCount) : null,
      lastProcessed: ts,
      errorCount: isDemo ? 0 : null,
      latencyMs: isDemo ? 0.8 : null,
      description: 'Writes bounded frames to local session buffer (SQLite edge DB pending).',
    },
    {
      id: 'pipe-8',
      order: '08',
      name: 'ML Inference',
      status: 'NOT_IMPLEMENTED',
      inputRecords: null,
      outputRecords: null,
      lastProcessed: 'N/A',
      errorCount: null,
      latencyMs: null,
      description: 'Model not deployed yet — offline SoH/RUL inference pending trained artifact.',
    },
    {
      id: 'pipe-9',
      order: '09',
      name: 'Dashboard Update',
      status: isDemo ? 'SIMULATED' : 'ACTIVE',
      inputRecords: isDemo ? sampleCount : 0,
      outputRecords: isDemo ? sampleCount : 0,
      lastProcessed: ts,
      errorCount: 0,
      latencyMs: isDemo ? 1.4 : null,
      description: 'Renders synchronized telemetry, diagnostics, and offline prognostics in UI.',
    },
  ];
}

export function buildMLRuntimeStatus(mode: DataSourceMode): MLRuntimeStatus {
  return {
    deployed: false,
    statusLabel: 'MODEL NOT DEPLOYED',
    modelName: 'N/A',
    modelType: 'N/A (Candidate TBD after ageing data)',
    modelVersion: 'N/A',
    runtimeFramework: 'Pending Selection (Lightweight Python / Edge Runtime)',
    modelFileStatus: 'NO MODEL ARTIFACT LOADED',
    deploymentStatus: 'NOT DEPLOYED',
    lastInferenceTimestamp: 'N/A',
    inferenceLatency: 'N/A',
    inputFeatureAvailability:
      mode === 'DEMO'
        ? 'Live Telemetry Simulated · Ageing Labels Unavailable'
        : 'Hardware Sensors Offline · Ageing Labels Unavailable',
    outputAvailability: 'SoC: Coulomb Sim (Non-ML) · SoH / RUL: Unavailable',
  };
}

export function buildModelLifecycleStatus(): ModelLifecycleStatus {
  return {
    currentStageIndex: 0,
    retrainingPolicyNote:
      'Data collection and local inference can run continuously on the edge node, while model retraining is strictly a separate periodic workstation workflow. BattVision does not continuously retrain inside the vehicle.',
    stages: [
      { index: 0, name: 'DATA COLLECTION', summary: 'Capture validated bench & pack telemetry', phase: 'DATA', state: 'CURRENT' },
      { index: 1, name: 'DATA LABELING', summary: 'Obtain measured capacity & ageing labels', phase: 'DATA', state: 'PENDING' },
      { index: 2, name: 'DATA PREPARATION', summary: 'Clean, align & build leakage-safe splits', phase: 'WORKSTATION', state: 'PENDING' },
      { index: 3, name: 'MODEL TRAINING', summary: 'Train candidate models offline on workstation', phase: 'WORKSTATION', state: 'PENDING' },
      { index: 4, name: 'MODEL EVALUATION', summary: 'Validate MAE, RMSE & R² on held-out cycles', phase: 'WORKSTATION', state: 'PENDING' },
      { index: 5, name: 'MODEL APPROVAL', summary: 'Compare candidate vs. baseline & approve', phase: 'WORKSTATION', state: 'PENDING' },
      { index: 6, name: 'EDGE DEPLOYMENT', summary: 'Package & deploy approved artifact to SBC', phase: 'EDGE', state: 'PENDING' },
      { index: 7, name: 'INFERENCE', summary: 'Run deterministic offline inference locally', phase: 'EDGE', state: 'PENDING' },
    ],
  };
}

export function buildDatabaseStatus(
  telemetry: BatteryTelemetry,
  sampleCount: number,
  mode: DataSourceMode
): DatabaseStatus {
  const isDemo = mode === 'DEMO';
  const ts = isDemo ? formatTimeShort(telemetry.epochMs) : 'N/A';

  return {
    engine: 'SQLite (Planned Local Edge Database)',
    statusLabel: isDemo ? 'SIMULATED (IN-MEMORY)' : 'NOT CONNECTED',
    connected: false,
    sizeLabel: 'N/A (No SQLite File Mounted)',
    totalRecords: isDemo ? Math.min(900, sampleCount) : null,
    lastWrite: ts,
    lastRead: ts,
    storageLocation: 'Pending Linux SBC Local Filesystem',
    backupStatus: 'Not Implemented (Manual CSV Export Available)',
    schemas: [
      { tableName: 'telemetry_records', content: 'Timestamped V, I, P, 4×Temp, 6-DOF IMU', status: isDemo ? 'DEMO RING' : 'OFFLINE' },
      { tableName: 'experiment_sessions', content: 'Lab test metadata, conditions & notes', status: isDemo ? 'LOCAL SESSION' : 'OFFLINE' },
      { tableName: 'capacity_tests', content: 'Controlled discharge Ah & reference capacity', status: isDemo ? 'DEMO EXAMPLE' : 'OFFLINE' },
      { tableName: 'diagnostic_events', content: 'Rule evaluations, alerts & operator acks', status: isDemo ? 'LOCAL SESSION' : 'OFFLINE' },
      { tableName: 'model_metadata', content: 'Approved model versions & validation hashes', status: 'EMPTY' },
      { tableName: 'prediction_history', content: 'Logged offline SoH / RUL inference outputs', status: 'EMPTY' },
    ],
  };
}

export function buildEdgeCommunicationLinks(
  telemetry: BatteryTelemetry,
  mode: DataSourceMode
): CommunicationLink[] {
  const isDemo = mode === 'DEMO';
  const ts = isDemo ? formatTimeShort(telemetry.epochMs) : 'N/A';
  const simOrOff = isDemo ? 'SIMULATED' : 'NOT_CONNECTED';

  return [
    {
      id: 'lnk-ina226',
      path: 'ESP32-S3 ↔ INA226',
      interfaceType: 'I2C',
      configState: 'Planned (Shunt & Bus Pending)',
      connectionStatus: simOrOff,
      lastPacket: ts,
      errorCount: isDemo ? 0 : null,
      freshness: isDemo ? '1.0 Hz DEMO' : 'OFFLINE',
      note: 'Voltage/shunt power sensor over I2C.',
    },
    {
      id: 'lnk-ads1115',
      path: 'ESP32-S3 ↔ ADS1115 (ACS758-50B)',
      interfaceType: 'I2C + Conditioned Analog',
      configState: 'Planned (ADC Scaling Pending)',
      connectionStatus: simOrOff,
      lastPacket: ts,
      errorCount: isDemo ? 0 : null,
      freshness: isDemo ? '1.0 Hz DEMO' : 'OFFLINE',
      note: 'Conditioned ACS758-50B (±50 A nominal) into 16-bit ADC.',
    },
    {
      id: 'lnk-mpu6050',
      path: 'ESP32-S3 ↔ MPU6050',
      interfaceType: 'I2C',
      configState: 'Planned (Mounting Pending)',
      connectionStatus: simOrOff,
      lastPacket: ts,
      errorCount: isDemo ? 0 : null,
      freshness: isDemo ? '1.0 Hz DEMO' : 'OFFLINE',
      note: '6-DOF motion & vibration sensor.',
    },
    {
      id: 'lnk-ds18b20',
      path: 'ESP32-S3 ↔ 4× DS18B20 Probes',
      interfaceType: '1-Wire',
      configState: 'Planned (Placement Pending)',
      connectionStatus: simOrOff,
      lastPacket: ts,
      errorCount: isDemo ? 0 : null,
      freshness: isDemo ? '1.0 Hz DEMO' : 'OFFLINE',
      note: 'Four independent waterproof thermal probes (TEMP-01..04).',
    },
    {
      id: 'lnk-sbc',
      path: 'ESP32-S3 ↔ Linux SBC',
      interfaceType: 'Configurable Local Transport',
      configState: 'Transport Pending Selection',
      connectionStatus: simOrOff,
      lastPacket: ts,
      errorCount: isDemo ? 0 : null,
      freshness: isDemo ? '1.0 Hz DEMO' : 'OFFLINE',
      note: 'Serial/USB/local link configurable once SBC hardware is finalized.',
    },
    {
      id: 'lnk-bms',
      path: 'ESP32-S3 ↔ JK Smart BMS (B1A8S10P)',
      interfaceType: 'Unverified (Protocol Pending)',
      configState: 'NOT CONFIGURED',
      connectionStatus: 'NOT_CONFIGURED',
      lastPacket: 'N/A',
      errorCount: null,
      freshness: 'UNAVAILABLE',
      note: 'Electrical interface & protocol must be confirmed from actual BMS documentation.',
    },
    {
      id: 'lnk-ui',
      path: 'Linux SBC ↔ Local Dashboard',
      interfaceType: 'Local HTTP / WebSocket',
      configState: isDemo ? 'Browser Sim Loopback' : 'Awaiting Backend API',
      connectionStatus: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
      lastPacket: ts,
      errorCount: isDemo ? 0 : null,
      freshness: isDemo ? 'LIVE DEMO' : 'OFFLINE',
      note: 'Offline web interface with zero internet dependency.',
    },
  ];
}

export function seedEdgeSystemLogs(): EdgeSystemLogEntry[] {
  const now = Date.now();
  return [
    {
      id: 'elog-1',
      epochMs: now - 5500,
      timeLabel: formatTimeShort(now - 5500),
      category: 'SYSTEM',
      severity: 'INFO',
      message: 'EDGE INTERFACE INITIALISED (BATTVISION-EDGE-01 · OFFLINE ARCHITECTURE)',
      simulated: true,
    },
    {
      id: 'elog-2',
      epochMs: now - 4400,
      timeLabel: formatTimeShort(now - 4400),
      category: 'FIRMWARE',
      severity: 'INFO',
      message: 'PCBCUPID GLYPH ESP32-S3 CONTROLLER STATUS SIMULATED (NO HARDWARE CONNECTED)',
      simulated: true,
    },
    {
      id: 'elog-3',
      epochMs: now - 3500,
      timeLabel: formatTimeShort(now - 3500),
      category: 'SENSOR',
      severity: 'INFO',
      message: 'SENSOR INTERFACES REGISTERED: I2C (INA226/ADS1115/MPU6050) · 1-WIRE (4×DS18B20)',
      simulated: true,
    },
    {
      id: 'elog-4',
      epochMs: now - 2700,
      timeLabel: formatTimeShort(now - 2700),
      category: 'TELEMETRY',
      severity: 'NORMAL',
      message: 'DEMO PACKET STREAM GENERATED AT 1.0 Hz',
      simulated: true,
    },
    {
      id: 'elog-5',
      epochMs: now - 1900,
      timeLabel: formatTimeShort(now - 1900),
      category: 'EDGE PROCESSING',
      severity: 'NORMAL',
      message: 'FEATURE PIPELINE SIMULATED (POWER = V × I · COULOMB SOC ESTIMATE)',
      simulated: true,
    },
    {
      id: 'elog-6',
      epochMs: now - 1200,
      timeLabel: formatTimeShort(now - 1200),
      category: 'DATABASE',
      severity: 'INFO',
      message: 'SQLITE STORAGE NOT MOUNTED — USING BOUNDED IN-MEMORY SESSION BUFFER',
      simulated: true,
    },
    {
      id: 'elog-7',
      epochMs: now - 700,
      timeLabel: formatTimeShort(now - 700),
      category: 'COMMUNICATION',
      severity: 'WARNING',
      message: 'JK SMART BMS B1A8S10P PROTOCOL UNVERIFIED — LINK NOT CONFIGURED',
      simulated: true,
    },
    {
      id: 'elog-8',
      epochMs: now - 300,
      timeLabel: formatTimeShort(now - 300),
      category: 'ML INFERENCE',
      severity: 'WARNING',
      message: 'MODEL NOT DEPLOYED — OFFLINE INFERENCE ENGINE STANDING BY',
      simulated: true,
    },
  ];
}
