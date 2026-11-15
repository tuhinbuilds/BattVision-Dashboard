import { DataSourceMode, MeasurementSourceLabel } from './telemetry';

export interface StateOfChargeEstimate {
  available: boolean;
  valuePct: number | null;
  remainingCapacityAh: number | null;
  remainingEnergyWh: number | null;
  trend: 'RISING' | 'FALLING' | 'STEADY' | 'UNAVAILABLE';
  method: string;
  lastUpdated: string | null;
  dataSource: MeasurementSourceLabel;
  isIllustrative: boolean;
}

export interface StateOfHealthEstimate {
  modelAvailable: boolean;
  validatedValuePct: number | null;
  illustrativeDemoValuePct: number | null;
  referenceCapacityAh: number;
  estimatedUsableCapacityAh: number | null;
  degradationTrendLabel: string;
  assessmentStatus: string;
  dataSource: MeasurementSourceLabel;
  isIllustrative: boolean;
}

export interface PredictionUncertainty {
  available: boolean;
  calibrated: boolean;
  lowerCycles: number | null;
  upperCycles: number | null;
  explanation: string;
}

export interface RemainingUsefulLifeEstimate {
  modelAvailable: boolean;
  sufficientAgeingData: boolean;
  eolThresholdPct: number;
  eolCapacityAh: number;
  estimatedRemainingCycles: number | null;
  estimatedRemainingMonths: number | null;
  projectedCrossingCycle: number | null;
  uncertainty: PredictionUncertainty;
  modelStatusLabel: string;
  dataSource: MeasurementSourceLabel;
  isIllustrative: boolean;
}

export interface CapacityTestRecord {
  cycle: number;
  measuredCapacityAh: number;
  referenceCapacityAh: number;
  sohPct: number;
  isIllustrative: boolean;
}

export interface DegradationRecord {
  cycle: number;
  observedCapacityAh: number | null;
  observedSohPct: number | null;
  predictedCapacityAh: number | null;
  predictedSohPct: number | null;
  intervalLowerAh: number | null;
  intervalUpperAh: number | null;
  intervalBandAh: [number, number] | null;
  referenceCapacityAh: number;
}

export interface ModelMetadata {
  deployed: boolean;
  statusLabel: string;
  modelName: string;
  modelVersion: string;
  modelType: string;
  trainingDataset: string;
  trainingDate: string;
  validationStatus: string;
  lastInferenceTime: string;
  inferenceLatency: string;
  runtimeEnvironment: string;
  inputFeatureAvailability: string;
  currentLifecycleStageIndex: number; // 0..5
}

export interface ModelEvaluationMetrics {
  available: boolean;
  mae: string;
  rmse: string;
  r2: string;
  evaluationDataset: string;
  splitStrategy: string;
  evaluatedRecords: string;
  validationDate: string;
}

export type FeatureEpistemicCategory =
  | 'DIRECT_SENSOR'
  | 'CALCULATED'
  | 'MODEL_ESTIMATE'
  | 'UNAVAILABLE';

export interface IntelligenceInputFeature {
  id: string;
  name: string;
  category: FeatureEpistemicCategory;
  currentValueLabel: string;
  sourceDetail: string;
  availableInCurrentMode: boolean;
}

export type DiagnosticFindingSeverity = 'INFO' | 'ATTENTION' | 'WARNING';

export interface DiagnosticFinding {
  id: string;
  title: string;
  supportingMeasurement: string;
  timestamp: string;
  severity: DiagnosticFindingSeverity;
  dataSource: MeasurementSourceLabel;
  simulated: boolean;
  explanation: string;
}

export interface BatteryConditionSummary {
  overallAssessment: string;
  assessmentBasis: string;
  dataQuality: string;
  estimationAvailability: string;
  modelAvailability: string;
  sensorCompleteness: string;
  lastValidCapacityTest: string;
  validatedAgeingRecords: number;
}

export interface PredictionReliabilityReport {
  dataQuality: {
    inputCompletenessLabel: string;
    missingMeasurements: string[];
    staleMeasurements: string[];
  };
  modelValidation: {
    modelAvailabilityLabel: string;
    trainingDataCoverageLabel: string;
  };
  predictionUncertainty: {
    calibratedAvailable: boolean;
    intervalSummary: string;
    note: string;
  };
}

export interface BatteryHealthEstimate {
  mode: DataSourceMode;
  generatedAt: string;
  soc: StateOfChargeEstimate;
  soh: StateOfHealthEstimate;
  rul: RemainingUsefulLifeEstimate;
  conditionSummary: BatteryConditionSummary;
  capacityRecords: CapacityTestRecord[];
  degradationTrajectory: DegradationRecord[];
  modelMetadata: ModelMetadata;
  evaluationMetrics: ModelEvaluationMetrics;
  inputFeatures: IntelligenceInputFeature[];
  reliability: PredictionReliabilityReport;
  findings: DiagnosticFinding[];
}
