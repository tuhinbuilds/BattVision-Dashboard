#!/usr/bin/env python3
"""
Simulated ESP32-S3 Telemetry Sender for BattVision.
Streams versioned v1.0 telemetry packets (explicitly tagged source="SIMULATION")
into the local Python Edge Backend to test the complete offline pipeline:

  SIMULATED ESP32 -> PYTHON BACKEND -> SQLITE -> WEBSOCKET -> REACT DASHBOARD

Usage:
  backend/.venv/bin/python backend/tools/simulated_esp32_sender.py --count 30 --interval 1.0
"""
from __future__ import annotations

import argparse
import math
import time
from datetime import datetime, timezone

import httpx


def build_simulated_packet(seq: int, soc_pct: float, drop_temp3: bool = False) -> dict:
    phase = seq * 0.3
    current_a = round(11.8 + math.sin(phase) * 2.1 + math.cos(phase * 0.5) * 0.8, 2)
    cell_base = 3.23 + ((soc_pct - 50.0) / 100.0) * 0.12
    offsets = [0.004, -0.003, 0.005, 0.001, -0.004, 0.002, -0.003, -0.002]
    cell_voltages = [round(cell_base + off - current_a * 0.0083, 3) for off in offsets]
    pack_v = round(sum(cell_voltages), 2)
    power_w = round(pack_v * current_a, 1)

    t_base = 30.8 + math.sin(phase * 0.2) * 0.7
    return {
        "schema_version": "1.0",
        "device_id": "BV-ESP32-SIM-01",
        "sequence": seq,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "SIMULATION",
        "pack_voltage": pack_v,
        "pack_current": current_a,
        "power": power_w,
        "state_of_charge": round(soc_pct, 2),
        "temperatures": {
            "TEMP-01": round(t_base - 0.6, 1),
            "TEMP-02": round(t_base + 0.8, 1),
            "TEMP-03": None if drop_temp3 else round(t_base + 1.1, 1),
            "TEMP-04": round(t_base - 0.3, 1),
        },
        "accelerometer": {
            "x": round(math.sin(phase * 2.5) * 0.08, 3),
            "y": round(math.cos(phase * 2.1) * 0.06, 3),
            "z": round(1.0 + math.sin(phase * 3.1) * 0.04, 3),
        },
        "gyroscope": {
            "x": round(math.sin(phase * 1.7) * 1.4, 2),
            "y": round(math.cos(phase * 1.5) * 1.1, 2),
            "z": round(math.sin(phase * 1.1) * 0.8, 2),
        },
        "cell_voltages": cell_voltages,
        "sensor_status": {
            "INA226": "SIMULATED",
            "ACS758-50B": "SIMULATED",
            "ADS1115": "SIMULATED",
            "TEMP-01": "SIMULATED",
            "TEMP-02": "SIMULATED",
            "TEMP-03": "UNAVAILABLE" if drop_temp3 else "SIMULATED",
            "TEMP-04": "SIMULATED",
            "MPU6050": "SIMULATED",
        },
        "validity": {
            "pack_voltage": True,
            "pack_current": True,
            "TEMP-03": not drop_temp3,
        },
        "error_flags": ["TEMP-03_MISSING_SIM"] if drop_temp3 else [],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="BattVision Simulated ESP32-S3 Telemetry Sender")
    parser.add_argument("--url", default="http://127.0.0.1:8000/api/v1/telemetry/ingest")
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--count", type=int, default=0, help="0 = run continuously")
    parser.add_argument("--start-seq", type=int, default=1)
    parser.add_argument("--drop-temp3", action="store_true", help="Simulate missing TEMP-03 (null)")
    args = parser.parse_args()

    seq = args.start_seq
    soc = 77.5
    sent = 0
    print(f"[BV-ESP32-SIM] Streaming SIMULATION packets to {args.url} every {args.interval}s")

    with httpx.Client(timeout=5.0) as client:
        while args.count == 0 or sent < args.count:
            pkt = build_simulated_packet(seq, soc, drop_temp3=args.drop_temp3)
            try:
                resp = client.post(args.url, json=pkt)
                resp.raise_for_status()
                body = resp.json()
                print(
                    f"[seq={seq}] V={pkt['pack_voltage']}V I={pkt['pack_current']}A "
                    f"P={pkt['power']}W -> accepted={body.get('accepted')} id={body.get('record_id')}"
                )
            except Exception as exc:
                print(f"[seq={seq}] POST failed: {exc}")

            seq += 1
            sent += 1
            soc = max(15.0, soc - 0.03)
            if args.count == 0 or sent < args.count:
                time.sleep(args.interval)


if __name__ == "__main__":
    main()
