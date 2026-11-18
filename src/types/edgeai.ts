import { MeasurementSourceLabel } from './telemetry';

export type EdgeBlockStatus =
  | 'SIMULATED'
  | 'CONNECTED'
  | 'NOT_CONNECTED'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN'
  | 'FAULT';

export type ArchitectureLayerId = 'sensing' | 'embedded' | 'edge' | 'application';

export interface ArchitectureBlock {
  id: string;
  layer: ArchitectureLayerId;
  name: string;
  shortTag: string;
  responsibility: string;
  inputs: string;
  outputs: string;
  interfaceLabel: string;
  status: EdgeBlockStatus;
  dataSource: MeasurementSourceLabel;
  integrationState: string;
}

export interface FirmwareModule {
  id: string;
  order: string;
  name: string;
  role: string;
  status: string;
}

export interface FirmwareMetadata {
  version: string;
  build: string;
  installedLabel: string;
  modules: FirmwareModule[];
}

export interface ControllerStatus {
  identity: string;
  architecture: string;
  firmware: FirmwareMetadata;
  operatingState: string;
  acquisitionStatus: string;
  sensorChannelCount: string;
  commStatus: EdgeBlockStatus;
  lastPacketTimestamp: string;
}

export interface SensorInterfaceStatus {
  sensor: string;
  interfaceType: string;
  signalPath: string;
  wiringStatus: EdgeBlockStatus;
  notes: string;
}

export interface EdgeResourcePoint {
  timeLabel: string;
  cpuPct: number;
  memPct: number;
  tempC: number;
}

export interface EdgeResourceMetrics {
  cpuPct: number | null;
  memPct: number | null;
  storagePct: number | null;
  cpuTempC: number | null;
  uptimeLabel: string;
  processHealth: string;
  networkStatus: string;
  localApiHealth: string;
  history: EdgeResourcePoint[];
  isIllustrative: boolean;
}

export interface EdgeNodeStatus {
  platform: 'LINUX SBC';
  model: 'PENDING SELECTION';
  runtime: 'PYTHON';
  execution: 'LOCAL';
  internetRequirement: 'NONE';
  resources: EdgeResourceMetrics;
}

export type PipelineStageState =
  | 'SIMULATED'
  | 'ACTIVE'
  | 'WAITING_FOR_CONNECTION'
  | 'NOT_IMPLEMENTED'
  | 'FAULT';

export interface TelemetryPipelineStage {
  id: string;
  order: string;
  name: string;
  status: PipelineStageState;
  inputRecords: number | null;
  outputRecords: number | null;
  lastProcessed: string;
  errorCount: number | null;
  latencyMs: number | null;
  description: string;
}

export interface MLRuntimeStatus {
  deployed: boolean;
  statusLabel: string;
  modelName: string;
  modelType: string;
  modelVersion: string;
  runtimeFramework: string;
  modelFileStatus: string;
  deploymentStatus: string;
  lastInferenceTimestamp: string;
  inferenceLatency: string;
  inputFeatureAvailability: string;
  outputAvailability: string;
}

export interface ModelLifecycleStage {
  index: number;
  name: string;
  summary: string;
  phase: 'WORKSTATION' | 'EDGE' | 'DATA';
  state: 'CURRENT' | 'PENDING';
}

export interface ModelLifecycleStatus {
  stages: ModelLifecycleStage[];
  currentStageIndex: number;
  retrainingPolicyNote: string;
}

export interface DatabaseStatus {
  engine: string;
  statusLabel: string;
  connected: boolean;
  sizeLabel: string;
  totalRecords: number | null;
  lastWrite: string;
  lastRead: string;
  storageLocation: string;
  backupStatus: string;
  schemas: { tableName: string; content: string; status: string }[];
}

export interface CommunicationLink {
  id: string;
  path: string;
  interfaceType: string;
  configState: string;
  connectionStatus: EdgeBlockStatus;
  lastPacket: string;
  errorCount: number | null;
  freshness: string;
  note: string;
}

export type EdgeSystemLogCategory =
  | 'FIRMWARE'
  | 'SENSOR'
  | 'TELEMETRY'
  | 'COMMUNICATION'
  | 'EDGE PROCESSING'
  | 'DATABASE'
  | 'ML INFERENCE'
  | 'SYSTEM';

export interface EdgeSystemLogEntry {
  id: string;
  epochMs: number;
  timeLabel: string;
  category: EdgeSystemLogCategory;
  severity: 'INFO' | 'NORMAL' | 'WARNING';
  message: string;
  simulated: boolean;
}
