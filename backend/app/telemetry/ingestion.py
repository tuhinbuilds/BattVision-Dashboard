"""
Dedicated Python Telemetry Ingestion Service.
Validates packets, detects sequence duplicates & gaps, enforces sanity bounds without
silently coercing missing values to 0, computes derived power (V * I), persists to SQLite,
and evaluates backend diagnostic rules.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import DiagnosticEventORM, TelemetryRecordORM
from app.diagnostics.rule_engine import BackendDiagnosticRuleEngine, RuleResult
from app.schemas.telemetry import DataSourceType, TelemetryPacketV1
from app.telemetry.soc_service import CoulombCountingSoCService
from app.utils.logging_config import emit_log


@dataclass
class IngestionResult:
    accepted: bool
    duplicate: bool
    sequence_gap: int
    validation_warnings: List[str] = field(default_factory=list)
    record_id: Optional[int] = None
    snapshot: Optional[Dict[str, Any]] = None
    triggered_rules: List[RuleResult] = field(default_factory=list)


class TelemetryIngestionService:
    def __init__(
        self,
        soc_service: CoulombCountingSoCService,
        rule_engine: BackendDiagnosticRuleEngine,
    ) -> None:
        self.soc_service = soc_service
        self.rule_engine = rule_engine
        self.active_source: Optional[DataSourceType] = None
        self.last_packet: Optional[TelemetryPacketV1] = None
        self.last_snapshot: Optional[Dict[str, Any]] = None
        self.last_received_monotonic: Optional[float] = None
        self.last_received_iso: Optional[str] = None
        self.last_sequence_by_device: Dict[str, int] = {}
        self.accepted_count: int = 0
        self.rejected_count: int = 0
        self.duplicate_count: int = 0
        self.sequence_gap_count: int = 0

    def freshness_age_seconds(self) -> Optional[float]:
        if self.last_received_monotonic is None:
            return None
        return round(time.monotonic() - self.last_received_monotonic, 2)

    def freshness_state(self) -> str:
        age = self.freshness_age_seconds()
        if age is None:
            return "OFFLINE"
        if age > settings.thresholds.freshness_stale_seconds:
            return "STALE"
        return "LIVE"

    def _check_bounds(self, packet: TelemetryPacketV1) -> List[str]:
        warnings: List[str] = []
        bounds = settings.sensor_validation_bounds

        if packet.pack_voltage is not None:
            lo, hi = bounds["pack_voltage"]
            if not (lo <= packet.pack_voltage <= hi):
                warnings.append(f"pack_voltage={packet.pack_voltage} outside [{lo}, {hi}] V")

        if packet.pack_current is not None:
            lo, hi = bounds["pack_current"]
            if not (lo <= packet.pack_current <= hi):
                warnings.append(f"pack_current={packet.pack_current} outside [{lo}, {hi}] A")

        t_lo, t_hi = bounds["temperature"]
        for probe_id, temp_val in packet.temperatures.items():
            if temp_val is not None and not (t_lo <= temp_val <= t_hi):
                warnings.append(f"{probe_id}={temp_val} outside [{t_lo}, {t_hi}] C")

        return warnings

    def ingest_packet(self, packet: TelemetryPacketV1, db: Session) -> IngestionResult:
        # Check sequence duplicates & gaps per device
        prev_seq = self.last_sequence_by_device.get(packet.device_id)
        if prev_seq is not None and packet.sequence == prev_seq:
            self.duplicate_count += 1
            emit_log(
                "TELEMETRY",
                f"Duplicate sequence {packet.sequence} from {packet.device_id} ignored",
                level="WARNING",
            )
            return IngestionResult(
                accepted=False,
                duplicate=True,
                sequence_gap=0,
                validation_warnings=[f"Duplicate sequence number {packet.sequence}"],
            )

        gap = 0
        if prev_seq is not None and packet.sequence > prev_seq + 1:
            gap = packet.sequence - prev_seq - 1
            self.sequence_gap_count += gap
            emit_log(
                "TELEMETRY",
                f"Sequence gap of {gap} packet(s) detected for {packet.device_id} ({prev_seq} -> {packet.sequence})",
                level="WARNING",
            )

        warnings = self._check_bounds(packet)

        # Derived power calculation strictly from valid V and I (never fabricate if missing)
        derived_power: Optional[float] = packet.power
        if packet.pack_voltage is not None and packet.pack_current is not None:
            derived_power = round(packet.pack_voltage * packet.pack_current, 2)

        soc_res = self.soc_service.update(
            timestamp_iso=packet.timestamp,
            pack_current_a=packet.pack_current,
            pack_voltage_v=packet.pack_voltage,
            incoming_soc_hint=packet.state_of_charge,
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        record = TelemetryRecordORM(
            schema_version=packet.schema_version,
            device_id=packet.device_id,
            sequence=packet.sequence,
            timestamp=packet.timestamp,
            received_at=now_iso,
            source=packet.source.value,
            pack_voltage=packet.pack_voltage,
            pack_current=packet.pack_current,
            power=derived_power,
            soc_estimate=soc_res.soc_pct,
            temp_01=packet.temperatures.get("TEMP-01"),
            temp_02=packet.temperatures.get("TEMP-02"),
            temp_03=packet.temperatures.get("TEMP-03"),
            temp_04=packet.temperatures.get("TEMP-04"),
            accel_x=packet.accelerometer.x,
            accel_y=packet.accelerometer.y,
            accel_z=packet.accelerometer.z,
            gyro_x=packet.gyroscope.x,
            gyro_y=packet.gyroscope.y,
            gyro_z=packet.gyroscope.z,
            cell_voltages_json=json.dumps(packet.cell_voltages) if packet.cell_voltages is not None else None,
            sensor_status_json=json.dumps(packet.sensor_status),
            validity_json=json.dumps(packet.validity),
        )
        db.add(record)

        # Evaluate diagnostic rules and store newly triggered events
        rule_results = self.rule_engine.evaluate(packet, freshness_age_sec=0.0)
        triggered = [r for r in rule_results if r.outcome == "TRIGGERED"]
        for tr in triggered:
            evt_id = f"EVT-{tr.rule_id}-{packet.sequence}"
            exists = (
                db.query(DiagnosticEventORM)
                .filter(DiagnosticEventORM.event_id == evt_id)
                .first()
            )
            if not exists:
                db.add(
                    DiagnosticEventORM(
                        event_id=evt_id,
                        rule_id=tr.rule_id,
                        severity=tr.severity,
                        source_component=tr.source_component,
                        timestamp=packet.timestamp,
                        observed_value=tr.observed_value,
                        configured_threshold=tr.configured_threshold,
                        explanation=tr.explanation,
                        data_source=tr.data_source,
                        event_state="ACTIVE",
                    )
                )

        db.commit()
        db.refresh(record)

        self.last_sequence_by_device[packet.device_id] = packet.sequence
        self.active_source = packet.source
        self.last_packet = packet
        self.last_received_monotonic = time.monotonic()
        self.last_received_iso = now_iso
        self.accepted_count += 1

        snapshot: Dict[str, Any] = {
            "id": record.id,
            "schema_version": packet.schema_version,
            "device_id": packet.device_id,
            "sequence": packet.sequence,
            "timestamp": packet.timestamp,
            "received_at": now_iso,
            "source": packet.source.value,
            "freshness": "LIVE",
            "pack_voltage": packet.pack_voltage,
            "pack_current": packet.pack_current,
            "power": derived_power,
            "state_of_charge": soc_res.soc_pct,
            "soc_status": soc_res.status,
            "temperatures": {
                "TEMP-01": record.temp_01,
                "TEMP-02": record.temp_02,
                "TEMP-03": record.temp_03,
                "TEMP-04": record.temp_04,
            },
            "accelerometer": {
                "x": record.accel_x,
                "y": record.accel_y,
                "z": record.accel_z,
            },
            "gyroscope": {
                "x": record.gyro_x,
                "y": record.gyro_y,
                "z": record.gyro_z,
            },
            "cell_voltages": packet.cell_voltages,
            "sensor_status": packet.sensor_status,
            "validity": packet.validity,
            "validation_warnings": warnings,
        }
        self.last_snapshot = snapshot

        return IngestionResult(
            accepted=True,
            duplicate=False,
            sequence_gap=gap,
            validation_warnings=warnings,
            record_id=record.id,
            snapshot=snapshot,
            triggered_rules=triggered,
        )
