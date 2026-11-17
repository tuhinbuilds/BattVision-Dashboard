import { MeasurementSourceLabel } from './telemetry';

export type LabSectionTab =
  | 'historical'
  | 'experiments'
  | 'charge-discharge'
  | 'capacity'
  | 'datasets'
  | 'quality'
  | 'exports';

export interface TelemetryRecord {
  epochMs: number;
  timestamp: string;
  timeLabel: string;
  packVoltage: number | null;
  packCurrent: number | null;
  power: number | null;
  stateOfCharge: number | null;
  temperature1: number | null;
  temperature2: number | null;
  temperature3: number | null;
  temperature4: number | null;
  accelerationX: number | null;
  accelerationY: number | null;
  accelerationZ: number | null;
  gyroscopeX: number | null;
  gyroscopeY: number | null;
  gyroscopeZ: number | null;
  cycleNumber?: number | null;
  dischargeCapacityAh?: number | null;
  source: MeasurementSourceLabel;
}

export type ExperimentCategory =
  | 'Initial characterisation'
  | 'Voltage monitoring'
  | 'Current monitoring'
  | 'Thermal monitoring'
  | 'Charge test'
  | 'Discharge test'
  | 'Capacity test'
  | 'Vibration monitoring'
  | 'General observation';

export type ExperimentStatus = 'ACTIVE' | 'CLOSED' | 'DRAFT';

export interface ExperimentSession {
  id: string;
  title: string;
  packId: string;
  startTimestamp: string;
  endTimestamp: string | null;
  category: ExperimentCategory;
  description: string;
  testConditions: string;
  dataSource: MeasurementSourceLabel;
  sampleCount: number;
  status: ExperimentStatus;
  notes: string[];
  simulated: boolean;
}

export interface LabCapacityTestRecord {
  testId: string;
  packId: string;
  testDate: string;
  initialConditions: string;
  testTemperatureC: number | null;
  startingSocPct: number | null;
  endingCondition: string;
  dischargeCurrentProfile: string;
  testDurationMin: number;
  measuredCapacityAh: number;
  measuredEnergyWh: number | null;
  referenceCapacityAh: number;
  procedureNotes: string;
  dataSource: MeasurementSourceLabel;
  validationStatus: 'ILLUSTRATIVE_DEMO' | 'VALIDATED' | 'UNVALIDATED';
  dataQualityLabel: string;
  simulated: boolean;
}

export type DatasetCategory =
  | 'BattVision experimental records'
  | 'Public battery ageing datasets'
  | 'Imported CSV records'
  | 'Illustrative demo datasets';

export interface DatasetFeature {
  name: string;
  canonicalField: string;
  unit: string;
  dataType: 'number' | 'timestamp' | 'string';
  available: boolean;
}

export interface DatasetMetadata {
  id: string;
  name: string;
  category: DatasetCategory;
  source: string;
  chemistry: string;
  cellFormat: string;
  recordCount: number;
  features: DatasetFeature[];
  targetLabels: string[];
  samplingInterval: string;
  format: string;
  validationStatus: 'ILLUSTRATIVE_DEMO' | 'IMPORTED_UNVALIDATED' | 'VALIDATED' | 'NOT_DOWNLOADED';
  notes: string;
  simulated: boolean;
  records?: TelemetryRecord[];
}

export type DataValidationStatus = 'VALID' | 'WARNING' | 'INVALID' | 'NOT_EVALUATED';

export interface DataValidationIssue {
  id: string;
  field: string;
  issueType: string;
  count: number;
  status: DataValidationStatus;
  detail: string;
}

export interface ColumnQualityMetric {
  columnName: string;
  dataType: string;
  availableCount: number;
  missingCount: number;
  completenessPct: number;
  outOfRangeCount: number;
  status: DataValidationStatus;
}

export interface DataQualityReport {
  datasetName: string;
  totalRecords: number;
  missingValuesTotal: number;
  duplicateTimestamps: number;
  invalidTimestamps: number;
  outOfRangeTotal: number;
  missingChannels: string[];
  samplingIrregularities: number;
  overallCompletenessPct: number;
  columns: ColumnQualityMetric[];
  issues: DataValidationIssue[];
}

export type CanonicalCsvField =
  | 'timestamp'
  | 'pack_voltage'
  | 'pack_current'
  | 'power'
  | 'temperature_1'
  | 'temperature_2'
  | 'temperature_3'
  | 'temperature_4'
  | 'acceleration_x'
  | 'acceleration_y'
  | 'acceleration_z'
  | 'gyroscope_x'
  | 'gyroscope_y'
  | 'gyroscope_z'
  | 'state_of_charge'
  | 'cycle_number'
  | 'discharge_capacity'
  | '__unmapped__';

export type CSVColumnMapping = Record<string, CanonicalCsvField>;

export interface DataImportResult {
  ok: boolean;
  error?: string;
  filename: string;
  fileSizeBytes: number;
  totalRows: number;
  headers: string[];
  detectedTypes: Record<string, 'timestamp' | 'number' | 'string'>;
  previewRows: Record<string, string>[];
  rawRows: Record<string, string>[];
  suggestedMapping: CSVColumnMapping;
  warnings: string[];
  missingCount: number;
  duplicateTimestamps: number;
  invalidTimestamps: number;
}

export type MLSplitStrategy =
  | 'CYCLE_GROUPED'
  | 'BATTERY_CELL_GROUPED'
  | 'CHRONOLOGICAL_HOLDOUT';

export interface MLPreparationConfig {
  selectedDatasetId: string;
  selectedFeatures: string[];
  selectedTarget: 'SoC' | 'SoH' | 'RUL' | null;
  splitStrategy: MLSplitStrategy;
}
