# BattVision Offline Edge System Architecture

## 1. End-to-End Offline Data Flow

```text
PHYSICAL SENSORS (BV-PACK-8S4P LiFePO4 · 32x32700 · 25.6V / 24Ah / 614.4Wh)
  ↓
PCBCupid Glyph ESP32-S3 Firmware (firmware/esp32/)
  ↓  Newline-delimited JSON v1.0 over configurable local serial/network transport
Python FastAPI Edge Backend (backend/app/)
  ├─ Telemetry Ingestion & Sequence Validator (app/telemetry/ingestion.py)
  ├─ Coulomb-Counting SoC Service (app/telemetry/soc_service.py)
  ├─ Configurable Diagnostic Rule Engine (app/diagnostics/rule_engine.py)
  ├─ Local SQLite Database (data/telemetry/battvision.db · WAL mode)
  ├─ Offline Edge ML Inference Runtime (app/ml/inference_engine.py - MODEL_NOT_DEPLOYED)
  └─ Local REST API + WebSocket Hub (/api/v1/* & /ws/telemetry)
  ↓
React + TypeScript Industrial Workstation Dashboard (src/ -> dist/)
```

## 2. Implementation Status Matrix

| Component | Status | Notes |
|---|---|---|
| React + TS Dashboard (8 modules + Presentation + Demo) | **Implemented** | Verified across `2560x1440` → `320x568` |
| Python FastAPI Backend + WebSocket Hub | **Implemented** | Tested with automated pytest suite |
| SQLite Local Persistence (9 tables, schema v1) | **Implemented** | Offline WAL database in `data/telemetry/` |
| Simulated ESP32 Telemetry Sender | **Implemented** | `backend/tools/simulated_esp32_sender.py` |
| Coulomb-Counting SoC Service | **Implemented (Uncalibrated)** | Requires full-charge / lab calibration |
| Backend Diagnostic Rule Engine | **Implemented** | Marks missing inputs `NOT_EVALUATED` |
| ESP32-S3 Firmware Architecture | **Prepared Skeleton** | GPIO pins, I2C addresses & calibration `TBD` |
| JK Smart BMS (`B1A8S10P`) Integration | **Pending Verification** | Protocol, pinout & isolation unverified |
| Linux Single-Board Computer Selection | **Pending Selection** | Backend is portable across Linux SBCs |
| Edge ML SoH / RUL Model | **Not Deployed** | Requires experimental ageing datasets |

## 3. Safety & Electrical Engineering Boundaries

- **JK Smart BMS (`B1A8S10P`)** remains the sole independent battery protection system.
- BattVision software never issues charge/discharge commands, never alters BMS protection settings, and never bypasses hardware interlocks.
- Never connect raw `25.6 V / 29.2 V` pack voltage directly to ADS1115 or ESP32-S3 inputs.
- ACS758-50B has a `±50 A` nominal measurement range and does not cover a 100 A BMS rating.
- XL4015 CC-CV modules are not a complete 8S LiFePO4 balance charger.
