"""REST API and WebSocket routes for BattVision Offline Edge Backend."""
from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import DB_SCHEMA_VERSION, get_db
from app.database.models import (
    CapacityTestORM,
    DiagnosticEventORM,
    ExperimentSessionORM,
    TelemetryRecordORM,
)
from app.schemas.telemetry import (
    CapacityTestCreateSchema,
    ExperimentCreateSchema,
    TelemetryPacketV1,
)
from app.services.state_store import state_store
from app.utils.logging_config import emit_log, log_buffer

router = APIRouter()


@router.get("/api/v1/health")
def get_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    total_records = db.query(func.count(TelemetryRecordORM.id)).scalar() or 0
    return {
        "status": "OK",
        "system_id": settings.system_id,
        "api_version": settings.api_version,
        "schema_version": settings.schema_version,
        "db_schema_version": DB_SCHEMA_VERSION,
        "database_connected": True,
        "database_path": str(settings.database_path),
        "telemetry_records_count": total_records,
        "active_source": (
            state_store.ingestion.active_source.value
            if state_store.ingestion.active_source
            else None
        ),
        "freshness": state_store.ingestion.freshness_state(),
        "freshness_age_seconds": state_store.ingestion.freshness_age_seconds(),
        "websocket_clients": state_store.ws_hub.client_count,
        "ml_status": state_store.ml_engine.get_status()["status"],
        "bms_status": state_store.bms_adapter.get_status()["status"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/api/v1/status")
def get_system_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    total_records = db.query(func.count(TelemetryRecordORM.id)).scalar() or 0
    validated_caps = (
        db.query(func.count(CapacityTestORM.test_id))
        .filter(CapacityTestORM.validation_status == "VALIDATED")
        .scalar()
        or 0
    )
    return {
        "system_id": settings.system_id,
        "battery_spec": asdict(settings.battery),
        "hardware_config": asdict(settings.hardware),
        "active_source": (
            state_store.ingestion.active_source.value
            if state_store.ingestion.active_source
            else "NONE"
        ),
        "freshness": state_store.ingestion.freshness_state(),
        "freshness_age_seconds": state_store.ingestion.freshness_age_seconds(),
        "ingestion_stats": {
            "accepted": state_store.ingestion.accepted_count,
            "rejected": state_store.ingestion.rejected_count,
            "duplicates": state_store.ingestion.duplicate_count,
            "sequence_gaps": state_store.ingestion.sequence_gap_count,
        },
        "database": {
            "engine": "SQLite",
            "connected": True,
            "schema_version": DB_SCHEMA_VERSION,
            "telemetry_records": total_records,
            "validated_capacity_tests": validated_caps,
        },
        "bms": state_store.bms_adapter.get_status(),
        "edge_metrics": state_store.edge_metrics.read_metrics(),
        "soc": asdict(state_store.soc_service.snapshot()),
        "soh": state_store.soh_service.evaluate_from_capacity_test(
            measured_usable_capacity_ah=None,
            reference_capacity_ah=settings.battery.pack_nominal_capacity_ah,
        ),
        "rul": state_store.rul_service.evaluate(
            validated_ageing_records=validated_caps,
            model_deployed=False,
        ),
        "ml": state_store.ml_engine.get_status(),
    }


@router.post("/api/v1/telemetry/ingest")
async def ingest_telemetry(
    packet: TelemetryPacketV1,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    res = state_store.ingestion.ingest_packet(packet, db)
    if res.duplicate:
        return {
            "accepted": False,
            "duplicate": True,
            "warnings": res.validation_warnings,
        }

    if res.snapshot is not None:
        await state_store.ws_hub.broadcast("telemetry", res.snapshot)
    for tr in res.triggered_rules:
        await state_store.ws_hub.broadcast("diagnostic_alert", asdict(tr))

    return {
        "accepted": True,
        "record_id": res.record_id,
        "sequence": packet.sequence,
        "source": packet.source.value,
        "sequence_gap": res.sequence_gap,
        "warnings": res.validation_warnings,
        "triggered_rules": len(res.triggered_rules),
    }


@router.get("/api/v1/telemetry/latest")
def get_latest_telemetry() -> Dict[str, Any]:
    if state_store.ingestion.last_snapshot is None:
        return {
            "available": False,
            "freshness": "OFFLINE",
            "active_source": None,
            "data": None,
            "message": "No telemetry packets received yet.",
        }
    snap = dict(state_store.ingestion.last_snapshot)
    snap["freshness"] = state_store.ingestion.freshness_state()
    snap["freshness_age_seconds"] = state_store.ingestion.freshness_age_seconds()
    return {
        "available": True,
        "freshness": snap["freshness"],
        "active_source": snap["source"],
        "data": snap,
    }


@router.get("/api/v1/telemetry/history")
def get_telemetry_history(
    limit: int = Query(default=120, ge=1, le=900),
    source: Optional[str] = Query(default=None),
    since: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    q = db.query(TelemetryRecordORM)
    if source:
        q = q.filter(TelemetryRecordORM.source == source.upper())
    if since:
        q = q.filter(TelemetryRecordORM.timestamp >= since)

    rows = q.order_by(desc(TelemetryRecordORM.id)).limit(limit).all()
    rows.reverse()

    items = [
        {
            "id": r.id,
            "device_id": r.device_id,
            "sequence": r.sequence,
            "timestamp": r.timestamp,
            "source": r.source,
            "pack_voltage": r.pack_voltage,
            "pack_current": r.pack_current,
            "power": r.power,
            "state_of_charge": r.soc_estimate,
            "temperatures": {
                "TEMP-01": r.temp_01,
                "TEMP-02": r.temp_02,
                "TEMP-03": r.temp_03,
                "TEMP-04": r.temp_04,
            },
            "accelerometer": {"x": r.accel_x, "y": r.accel_y, "z": r.accel_z},
            "gyroscope": {"x": r.gyro_x, "y": r.gyro_y, "z": r.gyro_z},
        }
        for r in rows
    ]

    return {
        "record_count": len(items),
        "limit": limit,
        "source_filter": source,
        "time_range": {
            "start": items[0]["timestamp"] if items else None,
            "end": items[-1]["timestamp"] if items else None,
        },
        "freshness": state_store.ingestion.freshness_state(),
        "records": items,
    }


@router.get("/api/v1/sensors")
def get_sensor_statuses() -> Dict[str, Any]:
    pkt = state_store.ingestion.last_packet
    freshness = state_store.ingestion.freshness_state()
    src = pkt.source.value if pkt else "UNAVAILABLE"
    default_state = (
        "NOT_CONNECTED"
        if pkt is None
        else "STALE"
        if freshness == "STALE"
        else "SIMULATED"
        if pkt.source.value == "SIMULATION"
        else "ONLINE"
    )
    sensors = [
        {
            "sensor_id": "INA226",
            "interface": "I2C",
            "status": pkt.sensor_status.get("INA226", default_state) if pkt else "NOT_CONNECTED",
            "last_value": pkt.pack_voltage if pkt else None,
            "unit": "V",
            "data_source": src,
        },
        {
            "sensor_id": "ACS758-50B",
            "interface": "Conditioned Analog -> ADS1115",
            "status": pkt.sensor_status.get("ACS758-50B", default_state) if pkt else "NOT_CONNECTED",
            "last_value": pkt.pack_current if pkt else None,
            "unit": "A",
            "nominal_range": "±50 A",
            "data_source": src,
        },
        {
            "sensor_id": "ADS1115",
            "interface": "I2C",
            "status": pkt.sensor_status.get("ADS1115", default_state) if pkt else "NOT_CONNECTED",
            "last_value": None,
            "unit": "V_adc",
            "data_source": src,
        },
        *[
            {
                "sensor_id": probe,
                "interface": "1-Wire (DS18B20)",
                "status": (
                    "NOT_CONNECTED"
                    if pkt is None
                    else "UNAVAILABLE"
                    if pkt.temperatures.get(probe) is None
                    else pkt.sensor_status.get(probe, default_state)
                ),
                "last_value": pkt.temperatures.get(probe) if pkt else None,
                "unit": "°C",
                "data_source": src,
            }
            for probe in ("TEMP-01", "TEMP-02", "TEMP-03", "TEMP-04")
        ],
        {
            "sensor_id": "MPU6050",
            "interface": "I2C",
            "status": pkt.sensor_status.get("MPU6050", default_state) if pkt else "NOT_CONNECTED",
            "last_value": asdict(pkt.accelerometer) if pkt else None,
            "unit": "g",
            "data_source": src,
        },
    ]
    return {"freshness": freshness, "sensors": sensors}


@router.get("/api/v1/communication")
def get_communication_status() -> Dict[str, Any]:
    transport = state_store.serial_transport.get_health()
    return {
        "esp32_transport": asdict(transport),
        "bms": state_store.bms_adapter.get_status(),
        "websocket_clients": state_store.ws_hub.client_count,
        "freshness": state_store.ingestion.freshness_state(),
        "last_received_at": state_store.ingestion.last_received_iso,
    }


@router.get("/api/v1/diagnostics/events")
def get_diagnostic_events(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    rows = (
        db.query(DiagnosticEventORM)
        .order_by(desc(DiagnosticEventORM.id))
        .limit(limit)
        .all()
    )
    current_eval = [
        asdict(r)
        for r in state_store.rule_engine.evaluate(
            state_store.ingestion.last_packet,
            state_store.ingestion.freshness_age_seconds(),
        )
    ]
    return {
        "current_evaluation": current_eval,
        "stored_events": [
            {
                "event_id": r.event_id,
                "rule_id": r.rule_id,
                "severity": r.severity,
                "source_component": r.source_component,
                "timestamp": r.timestamp,
                "observed_value": r.observed_value,
                "configured_threshold": r.configured_threshold,
                "explanation": r.explanation,
                "data_source": r.data_source,
                "event_state": r.event_state,
            }
            for r in rows
        ],
    }


@router.get("/api/v1/experiments")
def list_experiments(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(ExperimentSessionORM).order_by(desc(ExperimentSessionORM.start_timestamp)).all()
    return {
        "count": len(rows),
        "sessions": [
            {
                "id": r.id,
                "title": r.title,
                "pack_id": r.pack_id,
                "category": r.category,
                "description": r.description,
                "test_conditions": r.test_conditions,
                "data_source": r.data_source,
                "status": r.status,
                "start_timestamp": r.start_timestamp,
                "end_timestamp": r.end_timestamp,
                "notes": json.loads(r.notes_json or "[]"),
            }
            for r in rows
        ],
    }


@router.post("/api/v1/experiments")
def create_experiment(
    body: ExperimentCreateSchema,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    count = db.query(func.count(ExperimentSessionORM.id)).scalar() or 0
    exp_id = f"EXP-DB-{count + 1:03d}"
    row = ExperimentSessionORM(
        id=exp_id,
        title=body.title,
        pack_id=settings.battery.pack_id,
        category=body.category,
        description=body.description,
        test_conditions=body.test_conditions,
        data_source=body.data_source.value,
        status="ACTIVE",
    )
    db.add(row)
    db.commit()
    emit_log("EXPERIMENT", f"Created experiment session {exp_id}: {body.title}")
    return {"created": True, "id": exp_id}


@router.get("/api/v1/capacity-tests")
def list_capacity_tests(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(CapacityTestORM).order_by(desc(CapacityTestORM.test_date)).all()
    return {
        "count": len(rows),
        "tests": [
            {
                "test_id": r.test_id,
                "pack_id": r.pack_id,
                "test_date": r.test_date,
                "measured_capacity_ah": r.measured_capacity_ah,
                "measured_energy_wh": r.measured_energy_wh,
                "reference_capacity_ah": r.reference_capacity_ah,
                "calculated_soh_pct": round(
                    (r.measured_capacity_ah / r.reference_capacity_ah) * 100.0, 2
                ),
                "test_temperature_c": r.test_temperature_c,
                "discharge_profile": r.discharge_profile,
                "validation_status": r.validation_status,
                "data_source": r.data_source,
                "notes": r.notes,
            }
            for r in rows
        ],
    }


@router.post("/api/v1/capacity-tests")
def create_capacity_test(
    body: CapacityTestCreateSchema,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    count = db.query(func.count(CapacityTestORM.test_id)).scalar() or 0
    test_id = f"CAP-DB-{count + 1:03d}"
    row = CapacityTestORM(
        test_id=test_id,
        pack_id=settings.battery.pack_id,
        test_date=body.test_date,
        measured_capacity_ah=body.measured_capacity_ah,
        measured_energy_wh=body.measured_energy_wh,
        reference_capacity_ah=body.reference_capacity_ah,
        test_temperature_c=body.test_temperature_c,
        discharge_profile=body.discharge_profile,
        validation_status=body.validation_status,
        data_source=body.data_source.value,
        notes=body.notes,
    )
    db.add(row)
    db.commit()
    emit_log("CAPACITY_TEST", f"Stored capacity test {test_id} ({body.measured_capacity_ah} Ah)")
    return {
        "created": True,
        "test_id": test_id,
        "soh_evaluation": state_store.soh_service.evaluate_from_capacity_test(
            measured_usable_capacity_ah=body.measured_capacity_ah,
            reference_capacity_ah=body.reference_capacity_ah,
            validated=(body.validation_status == "VALIDATED"),
        ),
    }


@router.get("/api/v1/ml/status")
def get_ml_status() -> Dict[str, Any]:
    return state_store.ml_engine.get_status()


@router.get("/api/v1/logs")
def get_backend_logs(
    limit: int = Query(default=100, ge=1, le=300),
    category: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    return {
        "count": limit,
        "logs": log_buffer.list_recent(limit=limit, category=category),
    }


@router.websocket("/ws/telemetry")
async def websocket_telemetry(ws: WebSocket) -> None:
    await state_store.ws_hub.connect(ws)
    try:
        # Send immediate honest backend status handshake on connect
        await ws.send_json(
            {
                "event": "backend_status",
                "data": {
                    "system_id": settings.system_id,
                    "active_source": (
                        state_store.ingestion.active_source.value
                        if state_store.ingestion.active_source
                        else None
                    ),
                    "freshness": state_store.ingestion.freshness_state(),
                    "ml_status": state_store.ml_engine.get_status()["status"],
                    "bms_status": state_store.bms_adapter.get_status()["status"],
                },
            }
        )
        if state_store.ingestion.last_snapshot is not None:
            await ws.send_json(
                {
                    "event": "telemetry",
                    "data": state_store.ingestion.last_snapshot,
                }
            )
        while True:
            # Keep socket alive; ignore unexpected text pings gracefully
            msg = await ws.receive_text()
            if msg.strip().lower() == "ping":
                await ws.send_json({"event": "pong", "data": {"ok": True}})
    except WebSocketDisconnect:
        state_store.ws_hub.disconnect(ws)
    except Exception as exc:
        emit_log("WEBSOCKET", f"WebSocket error: {exc}", level="WARNING")
        state_store.ws_hub.disconnect(ws)
        raise HTTPException(status_code=500, detail="WebSocket interrupted") from exc
