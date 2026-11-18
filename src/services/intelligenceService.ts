import { BATTERY_PACK_SPEC } from '../config/systemConfig';
import {
  BatteryHealthEstimate,
  CapacityTestRecord,
  DegradationRecord,
  DiagnosticFinding,
  IntelligenceInputFeature,
  ModelEvaluationMetrics,
  ModelMetadata,
} from '../types/intelligence';
import {
  BatteryTelemetry,
  DataSourceMode,
  SensorChannelStatus,
  TelemetryHistoryPoint,
} from '../types/telemetry';
import { formatTimeShort } from './simulationService';

const REF_CAPACITY_AH = BATTERY_PACK_SPEC.nominalCapacityAh; // 24.0 Ah
const DEMO_CURRENT_CYCLE = 320;
const DEMO_CURRENT_USABLE_AH = 22.61; // 94.2% illustrative capacity after 320 demo cycles
const DEMO_SLOPE_AH_PER_CYCLE = 0.00425; // Illustrative LiFePO4 linear fade slope

/**
 * Generates deterministic illustrative LiFePO4 capacity-test records (DEMO mode only).
 * Never used in HARDWARE mode.
 */
function buildIllustrativeCapacityRecords(): CapacityTestRecord[] {
  const cycles = [0, 40, 80, 120, 160, 200, 240, 280, 320];
  return cycles.map((cycle, idx) => {
    const gentleRipple = Math.sin(idx * 1.35) * 0.05;
    const baseAh =
      cycle === 0
        ? REF_CAPACITY_AH
        : Number(
            (
              REF_CAPACITY_AH -
              cycle * DEMO_SLOPE_AH_PER_CYCLE -
              0.03 +
              gentleRipple
            ).toFixed(2)
          );
    const measuredCapacityAh = cycle === DEMO_CURRENT_CYCLE ? DEMO_CURRENT_USABLE_AH : baseAh;
    const sohPct = Number(((measuredCapacityAh / REF_CAPACITY_AH) * 100).toFixed(1));
    return {
      cycle,
      measuredCapacityAh,
      referenceCapacityAh: REF_CAPACITY_AH,
      sohPct,
      isIllustrative: true,
    };
  });
}

/**
 * Generates an illustrative observed + projected degradation trajectory for a given
 * configurable EoL threshold (DEMO mode only).
 */
function buildIllustrativeDegradationTrajectory(
  records: CapacityTestRecord[],
  eolThresholdPct: number
): {
  trajectory: DegradationRecord[];
  projectedCrossingCycle: number;
  remainingCycles: number;
  uncertaintyHalfWidth: number;
} {
  const eolCapacityAh = Number(((eolThresholdPct / 100) * REF_CAPACITY_AH).toFixed(2));
  const remainingAhToEol = Math.max(0.2, DEMO_CURRENT_USABLE_AH - eolCapacityAh);
  const remainingCycles = Math.round(remainingAhToEol / DEMO_SLOPE_AH_PER_CYCLE);
  const projectedCrossingCycle = DEMO_CURRENT_CYCLE + remainingCycles;
  const uncertaintyHalfWidth = Math.max(45, Math.round(remainingCycles * 0.14));

  const maxPlotCycle = Math.min(2000, Math.ceil((projectedCrossingCycle + 220) / 80) * 80);

  const trajectory: DegradationRecord[] = [];

  // Observed illustrative portion (solid line)
  for (const rec of records) {
    const isTransitionPoint = rec.cycle === DEMO_CURRENT_CYCLE;
    trajectory.push({
      cycle: rec.cycle,
      observedCapacityAh: rec.measuredCapacityAh,
      observedSohPct: rec.sohPct,
      predictedCapacityAh: isTransitionPoint ? rec.measuredCapacityAh : null,
      predictedSohPct: isTransitionPoint ? rec.sohPct : null,
      intervalLowerAh: isTransitionPoint ? rec.measuredCapacityAh : null,
      intervalUpperAh: isTransitionPoint ? rec.measuredCapacityAh : null,
      intervalBandAh: isTransitionPoint
        ? [rec.measuredCapacityAh, rec.measuredCapacityAh]
        : null,
      referenceCapacityAh: REF_CAPACITY_AH,
    });
  }

  // Projected illustrative portion (dashed line + expanding uncertainty fan)
  for (let cyc = DEMO_CURRENT_CYCLE + 80; cyc <= maxPlotCycle; cyc += 80) {
    const deltaCyc = cyc - DEMO_CURRENT_CYCLE;
    const accel = 1 + (deltaCyc / 2400) * 0.12;
    const predAh = Number(
      Math.max(15.5, DEMO_CURRENT_USABLE_AH - deltaCyc * DEMO_SLOPE_AH_PER_CYCLE * accel).toFixed(2)
    );
    const spread = Number((0.12 + (deltaCyc / 1000) * 0.68).toFixed(2));
    const lowerAh = Number(Math.max(15.0, predAh - spread).toFixed(2));
    const upperAh = Number(Math.min(REF_CAPACITY_AH, predAh + spread).toFixed(2));
    const predSohPct = Number(((predAh / REF_CAPACITY_AH) * 100).toFixed(1));

    trajectory.push({
      cycle: cyc,
      observedCapacityAh: null,
      observedSohPct: null,
      predictedCapacityAh: predAh,
      predictedSohPct: predSohPct,
      intervalLowerAh: lowerAh,
      intervalUpperAh: upperAh,
      intervalBandAh: [lowerAh, upperAh],
      referenceCapacityAh: REF_CAPACITY_AH,
    });
  }

  return {
    trajectory,
    projectedCrossingCycle,
    remainingCycles,
    uncertaintyHalfWidth,
  };
}

function buildModelMetadata(mode: DataSourceMode): ModelMetadata {
  return {
    deployed: false,
    statusLabel: 'MODEL NOT DEPLOYED',
    modelName: 'N/A',
    modelVersion: 'N/A',
    modelType: 'N/A (Pending Candidate Selection)',
    trainingDataset: 'N/A (0 Validated Ageing Records)',
    trainingDate: 'N/A',
    validationStatus: 'NOT VALIDATED',
    lastInferenceTime: 'N/A',
    inferenceLatency: 'N/A',
    runtimeEnvironment: 'Linux SBC Offline Runtime (Pending Hardware)',
    inputFeatureAvailability:
      mode === 'DEMO'
        ? '4/7 Simulated Telemetry · 3/7 Ageing Features Unavailable'
        : '0/7 Live Hardware Features Connected',
    currentLifecycleStageIndex: 0, // DATA COLLECTION preparation stage
  };
}

function buildEvaluationMetrics(): ModelEvaluationMetrics {
  return {
    available: false,
    mae: 'N/A',
    rmse: 'N/A',
    r2: 'N/A',
    evaluationDataset: 'N/A',
    splitStrategy: 'N/A',
    evaluatedRecords: '0',
    validationDate: 'N/A',
  };
}

function buildInputFeatures(
  telemetry: BatteryTelemetry,
  mode: DataSourceMode
): IntelligenceInputFeature[] {
  const isDemo = mode === 'DEMO';
  return [
    {
      id: 'feat-v',
      name: 'Pack Voltage',
      category: isDemo ? 'DIRECT_SENSOR' : 'UNAVAILABLE',
      currentValueLabel: isDemo ? `${telemetry.packVoltage.toFixed(2)} V (DEMO)` : 'N/A',
      sourceDetail: 'Planned INA226 bus monitor',
      availableInCurrentMode: isDemo,
    },
    {
      id: 'feat-i',
      name: 'Pack Current',
      category: isDemo ? 'DIRECT_SENSOR' : 'UNAVAILABLE',
      currentValueLabel: isDemo ? `${telemetry.packCurrent.toFixed(2)} A (DEMO)` : 'N/A',
      sourceDetail: 'Planned ACS758-50B (±50 A) via ADS1115',
      availableInCurrentMode: isDemo,
    },
    {
      id: 'feat-t',
      name: 'Temperature Measurements',
      category: isDemo ? 'DIRECT_SENSOR' : 'UNAVAILABLE',
      currentValueLabel: isDemo
        ? `${telemetry.temperature.toFixed(1)} °C mean (${telemetry.minTemperature.toFixed(
            1
          )}-${telemetry.maxTemperature.toFixed(1)} °C)`
        : 'N/A',
      sourceDetail: '4× DS18B20 zone probes',
      availableInCurrentMode: isDemo,
    },
    {
      id: 'feat-qh',
      name: 'Charge / Discharge History',
      category: isDemo ? 'CALCULATED' : 'UNAVAILABLE',
      currentValueLabel: isDemo
        ? `${telemetry.power.toFixed(1)} W · SoC Est ${telemetry.stateOfCharge.toFixed(1)}%`
        : 'N/A',
      sourceDetail: 'Integrated from V, I time-series (Coulomb counting)',
      availableInCurrentMode: isDemo,
    },
    {
      id: 'feat-cyc',
      name: 'Validated Cycle Count',
      category: 'UNAVAILABLE',
      currentValueLabel: 'UNAVAILABLE (0 Validated)',
      sourceDetail: 'Requires persistent edge cycling log / BMS history',
      availableInCurrentMode: false,
    },
    {
      id: 'feat-cap',
      name: 'Measured Discharge Capacity',
      category: 'UNAVAILABLE',
      currentValueLabel: 'UNAVAILABLE (No Lab Test)',
      sourceDetail: 'Requires controlled full discharge capacity test (Ah)',
      availableInCurrentMode: false,
    },
    {
      id: 'feat-deg',
      name: 'Historical Degradation Trajectory',
      category: 'MODEL_ESTIMATE',
      currentValueLabel: 'MODEL NOT DEPLOYED',
      sourceDetail: 'Derived from multi-cycle ageing records once trained',
      availableInCurrentMode: false,
    },
  ];
}

function buildDiagnosticFindings(
  telemetry: BatteryTelemetry,
  sensorStatuses: SensorChannelStatus[],
  mode: DataSourceMode
): DiagnosticFinding[] {
  const isDemo = mode === 'DEMO';
  const ts = isDemo ? formatTimeShort(telemetry.epochMs) : 'OFFLINE';

  if (!isDemo) {
    return [
      {
        id: 'find-hw-offline',
        title: 'Hardware Telemetry Stream Disconnected',
        supportingMeasurement: '0 of 6 planned sensor/BMS channels connected',
        timestamp: ts,
        severity: 'WARNING',
        dataSource: 'UNAVAILABLE',
        simulated: false,
        explanation:
          'No ESP32-S3 or Edge API measurements are currently arriving in HARDWARE mode. Diagnostic findings are withheld until real sensor frames are received.',
      },
      {
        id: 'find-hw-model',
        title: 'Edge-AI Prognostic Model Not Deployed',
        supportingMeasurement: 'Validated ageing records: 0 · Model status: NOT DEPLOYED',
        timestamp: ts,
        severity: 'INFO',
        dataSource: 'UNAVAILABLE',
        simulated: false,
        explanation:
          'SoH and RUL predictions require experimentally labelled capacity-test data and a validated offline model artifact on the Linux edge computer.',
      },
    ];
  }

  const tempSpreadC = Number((telemetry.maxTemperature - telemetry.minTemperature).toFixed(1));
  const offlineSensors = sensorStatuses.filter((s) => s.status === 'NOT_CONNECTED');

  const findings: DiagnosticFinding[] = [
    {
      id: 'find-temp-spread',
      title: 'Inter-Probe Thermal Gradient Observed',
      supportingMeasurement: `ΔT = ${tempSpreadC.toFixed(1)} °C (${telemetry.minTemperature.toFixed(
        1
      )}-${telemetry.maxTemperature.toFixed(1)} °C across TEMP-01..04)`,
      timestamp: ts,
      severity: tempSpreadC > 3.5 ? 'WARNING' : 'INFO',
      dataSource: 'DEMO',
      simulated: true,
      explanation:
        'Simulated inner core zones (TEMP-02/03) sit slightly warmer than outer terminal zones (TEMP-01/04), illustrating how spatial thermal gradients are tracked.',
    },
    {
      id: 'find-cell-spread',
      title: '8S Series-Group Voltage Spread Monitor',
      supportingMeasurement: `ΔV = ${telemetry.cellDeltaMv} mV across simulated S1-S8 nodes`,
      timestamp: ts,
      severity: telemetry.cellDeltaMv >= 45 ? 'ATTENTION' : 'INFO',
      dataSource: 'DEMO',
      simulated: true,
      explanation:
        'Tracks series-group divergence under load. Actual cell-group consistency verification requires live JK Smart BMS (B1A8S10P) telemetry.',
    },
    {
      id: 'find-power-regime',
      title:
        telemetry.packCurrent < -0.3
          ? 'Simulated Charging / Regen Inflow Regime'
          : telemetry.packCurrent > 20
          ? 'Elevated Simulated Discharge Load'
          : 'Nominal Simulated Operating Load',
      supportingMeasurement: `V = ${telemetry.packVoltage.toFixed(2)} V · I = ${telemetry.packCurrent.toFixed(
        2
      )} A · P = ${telemetry.power.toFixed(1)} W`,
      timestamp: ts,
      severity: telemetry.packCurrent > 25 ? 'ATTENTION' : 'INFO',
      dataSource: 'DEMO',
      simulated: true,
      explanation:
        'Live electrical load changes directly affect voltage sag and thermal rise; high-C-rate transients are logged as contextual features for future ageing models.',
    },
    {
      id: 'find-missing-hw',
      title: 'Unconnected Hardware & Ageing Label Gap',
      supportingMeasurement: `${offlineSensors.length} subsystem offline (${offlineSensors
        .map((s) => s.sensor)
        .join(', ')}) · 0 validated capacity tests`,
      timestamp: ts,
      severity: 'ATTENTION',
      dataSource: 'DEMO',
      simulated: true,
      explanation:
        'JK Smart BMS and the offline ML inference engine are not connected yet. Simulated telemetry provides UI validation only and does not substitute for labelled ageing records.',
    },
  ];

  return findings;
}

/**
 * Pure presentation-independent service producing the complete Battery Intelligence Centre
 * state from the single shared BattVision telemetry stream and configurable EoL threshold.
 */
export function buildBatteryHealthEstimate(
  telemetry: BatteryTelemetry,
  history: TelemetryHistoryPoint[],
  sensorStatuses: SensorChannelStatus[],
  mode: DataSourceMode,
  eolThresholdPct: number
): BatteryHealthEstimate {
  const isDemo = mode === 'DEMO';
  const nowIso = telemetry.timestamp;

  // SoC trend from shared history
  let socTrend: 'RISING' | 'FALLING' | 'STEADY' | 'UNAVAILABLE' = 'UNAVAILABLE';
  if (isDemo && history.length >= 4) {
    const latestSoc = history[history.length - 1].stateOfCharge;
    const prevSoc = history[Math.max(0, history.length - 8)].stateOfCharge;
    const delta = latestSoc - prevSoc;
    socTrend = delta > 0.05 ? 'RISING' : delta < -0.05 ? 'FALLING' : 'STEADY';
  }

  const socValue = isDemo ? telemetry.stateOfCharge : null;
  const remainingAh =
    socValue !== null ? Number(((socValue / 100) * REF_CAPACITY_AH).toFixed(2)) : null;
  const remainingWh =
    socValue !== null
      ? Number(((socValue / 100) * BATTERY_PACK_SPEC.nominalEnergyWh).toFixed(1))
      : null;

  const capacityRecords = isDemo ? buildIllustrativeCapacityRecords() : [];
  const demoTraj = isDemo
    ? buildIllustrativeDegradationTrajectory(capacityRecords, eolThresholdPct)
    : null;

  const eolCapacityAh = Number(((eolThresholdPct / 100) * REF_CAPACITY_AH).toFixed(2));
  const illustrativeSohPct = Number(
    ((DEMO_CURRENT_USABLE_AH / REF_CAPACITY_AH) * 100).toFixed(1)
  );

  // Convert remaining demo cycles into rough illustrative months (~1.2 cycles/day assumption)
  const illustrativeMonths =
    demoTraj !== null ? Number((demoTraj.remainingCycles / 36).toFixed(1)) : null;

  const missingSensors = sensorStatuses
    .filter((s) => s.status === 'NOT_CONNECTED')
    .map((s) => s.sensor);
  const simulatedSensorsCount = sensorStatuses.filter((s) => s.status === 'SIMULATED').length;

  return {
    mode,
    generatedAt: nowIso,
    soc: {
      available: isDemo,
      valuePct: socValue,
      remainingCapacityAh: remainingAh,
      remainingEnergyWh: remainingWh,
      trend: socTrend,
      method: 'Coulomb Counting + OCV Calibration (Simulated)',
      lastUpdated: isDemo ? formatTimeShort(telemetry.epochMs) : null,
      dataSource: isDemo ? 'DEMO' : 'UNAVAILABLE',
      isIllustrative: isDemo,
    },
    soh: {
      modelAvailable: false,
      validatedValuePct: null,
      illustrativeDemoValuePct: isDemo ? illustrativeSohPct : null,
      referenceCapacityAh: REF_CAPACITY_AH,
      estimatedUsableCapacityAh: isDemo ? DEMO_CURRENT_USABLE_AH : null,
      degradationTrendLabel: isDemo
        ? `−${(100 - illustrativeSohPct).toFixed(1)}% over ${DEMO_CURRENT_CYCLE} demo cycles (Illustrative)`
        : 'No validated degradation trend',
      assessmentStatus: isDemo
        ? 'SOH MODEL NOT AVAILABLE (ILLUSTRATIVE DEMO SHOWN)'
        : 'SOH MODEL NOT AVAILABLE',
      dataSource: isDemo ? 'DEMO' : 'UNAVAILABLE',
      isIllustrative: isDemo,
    },
    rul: {
      modelAvailable: false,
      sufficientAgeingData: false,
      eolThresholdPct,
      eolCapacityAh,
      estimatedRemainingCycles: demoTraj ? demoTraj.remainingCycles : null,
      estimatedRemainingMonths: illustrativeMonths,
      projectedCrossingCycle: demoTraj ? demoTraj.projectedCrossingCycle : null,
      uncertainty: {
        available: isDemo,
        calibrated: false,
        lowerCycles: demoTraj
          ? Math.max(0, demoTraj.remainingCycles - demoTraj.uncertaintyHalfWidth)
          : null,
        upperCycles: demoTraj
          ? demoTraj.remainingCycles + demoTraj.uncertaintyHalfWidth
          : null,
        explanation: isDemo
          ? 'Illustrative uncalibrated demo envelope (±14%) - calibrated uncertainty intervals require validated ageing data.'
          : 'Calibrated prediction uncertainty unavailable (no deployed model).',
      },
      modelStatusLabel: 'INSUFFICIENT AGEING DATA FOR VALIDATED RUL',
      dataSource: isDemo ? 'DEMO' : 'UNAVAILABLE',
      isIllustrative: isDemo,
    },
    conditionSummary: {
      overallAssessment: isDemo
        ? 'ILLUSTRATIVE DEMO STATE ONLY'
        : 'ASSESSMENT UNAVAILABLE (OFFLINE)',
      assessmentBasis: isDemo
        ? 'Based on simulated telemetry & unvalidated demo curves - not a certified health score.'
        : 'Awaiting live ESP32-S3, JK BMS, and validated capacity-test data.',
      dataQuality: isDemo
        ? `SIMULATED STREAM (${history.length} RING FRAMES)`
        : 'NO HARDWARE TELEMETRY',
      estimationAvailability: isDemo
        ? 'SoC: Demo Est · SoH/RUL: Model Offline (Demo Preview)'
        : 'SoC: Unavailable · SoH/RUL: Model Offline',
      modelAvailability: 'MODEL NOT DEPLOYED',
      sensorCompleteness: isDemo
        ? `${simulatedSensorsCount}/6 Simulated · ${missingSensors.length}/6 Offline`
        : '0/6 Physical Channels Connected',
      lastValidCapacityTest: 'NONE RECORDED',
      validatedAgeingRecords: 0,
    },
    capacityRecords,
    degradationTrajectory: demoTraj ? demoTraj.trajectory : [],
    modelMetadata: buildModelMetadata(mode),
    evaluationMetrics: buildEvaluationMetrics(),
    inputFeatures: buildInputFeatures(telemetry, mode),
    reliability: {
      dataQuality: {
        inputCompletenessLabel: isDemo
          ? `${simulatedSensorsCount} of 6 channels simulated (JK BMS offline)`
          : '0 of 6 hardware channels active',
        missingMeasurements: isDemo
          ? ['JK Smart BMS (B1A8S10P)', 'Measured Discharge Capacity (Ah)', 'Validated Cycle Count']
          : [
              'INA226',
              'ACS758-50B',
              'ADS1115',
              'DS18B20 × 4',
              'MPU6050',
              'JK Smart BMS',
              'Capacity Test Records',
            ],
        staleMeasurements: [],
      },
      modelValidation: {
        modelAvailabilityLabel: 'MODEL NOT DEPLOYED',
        trainingDataCoverageLabel: '0 validated experimental ageing records (training pending)',
      },
      predictionUncertainty: {
        calibratedAvailable: false,
        intervalSummary: isDemo
          ? 'UNCALIBRATED DEMO BAND ONLY (NOT CONFIDENCE %)'
          : 'UNCERTAINTY UNAVAILABLE',
        note: 'Model confidence percentages are intentionally omitted. Sensor data quality, model validation, and calibrated prediction uncertainty are evaluated separately.',
      },
    },
    findings: buildDiagnosticFindings(telemetry, sensorStatuses, mode),
  };
}
