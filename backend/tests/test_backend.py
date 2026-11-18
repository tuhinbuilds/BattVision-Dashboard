"""Automated test suite for BattVision Offline Edge Backend."""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

# Ensure backend/ is importable
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database.connection import build_engine, get_db, init_database
from app.diagnostics.rule_engine import BackendDiagnosticRuleEngine
from app.hardware.serial_transport import LineFramedTelemetryTransport, PacketParseError
from app.main import create_app
from app.ml.health_services import RemainingUsefulLifeService, StateOfHealthService
from app.ml.inference_engine import EdgeMLInferenceEngine
from app.schemas.telemetry import DataSourceType, TelemetryPacketV1
from app.services.state_store import state_store
from app.telemetry.soc_service import CoulombCountingSoCService
from tools.simulated_esp32_sender import build_simulated_packet


@pytest.fixture()
def client(tmp_path: Path):
    db_file = tmp_path / "test_battvision.db"
    test_engine = build_engine(db_file)
    init_database(test_engine)
    TestingSessionLocal = sessionmaker(
        bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False
    )

    # Reset singleton runtime state cleanly per test
    state_store.ingestion.last_packet = None
    state_store.ingestion.last_snapshot = None
    state_store.ingestion.last_sequence_by_device.clear()
    state_store.ingestion.accepted_count = 0
    state_store.ingestion.duplicate_count = 0
    state_store.ingestion.sequence_gap_count = 0
    state_store.soc_service.reset()

    app = create_app()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as tc:
        yield tc


def test_health_and_initial_honest_offline_state(client: TestClient):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "OK"
    assert body["database_connected"] is True
    assert body["ml_status"] == "MODEL_NOT_DEPLOYED"
    assert body["bms_status"] == "NOT_CONFIGURED"
    assert body["freshness"] == "OFFLINE"

    latest = client.get("/api/v1/telemetry/latest").json()
    assert latest["available"] is False
    assert latest["data"] is None


def test_ingest_valid_packet_and_derived_power_and_sqlite_history(client: TestClient):
    pkt = build_simulated_packet(seq=1, soc_pct=80.0, drop_temp3=True)
    res = client.post("/api/v1/telemetry/ingest", json=pkt)
    assert res.status_code == 200
    body = res.json()
    assert body["accepted"] is True
    assert body["source"] == "SIMULATION"

    latest = client.get("/api/v1/telemetry/latest").json()
    assert latest["available"] is True
    data = latest["data"]
    assert data["pack_voltage"] == pkt["pack_voltage"]
    assert data["power"] == round(pkt["pack_voltage"] * pkt["pack_current"], 2)
    # Missing TEMP-03 MUST remain null (None), never coerced to 0
    assert data["temperatures"]["TEMP-03"] is None

    hist = client.get("/api/v1/telemetry/history?limit=10").json()
    assert hist["record_count"] == 1
    assert hist["records"][0]["temperatures"]["TEMP-03"] is None


def test_invalid_packets_rejected():
    transport = LineFramedTelemetryTransport()
    with pytest.raises(PacketParseError):
        transport.parse_frame("{not valid json")

    with pytest.raises(PacketParseError):
        transport.parse_frame('{"schema_version":"9.9","device_id":"X","sequence":1,"timestamp":"2026-01-01T00:00:00Z","source":"SIMULATION"}')

    with pytest.raises(PacketParseError):
        transport.parse_frame('{"schema_version":"1.0","device_id":"X","sequence":1,"timestamp":"not-a-date","source":"SIMULATION"}')


def test_duplicate_and_sequence_gap_detection(client: TestClient):
    p1 = build_simulated_packet(seq=10, soc_pct=75.0)
    r1 = client.post("/api/v1/telemetry/ingest", json=p1).json()
    assert r1["accepted"] is True

    # Duplicate sequence 10
    r_dup = client.post("/api/v1/telemetry/ingest", json=p1).json()
    assert r_dup["accepted"] is False
    assert r_dup["duplicate"] is True

    # Sequence gap 10 -> 14 (gap of 3)
    p3 = build_simulated_packet(seq=14, soc_pct=74.8)
    r_gap = client.post("/api/v1/telemetry/ingest", json=p3).json()
    assert r_gap["accepted"] is True
    assert r_gap["sequence_gap"] == 3


def test_diagnostic_rule_engine_honest_not_evaluated():
    engine = BackendDiagnosticRuleEngine()
    pkt = TelemetryPacketV1(
        schema_version="1.0",
        device_id="BV-TEST",
        sequence=1,
        timestamp=datetime.now(timezone.utc).isoformat(),
        source=DataSourceType.SERIAL_HARDWARE,
        pack_voltage=None,
        pack_current=None,
        temperatures={"TEMP-01": 29.0, "TEMP-02": None, "TEMP-03": 42.5, "TEMP-04": 28.5},
    )
    results = engine.evaluate(pkt, freshness_age_sec=0.5)
    by_id = {r.rule_id: r for r in results}
    assert by_id["VOLT-001"].outcome == "NOT_EVALUATED"
    assert by_id["CURR-001"].outcome == "NOT_EVALUATED"
    assert by_id["TEMP-001"].outcome == "TRIGGERED"
    assert by_id["SENSOR-TEMP-MISS"].outcome == "TRIGGERED"


def test_coulomb_counting_soc_service():
    soc = CoulombCountingSoCService(reference_capacity_ah=24.0)
    t0 = datetime(2026, 11, 18, 10, 0, 0, tzinfo=timezone.utc)
    soc.calibrate(80.0, t0.isoformat())
    # Discharge 12 A for 180 seconds (0.05 h) => 0.6 Ah => 2.5% of 24 Ah => 77.5%
    t1 = t0 + timedelta(seconds=180)
    res = soc.update(t1.isoformat(), pack_current_a=12.0, pack_voltage_v=25.6)
    assert res.soc_pct == pytest.approx(77.5, abs=0.05)
    assert res.calibrated is True

    # Missing current holds SoC without fabricating movement
    t2 = t1 + timedelta(seconds=60)
    held = soc.update(t2.isoformat(), pack_current_a=None)
    assert held.status == "MISSING_CURRENT_HELD"
    assert held.soc_pct == pytest.approx(77.5, abs=0.05)


def test_soh_rul_ml_no_fabrication():
    ml = EdgeMLInferenceEngine()
    assert ml.get_status()["status"] == "MODEL_NOT_DEPLOYED"
    out = ml.run_inference({"pack_voltage": 25.6})
    assert out.soh_pct is None and out.rul_cycles is None

    soh = StateOfHealthService()
    no_cap = soh.evaluate_from_capacity_test(None, 24.0)
    assert no_cap["status"] == "SOH_MODEL_NOT_AVAILABLE"
    has_cap = soh.evaluate_from_capacity_test(22.8, 24.0, validated=False)
    assert has_cap["soh_pct"] == 95.0

    rul = RemainingUsefulLifeService()
    rul_res = rul.evaluate(validated_ageing_records=0, eol_threshold_pct=80.0, model_deployed=False)
    assert rul_res["status"] == "RUL_MODEL_NOT_AVAILABLE"
    assert rul_res["remaining_cycles"] is None


def test_experiments_capacity_tests_and_websocket(client: TestClient):
    exp = client.post(
        "/api/v1/experiments",
        json={"title": "Bench Test 01", "category": "Voltage monitoring", "data_source": "SIMULATION"},
    )
    assert exp.status_code == 200 and exp.json()["created"] is True
    assert client.get("/api/v1/experiments").json()["count"] == 1

    cap = client.post(
        "/api/v1/capacity-tests",
        json={
            "test_date": "2026-11-18",
            "measured_capacity_ah": 23.04,
            "reference_capacity_ah": 24.0,
            "data_source": "SIMULATION",
        },
    )
    assert cap.status_code == 200
    assert cap.json()["soh_evaluation"]["soh_pct"] == 96.0

    # WebSocket live handshake + broadcast on ingest
    with client.websocket_connect("/ws/telemetry") as ws:
        handshake = ws.receive_json()
        assert handshake["event"] == "backend_status"
        assert handshake["data"]["ml_status"] == "MODEL_NOT_DEPLOYED"

        pkt = build_simulated_packet(seq=50, soc_pct=79.0)
        client.post("/api/v1/telemetry/ingest", json=pkt)
        live_msg = ws.receive_json()
        assert live_msg["event"] == "telemetry"
        assert live_msg["data"]["sequence"] == 50
