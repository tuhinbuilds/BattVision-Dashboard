import { MeasurementSourceLabel } from './telemetry';

export type DiagnosticSeverity = 'NORMAL' | 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertLifecycleStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type DiagnosticEventCategory =
  | 'SYSTEM'
  | 'SENSOR'
  | 'TELEMETRY'
  | 'BMS'
  | 'COMMUNICATION'
  | 'DIAGNOSTICS'
  | 'ML';

export type SensorHealthStatus =
  | 'SIMULATED'
  | 'ONLINE'
  | 'NOT_CONNECTED'
  | 'STALE'
  | 'FAULT'
  | 'UNAVAILABLE';

export type CommunicationLinkState =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'NOT_CONFIGURED'
  | 'SIMULATED'
  | 'UNKNOWN';

export interface AlertAcknowledgement {
  acknowledgedAt: string;
  acknowledgedBy: string;
  note?: string;
}

export interface DiagnosticAlert {
  id: string;
  ruleId: string;
  timestamp: string;
  epochMs: number;
  timeLabel: string;
  title: string;
  severity: DiagnosticSeverity;
  sourceComponent: string;
  measurementName: string;
  observedValueLabel: string;
  configuredThresholdLabel: string;
  supportingMeasurement: string;
  description: string;
  diagnosticExplanation: string;
  recommendedInspection: string;
  dataSource: MeasurementSourceLabel;
  simulated: boolean;
  status: AlertLifecycleStatus;
  acknowledgement?: AlertAcknowledgement;
  resolvedAt?: string;
}

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  epochMs: number;
  timeLabel: string;
  category: DiagnosticEventCategory;
  severity: DiagnosticSeverity;
  source: string;
  title: string;
  description: string;
  supportingDetail: string;
  simulated: boolean;
  relatedAlertId?: string;
}

export interface SensorHealth {
  sensorId: string;
  sensorName: string;
  intendedMeasurement: string;
  interfaceType: string;
  status: SensorHealthStatus;
  lastValidMeasurement: string;
  freshnessLabel: string;
  errorCount: number | null;
  diagnosticState: DiagnosticSeverity;
  engineeringNote: string;
}

export interface CommunicationStatus {
  id: string;
  connectionName: string;
  interfaceLabel: string;
  status: CommunicationLinkState;
  lastReceived: string;
  freshnessLabel: string;
  errorCount: number | null;
  note: string;
}

export interface DiagnosticThresholdsConfig {
  packVoltageHighV: number;
  packVoltageLowV: number;
  cellDeltaWarnMv: number;
  tempWarnC: number;
  tempSpreadWarnC: number;
  currentHighA: number;
  powerHighW: number;
  freshnessLimitSec: number;
}

export interface DiagnosticRule {
  ruleId: string;
  ruleName: string;
  measurementSource: string;
  comparisonCondition: string;
  configuredThresholdLabel: string;
  severity: DiagnosticSeverity;
  explanation: string;
  requiredInputs: string;
}

export type RuleEvaluationOutcome = 'PASS' | 'TRIGGERED' | 'NOT_EVALUATED';

export interface DiagnosticEvaluation {
  rule: DiagnosticRule;
  outcome: RuleEvaluationOutcome;
  observedValueLabel: string;
  statusMessage: string;
  dataSource: MeasurementSourceLabel;
}

export interface SystemLogEntry {
  id: string;
  epochMs: number;
  timeLabel: string;
  category: DiagnosticEventCategory;
  severity: DiagnosticSeverity;
  message: string;
  simulated: boolean;
}
