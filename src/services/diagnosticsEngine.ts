import {
  CommunicationStatus,
  DiagnosticAlert,
  DiagnosticEvaluation,
  DiagnosticRule,
  DiagnosticThresholdsConfig,
  SensorHealth,
} from '../types/diagnostics';
import { BatteryTelemetry, DataSourceMode } from '../types/telemetry';
import { formatTimeShort } from './simulationService';

export const DEFAULT_DIAGNOSTIC_THRESHOLDS: DiagnosticThresholdsConfig = {
  packVoltageHighV: 28.8,
  packVoltageLowV: 22.4,
  cellDeltaWarnMv: 45,
  tempWarnC: 36.0,
  tempSpreadWarnC: 3.5,
  currentHighA: 26.0,
  powerHighW: 720,
  freshnessLimitSec: 5,
};

/**
 * Stage 1: Pure diagnostic rule definitions (separated from evaluation & UI).
 * Thresholds are explicitly configurable illustrative demo rules - never certified BMS limits.
 */
export function buildDiagnosticRules(cfg: DiagnosticThresholdsConfig): DiagnosticRule[] {
  return [
    {
      ruleId: 'VOLT-001',
      ruleName: 'Pack Over-Voltage Limit Check',
      measurementSource: 'INA226 Bus Voltage',
      comparisonCondition: `V_pack > ${cfg.packVoltageHighV.toFixed(1)} V`,
      configuredThresholdLabel: `> ${cfg.packVoltageHighV.toFixed(1)} V (Illustrative)`,
      severity: 'CRITICAL',
      explanation: 'Flags pack bus voltage exceeding the configured upper monitoring threshold.',
      requiredInputs: 'Valid pack voltage reading',
    },
    {
      ruleId: 'VOLT-002',
      ruleName: 'Pack Under-Voltage Limit Check',
      measurementSource: 'INA226 Bus Voltage',
      comparisonCondition: `V_pack < ${cfg.packVoltageLowV.toFixed(1)} V`,
      configuredThresholdLabel: `< ${cfg.packVoltageLowV.toFixed(1)} V (Illustrative)`,
      severity: 'WARNING',
      explanation: 'Flags pack bus voltage dropping below the configured lower monitoring threshold.',
      requiredInputs: 'Valid pack voltage reading',
    },
    {
      ruleId: 'CELL-001',
      ruleName: '8S Series-Group Voltage Variation',
      measurementSource: 'JK Smart BMS S1-S8 Taps',
      comparisonCondition: `ΔV_group > ${cfg.cellDeltaWarnMv} mV`,
      configuredThresholdLabel: `> ${cfg.cellDeltaWarnMv} mV (Illustrative)`,
      severity: 'WARNING',
      explanation: 'Monitors divergence between 8S parallel-group voltages when valid BMS frames exist.',
      requiredInputs: 'Live JK Smart BMS S1-S8 group voltages',
    },
    {
      ruleId: 'TEMP-001',
      ruleName: 'Zone Probe High Temperature',
      measurementSource: '4× DS18B20 (TEMP-01..04)',
      comparisonCondition: `T_probe > ${cfg.tempWarnC.toFixed(1)} °C`,
      configuredThresholdLabel: `> ${cfg.tempWarnC.toFixed(1)} °C (Illustrative)`,
      severity: 'WARNING',
      explanation: 'Triggers a monitoring warning if any active DS18B20 probe exceeds the configured UI threshold.',
      requiredInputs: 'At least one fresh DS18B20 reading',
    },
    {
      ruleId: 'TEMP-002',
      ruleName: 'Thermal Probe Disagreement / Spread',
      measurementSource: '4× DS18B20 Array',
      comparisonCondition: `ΔT_array > ${cfg.tempSpreadWarnC.toFixed(1)} °C`,
      configuredThresholdLabel: `> ${cfg.tempSpreadWarnC.toFixed(1)} °C (Illustrative)`,
      severity: 'WARNING',
      explanation: 'Detects large temperature divergence across the four monitoring probes.',
      requiredInputs: '≥ 2 fresh DS18B20 probe readings',
    },
    {
      ruleId: 'CURR-001',
      ruleName: 'Elevated Pack Current Check',
      measurementSource: 'ACS758-50B (±50 A Nominal)',
      comparisonCondition: `|I_pack| > ${cfg.currentHighA.toFixed(1)} A`,
      configuredThresholdLabel: `> ${cfg.currentHighA.toFixed(1)} A (Illustrative)`,
      severity: 'WARNING',
      explanation: 'Monitors elevated current draw within the ±50 A nominal ACS758-50B sensor range.',
      requiredInputs: 'Valid ACS758-50B / ADS1115 current reading',
    },
    {
      ruleId: 'PWR-001',
      ruleName: 'Unexpected Electrical Power Envelope',
      measurementSource: 'Derived Power (V × I)',
      comparisonCondition: `|P_pack| > ${cfg.powerHighW} W`,
      configuredThresholdLabel: `> ${cfg.powerHighW} W (Illustrative)`,
      severity: 'WARNING',
      explanation: 'Flags sustained high instantaneous power calculated consistently as V × I.',
      requiredInputs: 'Valid pack voltage and current readings',
    },
    {
      ruleId: 'SENSOR-001',
      ruleName: 'Sensor Update Freshness Check',
      measurementSource: 'All Sensor Channels',
      comparisonCondition: `Age > ${cfg.freshnessLimitSec} s`,
      configuredThresholdLabel: `> ${cfg.freshnessLimitSec} s stale limit`,
      severity: 'WARNING',
      explanation: 'Identifies individual probes or IMU channels that stop updating within the freshness window.',
      requiredInputs: 'Channel update timestamps',
    },
    {
      ruleId: 'COMM-001',
      ruleName: 'Communication Path Availability',
      measurementSource: 'ESP32-S3 / Edge / BMS Links',
      comparisonCondition: 'Link = DISCONNECTED / NOT_CONFIGURED',
      configuredThresholdLabel: 'Active link required',
      severity: 'WARNING',
      explanation: 'Reports unconfigured or disconnected hardware communication paths without fabricating connectivity.',
      requiredInputs: 'Link heartbeat status',
    },
    {
      ruleId: 'DATA-001',
      ruleName: 'Battery Telemetry Completeness',
      measurementSource: 'JK Smart BMS B1A8S10P',
      comparisonCondition: 'Required BMS frames missing',
      configuredThresholdLabel: 'All required channels present',
      severity: 'INFO',
      explanation: 'Marks dependent checks as NOT EVALUATED when required BMS or hardware telemetry is absent.',
      requiredInputs: 'Hardware telemetry stream + BMS link',
    },
  ];
}

export interface DiagnosticEngineContext {
  telemetry: BatteryTelemetry;
  dataSourceMode: DataSourceMode;
  thresholds: DiagnosticThresholdsConfig;
  simulateTemp3Stale: boolean;
}

/**
 * Stage 2: Pure rule evaluation engine.
 * Strictly refuses to mark missing inputs as PASS or treat missing values as 0.
 */
export function evaluateDiagnosticRules(ctx: DiagnosticEngineContext): DiagnosticEvaluation[] {
  const { telemetry, dataSourceMode, thresholds, simulateTemp3Stale } = ctx;
  const rules = buildDiagnosticRules(thresholds);
  const isDemo = dataSourceMode === 'DEMO';

  const activeTemps = isDemo
    ? telemetry.temperatureSensors
        .filter((s) => !(simulateTemp3Stale && s.id === 'TEMP-03'))
        .map((s) => s.temperatureC)
        .filter((v): v is number => v !== null)
    : [];

  const maxTemp = activeTemps.length ? Math.max(...activeTemps) : null;
  const minTemp = activeTemps.length ? Math.min(...activeTemps) : null;
  const tempSpread =
    maxTemp !== null && minTemp !== null ? Number((maxTemp - minTemp).toFixed(1)) : null;

  return rules.map((rule): DiagnosticEvaluation => {
    switch (rule.ruleId) {
      case 'VOLT-001': {
        if (!isDemo) {
          return {
            rule,
            outcome: 'NOT_EVALUATED',
            observedValueLabel: 'UNAVAILABLE',
            statusMessage: 'VOLTAGE CHECK: NOT EVALUATED - HARDWARE STREAM UNAVAILABLE',
            dataSource: 'UNAVAILABLE',
          };
        }
        const triggered = telemetry.packVoltage > thresholds.packVoltageHighV;
        return {
          rule,
          outcome: triggered ? 'TRIGGERED' : 'PASS',
          observedValueLabel: `${telemetry.packVoltage.toFixed(2)} V (DEMO)`,
          statusMessage: triggered
            ? `Simulated pack voltage exceeds ${thresholds.packVoltageHighV.toFixed(1)} V demo limit`
            : `Within illustrative upper limit (≤ ${thresholds.packVoltageHighV.toFixed(1)} V)`,
          dataSource: 'DEMO',
        };
      }

      case 'VOLT-002': {
        if (!isDemo) {
          return {
            rule,
            outcome: 'NOT_EVALUATED',
            observedValueLabel: 'UNAVAILABLE',
            statusMessage: 'VOLTAGE CHECK: NOT EVALUATED - HARDWARE STREAM UNAVAILABLE',
            dataSource: 'UNAVAILABLE',
          };
        }
        const triggered = telemetry.packVoltage < thresholds.packVoltageLowV;
        return {
          rule,
          outcome: triggered ? 'TRIGGERED' : 'PASS',
          observedValueLabel: `${telemetry.packVoltage.toFixed(2)} V (DEMO)`,
          statusMessage: triggered
            ? `Simulated pack voltage below ${thresholds.packVoltageLowV.toFixed(1)} V demo limit`
            : `Above illustrative lower limit (≥ ${thresholds.packVoltageLowV.toFixed(1)} V)`,
          dataSource: 'DEMO',
        };
      }

      case 'CELL-001': {
        if (!isDemo) {
          return {
            rule,
            outcome: 'NOT_EVALUATED',
            observedValueLabel: 'UNAVAILABLE',
            statusMessage: 'GROUP SPREAD CHECK: NOT EVALUATED - BMS DATA UNAVAILABLE',
            dataSource: 'UNAVAILABLE',
          };
        }
        const triggered = telemetry.cellDeltaMv > thresholds.cellDeltaWarnMv;
        return {
          rule,
          outcome: triggered ? 'TRIGGERED' : 'PASS',
          observedValueLabel: `${telemetry.cellDeltaMv} mV (DEMO SIM)`,
          statusMessage: triggered
            ? `Simulated 8S spread exceeds ${thresholds.cellDeltaWarnMv} mV illustrative limit`
            : `Simulated 8S spread nominal (JK BMS physical check still pending)`,
          dataSource: 'DEMO',
        };
      }

      case 'TEMP-001': {
        if (!isDemo || maxTemp === null) {
          return {
            rule,
            outcome: 'NOT_EVALUATED',
            observedValueLabel: 'UNAVAILABLE',
            statusMessage: 'THERMAL CHECK: NOT EVALUATED - DS18B20 DATA UNAVAILABLE',
            dataSource: 'UNAVAILABLE',
          };
        }
        const triggered = maxTemp > thresholds.tempWarnC;
        return {
          rule,
          outcome: triggered ? 'TRIGGERED' : 'PASS',
          observedValueLabel: `${maxTemp.toFixed(1)} °C max (DEMO)`,
          statusMessage: triggered
            ? `Active simulated probe exceeds ${thresholds.tempWarnC.toFixed(1)} °C UI threshold`
            : `All active simulated probes ≤ ${thresholds.tempWarnC.toFixed(1)} °C`,
          dataSource: 'DEMO',
        };
      }

      case 'TEMP-002': {
        if (!isDemo || tempSpread === null) {
          return {
            rule,
            outcome: 'NOT_EVALUATED',
            observedValueLabel: 'UNAVAILABLE',
            statusMessage: 'SPREAD CHECK: NOT EVALUATED - INSUFFICIENT PROBE DATA',
            dataSource: 'UNAVAILABLE',
          };
        }
        const triggered = tempSpread > thresholds.tempSpreadWarnC;
        return {
          rule,
          outcome: triggered ? 'TRIGGERED' : 'PASS',
          observedValueLabel: `ΔT ${tempSpread.toFixed(1)} °C (DEMO)`,
          statusMessage: triggered
            ? `Probe disagreement exceeds ${thresholds.tempSpreadWarnC.toFixed(1)} °C illustrative band`
            : `Probe spread within ${thresholds.tempSpreadWarnC.toFixed(1)} °C illustrative band`,
          dataSource: 'DEMO',
        };
      }

      case 'CURR-001': {
        if (!isDemo) {
          return {
            rule,
            outcome: 'NOT_EVALUATED',
            observedValueLabel: 'UNAVAILABLE',
            statusMessage: 'CURRENT CHECK: NOT EVALUATED - ACS758-50B DATA UNAVAILABLE',
            dataSource: 'UNAVAILABLE',
          };
        }
        const absI = Math.abs(telemetry.packCurrent);
        const triggered = absI > thresholds.currentHighA;
        return {
          rule,
          outcome: triggered ? 'TRIGGERED' : 'PASS',
          observedValueLabel: `${telemetry.packCurrent.toFixed(2)} A (DEMO)`,
          statusMessage: triggered
            ? `Simulated current magnitude exceeds ${thresholds.currentHighA.toFixed(1)} A limit`
            : `Within ±${thresholds.currentHighA.toFixed(1)} A illustrative envelope`,
          dataSource: 'DEMO',
        };
      }

      case 'PWR-001': {
        if (!isDemo) {
          return {
            rule,
            outcome: 'NOT_EVALUATED',
            observedValueLabel: 'UNAVAILABLE',
            statusMessage: 'POWER CHECK: NOT EVALUATED - VOLTAGE/CURRENT MISSING',
            dataSource: 'UNAVAILABLE',
          };
        }
        const absP = Math.abs(telemetry.power);
        const triggered = absP > thresholds.powerHighW;
        return {
          rule,
          outcome: triggered ? 'TRIGGERED' : 'PASS',
          observedValueLabel: `${telemetry.power.toFixed(1)} W (DEMO)`,
          statusMessage: triggered
            ? `Simulated power exceeds ${thresholds.powerHighW} W illustrative threshold`
            : `Within ±${thresholds.powerHighW} W illustrative envelope`,
          dataSource: 'DEMO',
        };
      }

      case 'SENSOR-001': {
        if (!isDemo) {
          return {
            rule,
            outcome: 'TRIGGERED',
            observedValueLabel: '0/8 ACTIVE CHANNELS',
            statusMessage: 'No live sensor updates received in HARDWARE mode',
            dataSource: 'UNAVAILABLE',
          };
        }
        if (simulateTemp3Stale) {
          return {
            rule,
            outcome: 'TRIGGERED',
            observedValueLabel: 'TEMP-03 STALE (> 5 s SIM)',
            statusMessage: 'Simulated stale channel detected on TEMP-03 (other probes unaffected)',
            dataSource: 'DEMO',
          };
        }
        return {
          rule,
          outcome: 'PASS',
          observedValueLabel: '1.0 s update (DEMO)',
          statusMessage: 'All simulated sensor channels updating within 5 s freshness window',
          dataSource: 'DEMO',
        };
      }

      case 'COMM-001': {
        return {
          rule,
          outcome: 'TRIGGERED',
          observedValueLabel: isDemo ? 'JK BMS NOT CONFIGURED' : 'ALL HARDWARE LINKS OFFLINE',
          statusMessage: isDemo
            ? 'JK Smart BMS (B1A8S10P) interface pending verification; sensors running in DEMO'
            : 'ESP32-S3, Edge SBC, and JK Smart BMS links disconnected',
          dataSource: isDemo ? 'DEMO' : 'UNAVAILABLE',
        };
      }

      case 'DATA-001':
      default: {
        return {
          rule,
          outcome: 'TRIGGERED',
          observedValueLabel: isDemo ? 'BMS & ML MISSING' : 'TELEMETRY MISSING',
          statusMessage: isDemo
            ? 'BMS cell-group telemetry and ML inference model not connected (DEMO fallback active)'
            : 'Complete hardware telemetry unavailable until ESP32-S3 and Edge API connect',
          dataSource: isDemo ? 'DEMO' : 'UNAVAILABLE',
        };
      }
    }
  });
}

/**
 * Stage 3: Build individual Sensor Network Health records.
 * Explicitly separates all 4 DS18B20 probes (TEMP-01..04) and separates INA226 from ACS758-50B.
 * Never uses ONLINE in simulation mode. Never converts missing readings to 0.
 */
export function buildSensorHealthList(ctx: DiagnosticEngineContext): SensorHealth[] {
  const { telemetry, dataSourceMode, thresholds, simulateTemp3Stale } = ctx;
  const isDemo = dataSourceMode === 'DEMO';
  const ts = isDemo ? formatTimeShort(telemetry.epochMs) : 'N/A';

  const baseSensors: SensorHealth[] = [
    {
      sensorId: 'INA226',
      sensorName: 'INA226 Bus Voltage / Power Monitor',
      intendedMeasurement: 'Pack bus voltage & shunt power (shunt verification pending)',
      interfaceType: 'I2C (0x40)',
      status: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
      lastValidMeasurement: isDemo ? `${telemetry.packVoltage.toFixed(2)} V (DEMO)` : 'UNAVAILABLE',
      freshnessLabel: isDemo ? `LIVE · ${ts}` : 'OFFLINE',
      errorCount: isDemo ? 0 : null,
      diagnosticState: !isDemo
        ? 'WARNING'
        : telemetry.packVoltage > thresholds.packVoltageHighV
        ? 'CRITICAL'
        : telemetry.packVoltage < thresholds.packVoltageLowV
        ? 'WARNING'
        : 'NORMAL',
      engineeringNote: 'Independent from ACS758-50B; requires verified shunt & bus voltage rating.',
    },
    {
      sensorId: 'ACS758-50B',
      sensorName: 'ACS758-50B Hall-Effect Current Sensor',
      intendedMeasurement: 'Bidirectional pack current (±50 A nominal range)',
      interfaceType: 'Analog → ADS1115',
      status: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
      lastValidMeasurement: isDemo ? `${telemetry.packCurrent.toFixed(2)} A (DEMO)` : 'UNAVAILABLE',
      freshnessLabel: isDemo ? `LIVE · ${ts}` : 'OFFLINE',
      errorCount: isDemo ? 0 : null,
      diagnosticState: !isDemo
        ? 'WARNING'
        : Math.abs(telemetry.packCurrent) > thresholds.currentHighA
        ? 'WARNING'
        : 'NORMAL',
      engineeringNote: 'Nominal ±50 A range only (does not cover a 100 A BMS rating); distinct from INA226.',
    },
    {
      sensorId: 'ADS1115',
      sensorName: 'ADS1115 16-Bit External ADC',
      intendedMeasurement: 'Precision analog digitization (ACS758-50B channel)',
      interfaceType: 'I2C (0x48)',
      status: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
      lastValidMeasurement: isDemo
        ? `${(2.5 + telemetry.packCurrent * 0.04).toFixed(3)} V_adc (DEMO)`
        : 'UNAVAILABLE',
      freshnessLabel: isDemo ? `LIVE · ${ts}` : 'OFFLINE',
      errorCount: isDemo ? 0 : null,
      diagnosticState: isDemo ? 'NORMAL' : 'WARNING',
      engineeringNote: '16-bit I2C ADC bridging analog current output to ESP32-S3.',
    },
  ];

  // Four independent DS18B20 probes (TEMP-01 .. TEMP-04)
  const tempSensors: SensorHealth[] = telemetry.temperatureSensors.map((probe) => {
    const isStaleSim = isDemo && simulateTemp3Stale && probe.id === 'TEMP-03';
    const tempVal = isDemo && !isStaleSim ? probe.temperatureC : null;
    const isOverTemp = tempVal !== null && tempVal > thresholds.tempWarnC;

    return {
      sensorId: probe.id,
      sensorName: `DS18B20 Probe (${probe.zoneTitle})`,
      intendedMeasurement: 'Zone temperature (°C · illustrative placement)',
      interfaceType: '1-Wire Bus',
      status: !isDemo ? 'NOT_CONNECTED' : isStaleSim ? 'STALE' : 'SIMULATED',
      lastValidMeasurement:
        !isDemo
          ? 'UNAVAILABLE'
          : isStaleSim
          ? 'STALE (> 5 s SIM)'
          : tempVal !== null
          ? `${tempVal.toFixed(1)} °C (DEMO)`
          : 'UNAVAILABLE',
      freshnessLabel: !isDemo ? 'OFFLINE' : isStaleSim ? 'STALE · >12s' : `LIVE · ${ts}`,
      errorCount: !isDemo ? null : isStaleSim ? 1 : 0,
      diagnosticState: !isDemo
        ? 'WARNING'
        : isStaleSim || isOverTemp
        ? 'WARNING'
        : 'NORMAL',
      engineeringNote:
        'Independent 1-Wire channel; loss of one probe does not fault the remaining three.',
    };
  });

  const imuSensor: SensorHealth = {
    sensorId: 'MPU6050',
    sensorName: 'MPU6050 6-DOF Accelerometer / Gyroscope',
    intendedMeasurement: '3-axis acceleration (g) & angular velocity (°/s)',
    interfaceType: 'I2C (0x68)',
    status: isDemo ? 'SIMULATED' : 'NOT_CONNECTED',
    lastValidMeasurement: isDemo
      ? `${telemetry.accelerometer.dynamicRmsG.toFixed(3)} g RMS (DEMO)`
      : 'UNAVAILABLE',
    freshnessLabel: isDemo ? `LIVE · ${ts}` : 'OFFLINE',
    errorCount: isDemo ? 0 : null,
    diagnosticState: isDemo ? 'NORMAL' : 'WARNING',
    engineeringNote: 'Enclosure motion telemetry; not a standalone validated damage detector.',
  };

  return [...baseSensors, ...tempSensors, imuSensor];
}

/**
 * Stage 3b: Build Communication & Connectivity statuses for all 5 planned paths.
 * Never fabricates JK BMS UART/RS485 connectivity.
 */
export function buildCommunicationStatuses(
  telemetry: BatteryTelemetry,
  dataSourceMode: DataSourceMode
): CommunicationStatus[] {
  const isDemo = dataSourceMode === 'DEMO';
  const ts = isDemo ? formatTimeShort(telemetry.epochMs) : 'N/A';

  return [
    {
      id: 'comm-sensors-esp32',
      connectionName: 'Sensors ↔ ESP32-S3',
      interfaceLabel: 'I2C / 1-Wire / Analog ADC',
      status: isDemo ? 'SIMULATED' : 'DISCONNECTED',
      lastReceived: isDemo ? ts : 'N/A',
      freshnessLabel: isDemo ? '1.0 Hz DEMO' : 'OFFLINE',
      errorCount: isDemo ? 0 : null,
      note: 'PCBCupid Glyph ESP32-S3 local sensor acquisition bus (wiring pending).',
    },
    {
      id: 'comm-esp32-edge',
      connectionName: 'ESP32-S3 ↔ Linux Edge Computer',
      interfaceLabel: 'UART / USB Serial (Planned)',
      status: isDemo ? 'SIMULATED' : 'DISCONNECTED',
      lastReceived: isDemo ? ts : 'N/A',
      freshnessLabel: isDemo ? '1.0 Hz DEMO' : 'OFFLINE',
      errorCount: isDemo ? 0 : null,
      note: 'Telemetry bridge from microcontroller to offline Linux SBC.',
    },
    {
      id: 'comm-esp32-bms',
      connectionName: 'ESP32-S3 ↔ JK Smart BMS (B1A8S10P)',
      interfaceLabel: 'Configurable (Pending Verification)',
      status: 'NOT_CONFIGURED',
      lastReceived: 'N/A',
      freshnessLabel: 'UNAVAILABLE',
      errorCount: null,
      note: 'Physical BMS model, pinout, and UART/RS485/BLE protocol require verification before wiring.',
    },
    {
      id: 'comm-edge-ui',
      connectionName: 'Edge Computer ↔ Local Dashboard',
      interfaceLabel: 'Local HTTP / WebSocket',
      status: isDemo ? 'SIMULATED' : 'DISCONNECTED',
      lastReceived: isDemo ? ts : 'N/A',
      freshnessLabel: isDemo ? 'IN-BROWSER SIM' : 'NO BACKEND',
      errorCount: isDemo ? 0 : null,
      note: 'Offline browser workstation consuming central dataService contract.',
    },
    {
      id: 'comm-edge-db',
      connectionName: 'Edge Computer ↔ Local Database',
      interfaceLabel: 'SQLite / Local Edge Store',
      status: isDemo ? 'SIMULATED' : 'NOT_CONFIGURED',
      lastReceived: isDemo ? ts : 'N/A',
      freshnessLabel: isDemo ? 'RING BUFFER (DEMO)' : 'OFFLINE',
      errorCount: isDemo ? 0 : null,
      note: 'Temporary in-memory browser buffer active in DEMO; persistent edge DB pending.',
    },
  ];
}

/**
 * Stage 4: Build active diagnostic alerts cleanly from live telemetry & rules.
 * Clearly marks all simulated example alerts as simulated; never fabricates random faults in HARDWARE mode.
 */
export function buildBaselineAlerts(ctx: DiagnosticEngineContext): DiagnosticAlert[] {
  const { telemetry, dataSourceMode, thresholds, simulateTemp3Stale } = ctx;
  const isDemo = dataSourceMode === 'DEMO';
  const nowIso = telemetry.timestamp;
  const nowEpoch = telemetry.epochMs;
  const timeLabel = formatTimeShort(nowEpoch);

  if (!isDemo) {
    return [
      {
        id: 'ALM-HW-001',
        ruleId: 'COMM-001',
        timestamp: nowIso,
        epochMs: nowEpoch,
        timeLabel,
        title: 'HARDWARE TELEMETRY BACKEND NOT CONNECTED',
        severity: 'WARNING',
        sourceComponent: 'ESP32-S3 / EDGE SBC',
        measurementName: 'Telemetry Heartbeat',
        observedValueLabel: 'DISCONNECTED',
        configuredThresholdLabel: 'Active backend stream required',
        supportingMeasurement: '0 of 8 sensor channels reporting in HARDWARE mode',
        description:
          'No live ESP32-S3 or Edge API telemetry connection is currently established.',
        diagnosticExplanation:
          'HARDWARE mode does not substitute simulated readings. All dependent voltage, current, thermal, and motion checks remain NOT EVALUATED until live frames arrive.',
        recommendedInspection:
          'Verify USB/UART link between PCBCupid Glyph ESP32-S3 and Linux SBC, and confirm the local Python ingestion service is running.',
        dataSource: 'UNAVAILABLE',
        simulated: false,
        status: 'ACTIVE',
      },
      {
        id: 'ALM-BMS-001',
        ruleId: 'DATA-001',
        timestamp: nowIso,
        epochMs: nowEpoch,
        timeLabel,
        title: 'BMS DATA UNAVAILABLE',
        severity: 'INFO',
        sourceComponent: 'JK SMART BMS (B1A8S10P)',
        measurementName: '8S Series-Group Voltage Frames',
        observedValueLabel: 'NOT CONNECTED',
        configuredThresholdLabel: 'Verified BMS protocol frame',
        supportingMeasurement: 'JK Smart BMS communication path: NOT CONFIGURED',
        description:
          'Series-group S1-S8 voltages and BMS protection flags are unavailable.',
        diagnosticExplanation:
          'The JK Smart BMS interface has not yet been physically verified or connected. Independent BMS hardware protection remains separate from this monitoring dashboard.',
        recommendedInspection:
          'Verify physical JK Smart BMS model B1A8S10P interface specification, pinout, and isolation before connecting.',
        dataSource: 'UNAVAILABLE',
        simulated: false,
        status: 'ACTIVE',
      },
    ];
  }

  const alerts: DiagnosticAlert[] = [];

  // Live rule-triggered thermal warning (e.g. TEMP-03 or max probe > configured threshold)
  const temp3 = telemetry.temperatureSensors.find((p) => p.id === 'TEMP-03');
  const temp3Val = temp3?.temperatureC ?? null;

  if (simulateTemp3Stale) {
    alerts.push({
      id: 'ALM-STALE-T3',
      ruleId: 'SENSOR-001',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: 'TEMP-03 SENSOR DATA STALE (SIMULATED)',
      severity: 'WARNING',
      sourceComponent: 'TEMP-03 (DS18B20)',
      measurementName: '1-Wire Probe Update Freshness',
      observedValueLabel: '> 12 s since last frame (SIM)',
      configuredThresholdLabel: `> ${thresholds.freshnessLimitSec} s freshness limit`,
      supportingMeasurement: 'TEMP-03 stale; TEMP-01, TEMP-02, TEMP-04 remain unaffected',
      description:
        'Simulated stale-probe condition active on DS18B20 channel TEMP-03.',
      diagnosticExplanation:
        'Demonstrates per-probe fault isolation: a missing or stale 1-Wire probe is flagged individually without invalidating the remaining three thermal channels.',
      recommendedInspection:
        'Inspect TEMP-03 1-Wire data line, 4.7 kΩ pull-up resistor, waterproof splice, and probe address registration.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  } else if (temp3Val !== null && temp3Val > thresholds.tempWarnC) {
    alerts.push({
      id: 'ALM-TEMP-003',
      ruleId: 'TEMP-001',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: 'TEMP-03 TEMPERATURE ABOVE CONFIGURED WARNING THRESHOLD',
      severity: temp3Val > thresholds.tempWarnC + 6 ? 'CRITICAL' : 'WARNING',
      sourceComponent: 'TEMP-03 (DS18B20)',
      measurementName: 'Zone C Inner Core Temperature',
      observedValueLabel: `${temp3Val.toFixed(1)} °C (SIMULATED)`,
      configuredThresholdLabel: `${thresholds.tempWarnC.toFixed(1)} °C (Illustrative Demo Threshold)`,
      supportingMeasurement: `TEMP-03 = ${temp3Val.toFixed(1)} °C vs configured ${thresholds.tempWarnC.toFixed(
        1
      )} °C marker`,
      description:
        'Simulated inner-core temperature probe TEMP-03 exceeded the configured UI warning threshold.',
      diagnosticExplanation:
        'Triggered by RULE TEMP-001 using live simulated telemetry from the central BattVision simulation engine. Does not indicate a physical cell fault.',
      recommendedInspection:
        'Inspect the corresponding DS18B20 temperature probe, wiring, thermal contact, and ventilation around inner core banks S5-S6.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  }

  // Live rule-triggered Pack Voltage high / low
  if (telemetry.packVoltage > thresholds.packVoltageHighV) {
    alerts.push({
      id: 'ALM-VOLT-HI',
      ruleId: 'VOLT-001',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: 'PACK VOLTAGE ABOVE CONFIGURED LIMIT (SIMULATED)',
      severity: 'CRITICAL',
      sourceComponent: 'INA226 (SIMULATED)',
      measurementName: 'Pack Bus Voltage',
      observedValueLabel: `${telemetry.packVoltage.toFixed(2)} V (SIMULATED)`,
      configuredThresholdLabel: `> ${thresholds.packVoltageHighV.toFixed(1)} V (Illustrative)`,
      supportingMeasurement: `V_pack = ${telemetry.packVoltage.toFixed(2)} V`,
      description: 'Simulated pack voltage exceeded the configured illustrative upper limit.',
      diagnosticExplanation:
        'Triggered by RULE VOLT-001. Hardware over-voltage cutoff remains the sole responsibility of the independent JK Smart BMS.',
      recommendedInspection:
        'Check charger voltage setpoint, INA226 bus voltage calibration, and series-group cell balance.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  } else if (telemetry.packVoltage < thresholds.packVoltageLowV) {
    alerts.push({
      id: 'ALM-VOLT-LO',
      ruleId: 'VOLT-002',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: 'PACK VOLTAGE BELOW CONFIGURED LIMIT (SIMULATED)',
      severity: 'WARNING',
      sourceComponent: 'INA226 (SIMULATED)',
      measurementName: 'Pack Bus Voltage',
      observedValueLabel: `${telemetry.packVoltage.toFixed(2)} V (SIMULATED)`,
      configuredThresholdLabel: `< ${thresholds.packVoltageLowV.toFixed(1)} V (Illustrative)`,
      supportingMeasurement: `V_pack = ${telemetry.packVoltage.toFixed(2)} V under ${telemetry.packCurrent.toFixed(
        1
      )} A load`,
      description: 'Simulated pack bus voltage sagged below the configured lower threshold.',
      diagnosticExplanation:
        'Triggered by RULE VOLT-002 due to simulated discharge sag or low state of charge.',
      recommendedInspection:
        'Inspect load current draw, busbar interconnect resistance, and individual series-group voltages.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  }

  // Live rule-triggered Current check
  if (Math.abs(telemetry.packCurrent) > thresholds.currentHighA) {
    alerts.push({
      id: 'ALM-CURR-001',
      ruleId: 'CURR-001',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: 'ELEVATED PACK CURRENT ABOVE CONFIGURED DEMO LIMIT',
      severity: 'WARNING',
      sourceComponent: 'ACS758-50B (SIMULATED)',
      measurementName: 'Hall-Effect Pack Current',
      observedValueLabel: `${telemetry.packCurrent.toFixed(2)} A (SIMULATED)`,
      configuredThresholdLabel: `±${thresholds.currentHighA.toFixed(1)} A (Illustrative)`,
      supportingMeasurement: `I_pack = ${telemetry.packCurrent.toFixed(2)} A · P = ${telemetry.power.toFixed(
        1
      )} W`,
      description: 'Simulated discharge current exceeded the configured illustrative monitoring threshold.',
      diagnosticExplanation:
        'Triggered by RULE CURR-001 within the ±50 A nominal ACS758-50B measurement window.',
      recommendedInspection:
        'Verify EV traction load profile, ACS758-50B zero-current offset calibration, and cable thermal rise.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  }

  // Scenario-driven alerts (when active in DEMO mode)
  const activeScenario = telemetry.systemStatus.demoScenario;
  if (activeScenario === 'COMMUNICATION_FAILURE') {
    alerts.push({
      id: 'ALM-COMM-FAIL',
      ruleId: 'COMM-001',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: 'ESP32-S3 ↔ EDGE SBC COMMUNICATION TIMEOUT (DEMO SCENARIO)',
      severity: 'CRITICAL',
      sourceComponent: 'ESP32-S3 / EDGE LINK',
      measurementName: 'Packet Heartbeat',
      observedValueLabel: 'TIMEOUT (SIMULATED)',
      configuredThresholdLabel: '≤ 5 s heartbeat interval',
      supportingMeasurement: 'Demo Scenario: COMMUNICATION FAILURE active',
      description: 'Simulated transport timeout between PCBCupid Glyph ESP32-S3 and Linux SBC.',
      diagnosticExplanation:
        'Generated by the active Demo Scenario to verify critical communication-fault handling. Independent JK BMS safety hardware remains unaffected.',
      recommendedInspection:
        'Check USB/UART cable integrity, ESP32-S3 reset/watchdog logs, and local edge ingestion service status.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  }

  if (activeScenario === 'VOLTAGE_VARIATION' && telemetry.cellDeltaMv > thresholds.cellDeltaWarnMv) {
    alerts.push({
      id: 'ALM-CELL-DV',
      ruleId: 'CELL-001',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: '8S SERIES-GROUP VOLTAGE VARIATION ABOVE DEMO LIMIT',
      severity: 'WARNING',
      sourceComponent: '8S CELL ARRAY (SIMULATED)',
      measurementName: 'Series-Group Spread (ΔV)',
      observedValueLabel: `${telemetry.cellDeltaMv} mV (SIMULATED)`,
      configuredThresholdLabel: `> ${thresholds.cellDeltaWarnMv} mV (Illustrative)`,
      supportingMeasurement: `Simulated 8S spread ΔV = ${telemetry.cellDeltaMv} mV across S1-S8`,
      description: 'Simulated cell-group imbalance scenario triggered RULE CELL-001.',
      diagnosticExplanation:
        'Demonstrates how elevated series-group voltage divergence is flagged for balancing inspection once live JK Smart BMS telemetry is connected.',
      recommendedInspection:
        'Inspect S1-S8 group voltages in Battery Pack Explorer and verify nickel-strip/busbar weld resistance and BMS balancing.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  }

  if (activeScenario === 'DATA_QUALITY_WARNING') {
    alerts.push({
      id: 'ALM-DQ-WARN',
      ruleId: 'DATA-001',
      timestamp: nowIso,
      epochMs: nowEpoch,
      timeLabel,
      title: 'ELEVATED TELEMETRY JITTER / DATA QUALITY WARNING (DEMO)',
      severity: 'WARNING',
      sourceComponent: 'ADS1115 / DATA VALIDATOR',
      measurementName: 'Signal Noise & Freshness Variance',
      observedValueLabel: 'HIGH JITTER (SIMULATED)',
      configuredThresholdLabel: 'Configured data-quality envelope',
      supportingMeasurement: 'Demo Scenario: DATA QUALITY WARNING active',
      description: 'Simulated sensor noise and irregular cadence flagged as a data-quality warning.',
      diagnosticExplanation:
        'Distinguishes measurement/data-quality anomalies from physical battery faults.',
      recommendedInspection:
        'Inspect ADC grounding, shielded cabling around ACS758-50B, and review Data Quality tab in Data Laboratory.',
      dataSource: 'DEMO',
      simulated: true,
      status: 'ACTIVE',
    });
  }

  // Always-honest BMS Not Connected diagnostic alert (true even in DEMO mode!)
  alerts.push({
    id: 'ALM-BMS-001',
    ruleId: 'COMM-001',
    timestamp: nowIso,
    epochMs: nowEpoch,
    timeLabel,
    title: 'BMS DATA UNAVAILABLE - INTERFACE PENDING VERIFICATION',
    severity: 'WARNING',
    sourceComponent: 'JK SMART BMS (B1A8S10P)',
    measurementName: 'BMS Communication Link',
    observedValueLabel: 'NOT CONFIGURED',
    configuredThresholdLabel: 'Verified BMS protocol frame',
    supportingMeasurement: 'ESP32-S3 ↔ JK BMS link status: NOT CONFIGURED',
    description:
      'Physical JK Smart BMS B1A8S10P is not connected; cell-group diagnostics rely on DEMO simulation.',
    diagnosticExplanation:
      'Triggered by RULE COMM-001 / DATA-001. BattVision never fabricates BMS UART/RS485 connectivity.',
    recommendedInspection:
      'Verify exact JK Smart BMS hardware model, pinout, galvanic isolation, and serial protocol before enabling live BMS polling.',
    dataSource: 'DEMO',
    simulated: true,
    status: 'ACTIVE',
  });

  // Illustrative example info alert showing simulated communication monitoring
  alerts.push({
    id: 'ALM-SIM-002',
    ruleId: 'DATA-001',
    timestamp: nowIso,
    epochMs: nowEpoch,
    timeLabel,
    title: 'SIMULATED BENCH ENVIRONMENT - PHYSICAL SENSORS NOT WIRED',
    severity: 'INFO',
    sourceComponent: 'ESP32-S3 / SENSOR NETWORK',
    measurementName: 'Hardware Data Source State',
    observedValueLabel: 'SIMULATED (DEMO)',
    configuredThresholdLabel: 'Live hardware ingestion required for field use',
    supportingMeasurement: 'INA226, ACS758-50B, ADS1115, 4×DS18B20, MPU6050 operating in DEMO',
    description:
      'All sensor readings and diagnostic alerts on this screen are generated from the local simulation service.',
    diagnosticExplanation:
      'Confirms strict separation between demonstration telemetry and live laboratory hardware verification.',
    recommendedInspection:
      'Switch to HARDWARE MODE once the ESP32-S3 and Linux edge computer backend are connected.',
    dataSource: 'DEMO',
    simulated: true,
    status: 'ACTIVE',
  });

  return alerts;
}
