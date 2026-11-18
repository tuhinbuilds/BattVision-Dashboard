# BattVision Hardware Integration, Testing & Offline Deployment Guide

## 1. Local Development & Full Pipeline Test (No Physical Battery Required)

### Terminal 1 - Start Python Edge Backend
```bash
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Terminal 2 - Stream Simulated ESP32-S3 Packets into Backend
```bash
backend/.venv/bin/python backend/tools/simulated_esp32_sender.py --interval 1.0
```
To test missing probe handling (`TEMP-03 = null`), add `--drop-temp3`.

### Terminal 3 - Start React Dashboard (or open `http://localhost:8000` after `npm run build`)
```bash
npm run dev
```
Switch the dashboard mode selector to **LIVE HARDWARE / BACKEND** to observe real packets flowing through:
`SIMULATED ESP32 -> PYTHON BACKEND -> SQLITE -> WEBSOCKET -> REACT DASHBOARD`.

## 2. Automated Backend Tests
```bash
backend/.venv/bin/pytest backend/tests/test_backend.py -v
```

## 3. Single-Process Offline Linux SBC Deployment
1. Build frontend static assets: `npm run build` (outputs to `dist/`).
2. FastAPI automatically serves `dist/` at `/` when present, so one `uvicorn` process hosts both the API/WebSocket and offline web dashboard with zero internet access.
3. Install `deploy/battvision-backend.service` as a `systemd` unit on the chosen Linux SBC.

## 4. Physical Hardware Integration Checklist (Before Connecting BV-PACK-8S4P)
- [ ] Verify PCBCupid Glyph ESP32-S3 exact GPIO pinout and update `firmware/esp32/include/board_config.h`.
- [ ] Run I2C bus scanner on low-voltage 3.3 V bench supply to verify INA226, ADS1115, and MPU6050 addresses.
- [ ] Verify voltage divider & TVS/clamp protection before connecting pack voltage to INA226/ADS1115 (never feed 29.2 V directly into ADC inputs).
- [ ] Measure ACS758-50B 0 A quiescent offset and sensitivity under regulated supply; confirm current limit stays within ±50 A nominal.
- [ ] Register all four DS18B20 64-bit ROM addresses (`TEMP-01`..`TEMP-04`) on 1-Wire bus with 4.7 kΩ pull-up.
- [ ] Verify physical JK Smart BMS (`B1A8S10P`) manual, pinout, and galvanic isolation before enabling BMS serial/RS485/BLE polling.
- [ ] Confirm independent JK BMS over-voltage, under-voltage, over-current, and over-temperature cutoffs operate independently of the ESP32-S3 and Linux SBC.
