import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEMO_SCENARIOS, SIMULATION_PROFILES } from '../config/systemConfig';
import {
  BatteryTelemetry,
  DataSourceMode,
  DemoScenarioId,
  DiagnosticRuleCheck,
  EventSeverity,
  SimulationProfile,
  SystemEvent,
  TelemetryHistoryPoint,
} from '../types/telemetry';
import {
  BackendHealthSnapshot,
  BackendTelemetryPayload,
  fetchBackendHealth,
  fetchBackendHistory,
  getBackendWsUrl,
  mapBackendPayloadToTelemetry,
} from './backendApiService';
import {
  buildSensorChannelStatuses,
  buildUnavailableHardwareSensors,
  buildUnavailableHardwareSeriesGroups,
  createInitialSimulationState,
  evaluateDiagnostics,
  formatTimeShort,
  SimulationInternalState,
  stepSimulation,
} from './simulationService';
import {
  SensorChannelStatus,
  SeriesGroup,
  TemperatureSensor,
} from '../types/telemetry';

const HISTORY_LIMIT = 900; // Bounded 15-minute ring buffer at 1 Hz
const INITIAL_HISTORY_POINTS = 60;

export interface SessionTelemetryStats {
  minVoltage: number;
  maxVoltage: number;
  peakCurrentAbs: number;
  peakPowerAbs: number;
}

interface TelemetryContextValue {
  telemetry: BatteryTelemetry;
  history: TelemetryHistoryPoint[];
  events: SystemEvent[];
  diagnostics: DiagnosticRuleCheck[];
  dataSourceMode: DataSourceMode;
  simulationProfile: SimulationProfile;
  demoScenario: DemoScenarioId;
  isPaused: boolean;
  sampleRateMs: number;
  sessionStartMs: number;
  sampleCount: number;
  setSimulationProfile: (profile: SimulationProfile) => void;
  setDemoScenario: (scenario: DemoScenarioId) => void;
  togglePaused: () => void;
  setSampleRateMs: (ms: number) => void;
  setDataSourceMode: (mode: DataSourceMode) => void;
  requestDataSourceMode: (mode: DataSourceMode) => { ok: boolean; message: string };
  startDemoStream: () => void;
  activeSeriesGroups: SeriesGroup[];
  activeTemperatureSensors: TemperatureSensor[];
  activeSensorStatuses: SensorChannelStatus[];
  sessionStats: SessionTelemetryStats;
  hardwareConnected: boolean;
  backendHealth: BackendHealthSnapshot | null;
  backendPacketSeq: number | null;
  resetSimulationSession: () => void;
  logEvent: (code: string, subsystem: string, message: string, severity?: EventSeverity) => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

function toHistoryPoint(frame: BatteryTelemetry, ts: number): TelemetryHistoryPoint {
  return {
    epochMs: ts,
    timeLabel: formatTimeShort(ts),
    packVoltage: frame.packVoltage,
    packCurrent: frame.packCurrent,
    power: frame.power,
    temperature: frame.temperature,
    stateOfCharge: frame.stateOfCharge,
    vibrationRms: frame.vibration.rms,
    cellDeltaMv: frame.cellDeltaMv,
    temp1: frame.cellTemperatures[0]?.temperature ?? frame.temperature,
    temp2: frame.cellTemperatures[1]?.temperature ?? frame.temperature,
    temp3: frame.cellTemperatures[2]?.temperature ?? frame.temperature,
    temp4: frame.cellTemperatures[3]?.temperature ?? frame.temperature,
    accXG: frame.accelerometer.xG,
    accYG: frame.accelerometer.yG,
    accZG: frame.accelerometer.zG,
    gyroXDps: frame.gyroscope.xDps,
    gyroYDps: frame.gyroscope.yDps,
    gyroZDps: frame.gyroscope.zDps,
  };
}

function computeStatsFromHistory(history: TelemetryHistoryPoint[]): SessionTelemetryStats {
  if (!history.length) {
    return { minVoltage: 25.6, maxVoltage: 25.6, peakCurrentAbs: 0, peakPowerAbs: 0 };
  }
  let minVoltage = Infinity;
  let maxVoltage = -Infinity;
  let peakCurrentAbs = 0;
  let peakPowerAbs = 0;
  for (const pt of history) {
    if (pt.packVoltage < minVoltage) minVoltage = pt.packVoltage;
    if (pt.packVoltage > maxVoltage) maxVoltage = pt.packVoltage;
    const absI = Math.abs(pt.packCurrent);
    if (absI > peakCurrentAbs) peakCurrentAbs = absI;
    const absP = Math.abs(pt.power);
    if (absP > peakPowerAbs) peakPowerAbs = absP;
  }
  return { minVoltage, maxVoltage, peakCurrentAbs, peakPowerAbs };
}

function seedInitialSession(profile: SimulationProfile): {
  simState: SimulationInternalState;
  latestFrame: BatteryTelemetry;
  history: TelemetryHistoryPoint[];
  events: SystemEvent[];
  sessionStartMs: number;
  stats: SessionTelemetryStats;
} {
  const now = Date.now();
  let simState = createInitialSimulationState(profile);
  const history: TelemetryHistoryPoint[] = [];
  let latestFrame: BatteryTelemetry | null = null;

  for (let i = INITIAL_HISTORY_POINTS; i >= 0; i--) {
    const ts = now - i * 1000;
    const stepped = stepSimulation(simState, profile, 1.0, ts, false);
    simState = stepped.nextState;
    latestFrame = stepped.frame;
    history.push(toHistoryPoint(stepped.frame, ts));
  }

  const startTs = now - 4000;
  const events: SystemEvent[] = [
    {
      id: 'evt-init-4',
      timestamp: new Date(now - 500).toISOString(),
      timeLabel: formatTimeShort(now - 500),
      code: 'ML-000',
      subsystem: 'EDGE AI',
      message: 'Diagnostic engine awaiting model connection.',
      severity: 'WARNING',
      simulated: true,
    },
    {
      id: 'evt-init-3',
      timestamp: new Date(now - 1500).toISOString(),
      timeLabel: formatTimeShort(now - 1500),
      code: 'CFG-8S4P',
      subsystem: 'PACK SPEC',
      message: 'Battery pack configuration loaded (BV-PACK-8S4P · 32×32700 LiFePO4).',
      severity: 'INFO',
      simulated: true,
    },
    {
      id: 'evt-init-2',
      timestamp: new Date(now - 2600).toISOString(),
      timeLabel: formatTimeShort(now - 2600),
      code: 'SIM-101',
      subsystem: 'TELEMETRY',
      message: 'Simulation data stream started (DEMO DATA mode).',
      severity: 'NOMINAL',
      simulated: true,
    },
    {
      id: 'evt-init-1',
      timestamp: new Date(startTs).toISOString(),
      timeLabel: formatTimeShort(startTs),
      code: 'SYS-001',
      subsystem: 'SYSTEM',
      message: 'Monitoring interface initialised.',
      severity: 'INFO',
      simulated: true,
    },
  ];

  return {
    simState,
    latestFrame: latestFrame!,
    history,
    events,
    sessionStartMs: startTs,
    stats: computeStatsFromHistory(history),
  };
}

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useMemo(() => seedInitialSession('NOMINAL_DRIVE'), []);

  const simStateRef = useRef<SimulationInternalState>(initial.simState);
  const [telemetry, setTelemetry] = useState<BatteryTelemetry>(initial.latestFrame);
  const [history, setHistory] = useState<TelemetryHistoryPoint[]>(initial.history);
  const [sessionStats, setSessionStats] = useState<SessionTelemetryStats>(initial.stats);
  const [events, setEvents] = useState<SystemEvent[]>(initial.events);
  const [dataSourceMode, setDataSourceModeState] = useState<DataSourceMode>('DEMO');
  const [backendHealth, setBackendHealth] = useState<BackendHealthSnapshot | null>(null);
  const [backendTelemetry, setBackendTelemetry] = useState<BatteryTelemetry | null>(null);
  const [backendHistory, setBackendHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [backendPacketSeq, setBackendPacketSeq] = useState<number | null>(null);
  const hardwareConnected = Boolean(backendHealth?.reachable && backendTelemetry !== null);
  const [simulationProfile, setSimulationProfileState] = useState<SimulationProfile>('NOMINAL_DRIVE');
  const [demoScenario, setDemoScenarioState] = useState<DemoScenarioId>('NORMAL_OPERATION');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sampleRateMs, setSampleRateMsState] = useState<number>(1000);
  const [sessionStartMs, setSessionStartMs] = useState<number>(initial.sessionStartMs);
  const [sampleCount, setSampleCount] = useState<number>(INITIAL_HISTORY_POINTS + 1);

  const logEvent = useCallback(
    (code: string, subsystem: string, message: string, severity: EventSeverity = 'INFO') => {
      const now = Date.now();
      const entry: SystemEvent = {
        id: `evt-${now}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(now).toISOString(),
        timeLabel: formatTimeShort(now),
        code,
        subsystem,
        message,
        severity,
        simulated: true,
      };
      setEvents((prev) => [entry, ...prev].slice(0, 50));
    },
    []
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (isPaused) return;
      const now = Date.now();
      const stepped = stepSimulation(
        simStateRef.current,
        simulationProfile,
        sampleRateMs / 1000,
        now,
        false,
        demoScenario
      );
      simStateRef.current = stepped.nextState;
      setTelemetry(stepped.frame);
      setSampleCount((c) => c + 1);
      setSessionStats((prev) => ({
        minVoltage: Math.min(prev.minVoltage, stepped.frame.packVoltage),
        maxVoltage: Math.max(prev.maxVoltage, stepped.frame.packVoltage),
        peakCurrentAbs: Math.max(prev.peakCurrentAbs, Math.abs(stepped.frame.packCurrent)),
        peakPowerAbs: Math.max(prev.peakPowerAbs, Math.abs(stepped.frame.power)),
      }));
      setHistory((prev) => {
        const nextPoint = toHistoryPoint(stepped.frame, now);
        const updated = [...prev, nextPoint];
        return updated.length > HISTORY_LIMIT
          ? updated.slice(updated.length - HISTORY_LIMIT)
          : updated;
      });
    }, sampleRateMs);

    return () => window.clearInterval(interval);
  }, [isPaused, sampleRateMs, simulationProfile, demoScenario]);

  const setDemoScenario = useCallback(
    (scenario: DemoScenarioId) => {
      if (dataSourceMode !== 'DEMO') return;
      setDemoScenarioState(scenario);
      const meta = DEMO_SCENARIOS[scenario];
      // Step immediately so the UI reflects the scenario right away
      const now = Date.now();
      const stepped = stepSimulation(
        simStateRef.current,
        simulationProfile,
        sampleRateMs / 1000,
        now,
        false,
        scenario
      );
      simStateRef.current = stepped.nextState;
      setTelemetry(stepped.frame);
      logEvent(
        'SCN-001',
        'DEMO SCENARIO',
        `Active demo scenario set to ${meta.label.toUpperCase()}: ${meta.description}`,
        meta.severityTag === 'CRITICAL'
          ? 'ALERT'
          : meta.severityTag === 'WARNING'
          ? 'WARNING'
          : 'NOMINAL'
      );
    },
    [dataSourceMode, simulationProfile, sampleRateMs, logEvent]
  );

  const setSimulationProfile = useCallback(
    (profile: SimulationProfile) => {
      setSimulationProfileState(profile);
      logEvent(
        'SIM-204',
        'SIMULATOR',
        `Load profile switched to ${SIMULATION_PROFILES[profile].label}.`,
        profile === 'HIGH_LOAD' ? 'WARNING' : 'INFO'
      );
    },
    [logEvent]
  );

  const togglePaused = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      logEvent(
        next ? 'SIM-301' : 'SIM-302',
        'TELEMETRY',
        next ? 'Simulation stream paused by operator.' : 'Simulation stream resumed.',
        'INFO'
      );
      return next;
    });
  }, [logEvent]);

  const setSampleRateMs = useCallback(
    (ms: number) => {
      setSampleRateMsState(ms);
      logEvent(
        'CFG-112',
        'DAQ',
        `Simulated sampling interval adjusted to ${ms} ms (${(1000 / ms).toFixed(1)} Hz).`,
        'INFO'
      );
    },
    [logEvent]
  );

  const setDataSourceMode = useCallback(
    (mode: DataSourceMode) => {
      setDataSourceModeState(mode);
      if (mode === 'HARDWARE') {
        logEvent(
          backendHealth?.reachable ? 'HW-200' : 'HW-404',
          'HARDWARE',
          backendHealth?.reachable
            ? 'Switched to HARDWARE mode - subscribing to local Python Edge Backend WebSocket (/ws/telemetry).'
            : 'Switched to HARDWARE mode - backend/BMS not connected; unavailable measurements displayed honestly without simulation fallback.',
          backendHealth?.reachable ? 'INFO' : 'WARNING'
        );
      } else {
        logEvent(
          'SIM-102',
          'TELEMETRY',
          'Switched to DEMO mode - centralized 8S4P simulation stream active.',
          'NOMINAL'
        );
      }
    },
    [logEvent, backendHealth?.reachable]
  );

  const requestDataSourceMode = useCallback(
    (mode: DataSourceMode): { ok: boolean; message: string } => {
      setDataSourceMode(mode);
      if (mode === 'DEMO') {
        return { ok: true, message: 'Simulation DEMO mode is active.' };
      }
      if (backendHealth?.reachable) {
        return {
          ok: true,
          message:
            'HARDWARE mode active: connected to local Python Edge Backend (FastAPI + SQLite + WebSocket). Missing sensors/BMS cells remain explicitly UNAVAILABLE.',
        };
      }
      return {
        ok: true,
        message:
          'HARDWARE mode active: Python Edge Backend not reachable. All hardware readings are explicitly shown as UNAVAILABLE (no fallback to simulated data).',
      };
    },
    [setDataSourceMode, backendHealth?.reachable]
  );

  const unavailableGroups = useMemo(() => buildUnavailableHardwareSeriesGroups(), []);
  const unavailableSensors = useMemo(() => buildUnavailableHardwareSensors(), []);
  const hardwareSensorStatuses = useMemo(
    () => buildSensorChannelStatuses('HARDWARE', null),
    []
  );

  // Poll local Python Edge Backend health cleanly (zero console spam if backend is stopped)
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const health = await fetchBackendHealth();
      if (active) setBackendHealth(health);
    };
    poll();
    const timer = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  // Connect live WebSocket + hydrate SQLite history when in HARDWARE mode and backend is reachable
  useEffect(() => {
    if (dataSourceMode !== 'HARDWARE' || !backendHealth?.reachable) {
      return;
    }
    let closed = false;
    let ws: WebSocket | null = null;

    fetchBackendHistory(60).then((records) => {
      if (closed || !records.length) return;
      const mapped = records.map(mapBackendPayloadToTelemetry);
      setBackendHistory(mapped.map((m) => m.historyPoint));
      setBackendTelemetry(mapped[mapped.length - 1].frame);
      setBackendPacketSeq(records[records.length - 1].sequence);
    });

    try {
      ws = new WebSocket(getBackendWsUrl());
      ws.onmessage = (evt) => {
        try {
          const envelope = JSON.parse(evt.data);
          if (envelope.event === 'telemetry' && envelope.data) {
            const payload = envelope.data as BackendTelemetryPayload;
            const { frame, historyPoint } = mapBackendPayloadToTelemetry(payload);
            setBackendTelemetry(frame);
            setBackendPacketSeq(payload.sequence);
            setBackendHistory((prev) => {
              const next = [...prev, historyPoint];
              return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
            });
          }
        } catch {
          // ignore malformed ws frame
        }
      };
    } catch {
      // ignore ws connection errors cleanly
    }

    return () => {
      closed = true;
      if (ws && ws.readyState <= WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [dataSourceMode, backendHealth?.reachable]);

  const activeSeriesGroups = useMemo(() => {
    if (dataSourceMode === 'DEMO') return telemetry.seriesGroups;
    if (backendTelemetry) return backendTelemetry.seriesGroups;
    return unavailableGroups;
  }, [dataSourceMode, telemetry.seriesGroups, backendTelemetry, unavailableGroups]);

  const activeTemperatureSensors = useMemo(() => {
    if (dataSourceMode === 'DEMO') return telemetry.temperatureSensors;
    if (backendTelemetry) return backendTelemetry.temperatureSensors;
    return unavailableSensors;
  }, [dataSourceMode, telemetry.temperatureSensors, backendTelemetry, unavailableSensors]);

  const activeSensorStatuses = useMemo(() => {
    if (dataSourceMode === 'DEMO') return telemetry.sensorStatuses;
    if (backendTelemetry) return backendTelemetry.sensorStatuses;
    return hardwareSensorStatuses;
  }, [dataSourceMode, telemetry.sensorStatuses, backendTelemetry, hardwareSensorStatuses]);

  const exposedTelemetry =
    dataSourceMode === 'HARDWARE' && backendTelemetry ? backendTelemetry : telemetry;
  const exposedHistory =
    dataSourceMode === 'HARDWARE' ? backendHistory : history;

  const startDemoStream = useCallback(() => {
    setDataSourceModeState('DEMO');
    setIsPaused(false);
    logEvent('SIM-100', 'TELEMETRY', 'Demo telemetry stream started by operator.', 'NOMINAL');
  }, [logEvent]);

  const resetSimulationSession = useCallback(() => {
    const fresh = seedInitialSession(simulationProfile);
    simStateRef.current = fresh.simState;
    setTelemetry(fresh.latestFrame);
    setHistory(fresh.history);
    setSessionStats(fresh.stats);
    setEvents(fresh.events);
    setSessionStartMs(fresh.sessionStartMs);
    setSampleCount(INITIAL_HISTORY_POINTS + 1);
    setDemoScenarioState('NORMAL_OPERATION');
    setIsPaused(false);
  }, [simulationProfile]);

  const diagnostics = useMemo(() => evaluateDiagnostics(telemetry), [telemetry]);

  const value = useMemo<TelemetryContextValue>(
    () => ({
      telemetry: exposedTelemetry,
      history: exposedHistory,
      events,
      diagnostics,
      dataSourceMode,
      simulationProfile,
      demoScenario,
      isPaused,
      sampleRateMs,
      sessionStartMs,
      sampleCount,
      setSimulationProfile,
      setDemoScenario,
      togglePaused,
      setSampleRateMs,
      setDataSourceMode,
      requestDataSourceMode,
      startDemoStream,
      activeSeriesGroups,
      activeTemperatureSensors,
      activeSensorStatuses,
      sessionStats,
      hardwareConnected,
      backendHealth,
      backendPacketSeq,
      resetSimulationSession,
      logEvent,
    }),
    [
      exposedTelemetry,
      exposedHistory,
      events,
      diagnostics,
      dataSourceMode,
      simulationProfile,
      demoScenario,
      isPaused,
      sampleRateMs,
      sessionStartMs,
      sampleCount,
      setSimulationProfile,
      setDemoScenario,
      togglePaused,
      setSampleRateMs,
      setDataSourceMode,
      requestDataSourceMode,
      startDemoStream,
      activeSeriesGroups,
      activeTemperatureSensors,
      activeSensorStatuses,
      sessionStats,
      hardwareConnected,
      backendHealth,
      backendPacketSeq,
      resetSimulationSession,
      logEvent,
    ]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
};

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry must be used inside TelemetryProvider');
  }
  return ctx;
}
