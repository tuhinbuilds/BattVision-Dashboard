# BattVision Local REST API & Telemetry Packet v1.0 Specification

## 1. Telemetry Packet v1.0 Contract

Missing or disconnected sensor readings **MUST** be `null` (never `0`).

```json
{
  "schema_version": "1.0",
  "device_id": "BV-ESP32-01",
  "sequence": 1024,
  "timestamp": "2026-11-18T03:40:00Z",
  "source": "SIMULATION",
  "pack_voltage": 25.62,
  "pack_current": 11.84,
  "power": 303.3,
  "state_of_charge": 77.2,
  "temperatures": {
    "TEMP-01": 30.2,
    "TEMP-02": 31.6,
    "TEMP-03": null,
    "TEMP-04": 30.5
  },
  "accelerometer": { "x": 0.04, "y": -0.02, "z": 1.01 },
  "gyroscope": { "x": 0.8, "y": -0.5, "z": 0.2 },
  "sensor_status": { "TEMP-03": "UNAVAILABLE" },
  "validity": { "TEMP-03": false }
}
```

Valid `source` values: `SIMULATION`, `SERIAL_HARDWARE`, `NETWORK_HARDWARE`, `IMPORTED_DATA`.

## 2. REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Actual backend, SQLite, freshness, BMS, and ML status |
| `GET` | `/api/v1/status` | Full system status, 8S4P specs, OS metrics, SoC/SoH/RUL, ML |
| `POST` | `/api/v1/telemetry/ingest` | Validate & store incoming v1.0 packet + broadcast via WS |
| `GET` | `/api/v1/telemetry/latest` | Latest telemetry snapshot & freshness state |
| `GET` | `/api/v1/telemetry/history?limit=120` | Bounded historical query (`1..900`), optional `source` & `since` |
| `GET` | `/api/v1/sensors` | Individual statuses for INA226, ACS758-50B, ADS1115, TEMP-01..04, MPU6050 |
| `GET` | `/api/v1/communication` | ESP32 transport, JK BMS adapter, and WebSocket client status |
| `GET` | `/api/v1/diagnostics/events` | Current backend rule evaluations + stored diagnostic events |
| `GET/POST` | `/api/v1/experiments` | List or create SQLite experiment sessions |
| `GET/POST` | `/api/v1/capacity-tests` | List or record capacity tests with SoH evaluation |
| `GET` | `/api/v1/ml/status` | Edge ML model registry & deployment status |
| `GET` | `/api/v1/logs` | Bounded structured backend log entries |

## 3. WebSocket Endpoint

- `ws://<host>:8000/ws/telemetry`
- Server pushes JSON envelopes: `{"event": "backend_status" | "telemetry" | "diagnostic_alert", "data": {...}}`.

## 4. SQLite Schema (`schema_migrations` v1)

Tables: `telemetry_records`, `sensor_status`, `diagnostic_events`, `experiment_sessions`, `capacity_tests`, `dataset_metadata`, `model_metadata`, `inference_records`, `system_events`.
