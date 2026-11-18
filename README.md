# BATTVISION - Offline EV Battery Intelligence & Diagnostics Dashboard

An industrial EV battery monitoring, experimentation, and Edge-AI diagnostics workstation built around the **BV-PACK-8S4P** LiFePO4 battery platform (`32 × 32700` cylindrical cells, `25.6 V` nominal, `24 Ah`, `614.4 Wh`, `29.2 V` full charge).

## Target Hardware Architecture

| Subsystem | Specification |
|---|---|
| **Battery Pack** | `BV-PACK-8S4P` - 8S4P LiFePO4 (`32 × 32700` cells, `3.2 V / 6 Ah` per cell, `25.6 V / 24 Ah / 614.4 Wh` pack, `29.2 V` full charge) |
| **Embedded Controller** | PCBCupid Glyph ESP32-S3 |
| **Sensors** | INA226 (I2C), ACS758-50B (`±50 A` nominal → ADS1115 I2C ADC), 4× DS18B20 (1-Wire), MPU6050 6-DOF IMU (I2C) |
| **Battery Management** | JK Smart BMS (`B1A8S10P` - subject to physical verification; independent hardware protection) |
| **Edge Compute** | Linux Single-Board Computer (selection pending) running offline Python acquisition, local SQLite storage & local ML inference |

> **Simulation & Honesty Notice:** Physical hardware and ML models are not yet connected. In `DEMO MODE`, all live values are sourced from one centralized simulation service and visibly labelled as simulated/demo. Switching to `HARDWARE MODE` disables simulated fallbacks and displays unavailable hardware readings honestly (`N/A` / `NOT CONNECTED` / `NOT EVALUATED`).

## Application Modules

1. **Overview (`01`):** Pack cutaway schematic, 5 bench measurement instruments, SoH/RUL/SoC intelligence overview, system health node matrix, and filterable simulated event log.
2. **Battery Pack Explorer (`02`):** Interactive CAD-grade 8S4P 32-cell explorer (`S1-C1`-`S8-C4`), Cell Inspection side drawer, `S1`-`S8` series-group inspector, Cell Group Consistency chart, passive Energy Flow bus, 4-zone illustrative DS18B20 thermal map, and full electrical datasheet.
3. **Live Telemetry (`03`):** Four electrical instruments (Voltage, bipolar `±50 A` Current, `V × I` Power, semicircular SoC estimate), 3 synchronized live oscilloscope charts with display-freeze vs. active-stream buffering, 4× DS18B20 thermal channels with configurable UI warning marker, MPU6050 6-DOF accelerometer/gyroscope (`g` / `m/s²`), planned hardware sources, and 7-column sensor status registry.
4. **Battery Intelligence Centre (`04`):** SoC, SoH (`(Usable / Reference) × 100`), and RUL instruments with expandable methodologies and configurable EoL threshold (`75% / 80% / 85%`), capacity degradation & RUL trajectory charts, Edge AI model status (`MODEL NOT DEPLOYED`), validation metrics (`N/A`), input feature taxonomy, 3-part reliability breakdown, diagnostic insights, and 9-step decoupled ML workflow.
5. **Diagnostics & Alerts (`05`):** 7-card status overview, filterable Active Alerts command panel & Inspection Drawer (Acknowledge / Mark Resolved with preserved history), chronological Event Timeline with CSV export, 10-rule configurable Diagnostic Rule Engine, 8-channel Sensor Network Diagnostics with `TEMP-03` stale isolation test, 5-path Communication Monitor, and bounded System Event Log console.
6. **Data Laboratory (`06`):** 7-tab research environment covering Historical Telemetry Explorer, Experiment Session Registry, Charge/Discharge Analysis (timestamp-integrated `∫ P dt` energy), Capacity Testing Lab, Dataset Manager + CSV Importer with schema mapping & validation, Data Quality Inspector, ML Data Preparation, and Export & Reports (with printable summary).
7. **Edge AI & System Intelligence (`07`):** Interactive 4-layer System Architecture Visualiser with Component Inspector, 9-stage Telemetry Processing Pipeline, ESP32-S3 Acquisition Node, Linux SBC Resource Monitor, Local ML Inference Engine & 8-stage Model Lifecycle, Offline Autonomy status, SQLite Storage overview, Communication Monitor, and Edge System Event Log.
8. **System Configuration (`08`):** Data source mode switch (`DEMO` / `HARDWARE`), load profiles, sampling interval, 6 centralized **Demo Scenarios**, and persisted **Workstation Preferences** (boot animation, reduced motion, compact/comfortable density, default oscilloscope window, presentation mode).

## Demonstration & Responsive Features

- **Presentation Mode:** Click **Presentation** in the top bar (or press `Shift + P`) to hide the sidebar, launch the high-legibility Presentation Overview, and switch modules cleanly across a projector or large monitor.
- **Demo Scenarios (`Demo Controls` drawer):** Trigger `NORMAL OPERATION`, `TEMPERATURE WARNING`, `SENSOR DISCONNECTION`, `COMMUNICATION FAILURE`, `VOLTAGE VARIATION`, or `DATA QUALITY WARNING` across the shared telemetry bus.
- **Responsive Design:** Engineered for ultra-wide desktop (`2560 × 1440`), desktop (`1440 × 900`), laptop (`1366 × 768` / `1280 × 800`), tablet (`1024 × 768` / `768 × 1024`), and smartphone (`430 × 932` down to `320 × 568` with dedicated mobile drawer & bottom quick-nav).

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ (for edge backend)

### Environment Configuration

Copy `.env.example` to `.env` to configure frontend and backend ports/paths:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Target FastAPI backend URL for dashboard |
| `BV_HOST` | `0.0.0.0` | Backend bind host |
| `BV_PORT` | `8000` | Backend bind port |
| `BV_DATABASE_PATH` | `data/telemetry/battvision.db` | Local SQLite database location |
| `BV_MODELS_DIR` | `data/models` | Offline ML model storage path |
| `BV_EXPORTS_DIR` | `data/exports` | Export directory for CSV / JSON reports |

### Install & Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Type-Check & Production Build

```bash
npm run typecheck
npm run build
npm run preview
```

## Offline Edge Backend (Python 3 + FastAPI + SQLite + WebSocket)

The offline edge backend resides in `backend/` and provides validated telemetry ingestion (Telemetry Packet Schema v1.0), SQLite WAL persistence, coulomb-counting SoC estimation, backend diagnostic rule evaluation, WebSocket streaming (`/ws/telemetry`), and single-process static hosting of the built React dashboard (`dist/`).

### Setup & Run Backend

```bash
# Create Python 3.11 virtual environment and install dependencies
cd backend
python3 -m venv .venv   # or: uv venv --python python3.11 .venv
.venv/bin/pip install -r requirements.txt

# Start the offline FastAPI + WebSocket server (also serves dist/ at http://127.0.0.1:8000/)
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### End-to-End Pipeline Test (Simulated ESP32-S3 -> Backend -> SQLite -> WebSocket -> Dashboard)

Without physical hardware connected, validate the full pipeline with the simulated ESP32-S3 packet sender:

```bash
backend/.venv/bin/python backend/tools/simulated_esp32_sender.py --interval 1.0 --count 30
# Optional missing-sensor honesty test (sends TEMP-03 as null, never 0):
backend/.venv/bin/python backend/tools/simulated_esp32_sender.py --interval 1.0 --count 30 --drop-temp3
```

Switch the React dashboard to **HARDWARE MODE** to subscribe to `ws://127.0.0.1:8000/ws/telemetry` and inspect live validated packets stored in `data/telemetry/battvision.db`.

### Automated Backend Verification

```bash
backend/.venv/bin/pytest backend/tests/test_backend.py -v
```

## Production Deployment & Cloud Hosting

BattVision is ready for multiple deployment targets:

| Target | Recommended Platform | Guide / Files |
|---|---|---|
| **Public Web Showcase** | Vercel, Netlify | `vercel.json` (instant 1-click connect from GitHub) |
| **Full-Stack Cloud (Backend + WebSockets + UI)** | Render, Railway, Fly.io | `Dockerfile` (multi-stage build serving API & UI) |
| **Offline Lab Bench / EV Computing** | Linux SBC (Raspberry Pi, Radxa, Orange Pi) | `deploy/setup_sbc.sh` & `deploy/battvision-backend.service` |

For detailed step-by-step guides for all platforms, see **[Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)**.

## Firmware Skeleton, Deployment & Engineering Documentation

- **Comprehensive Deployment Guide:** `docs/deployment/DEPLOYMENT_GUIDE.md`
- **Docker Container:** `Dockerfile` & `.dockerignore`
- **Linux SBC Installer:** `deploy/setup_sbc.sh`
- **Linux SBC systemd Service:** `deploy/battvision-backend.service`
- **ESP32-S3 Firmware Skeleton:** `firmware/esp32/` (PlatformIO skeleton for `PCBCupid Glyph ESP32-S3`; all unverified GPIO pins, I2C addresses, UART baud rates, and BMS wiring are marked `TBD`).
- **Architecture & Contracts:**
  - `docs/architecture/SYSTEM_ARCHITECTURE.md`
  - `docs/api/API_AND_TELEMETRY_SPEC.md`
  - `docs/integration/HARDWARE_AND_DEPLOYMENT_GUIDE.md`

