"""SQLAlchemy ORM models for BattVision local SQLite persistence."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class TelemetryRecordORM(Base):
    __tablename__ = "telemetry_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    schema_version: Mapped[str] = mapped_column(String(16), nullable=False, default="1.0")
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    received_at: Mapped[str] = mapped_column(String(64), nullable=False, default=utc_now_iso)
    source: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    # Nullable measurements - NEVER coerce missing values to 0
    pack_voltage: Mapped[float | None] = mapped_column(Float, nullable=True)
    pack_current: Mapped[float | None] = mapped_column(Float, nullable=True)
    power: Mapped[float | None] = mapped_column(Float, nullable=True)
    soc_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)

    temp_01: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_02: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_03: Mapped[float | None] = mapped_column(Float, nullable=True)
    temp_04: Mapped[float | None] = mapped_column(Float, nullable=True)

    accel_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    accel_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    accel_z: Mapped[float | None] = mapped_column(Float, nullable=True)
    gyro_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    gyro_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    gyro_z: Mapped[float | None] = mapped_column(Float, nullable=True)

    cell_voltages_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    sensor_status_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    validity_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("idx_telemetry_source_ts", "source", "timestamp"),)


class SensorStatusORM(Base):
    __tablename__ = "sensor_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sensor_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    interface_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    last_valid_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    updated_at: Mapped[str] = mapped_column(String(64), nullable=False, default=utc_now_iso)


class DiagnosticEventORM(Base):
    __tablename__ = "diagnostic_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    rule_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    source_component: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    observed_value: Mapped[str] = mapped_column(String(128), nullable=False)
    configured_threshold: Mapped[str] = mapped_column(String(128), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    data_source: Mapped[str] = mapped_column(String(32), nullable=False)
    event_state: Mapped[str] = mapped_column(String(24), nullable=False, default="ACTIVE")


class ExperimentSessionORM(Base):
    __tablename__ = "experiment_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    pack_id: Mapped[str] = mapped_column(String(64), nullable=False, default="BV-PACK-8S4P")
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    test_conditions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    data_source: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="ACTIVE")
    start_timestamp: Mapped[str] = mapped_column(String(64), nullable=False, default=utc_now_iso)
    end_timestamp: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")


class CapacityTestORM(Base):
    __tablename__ = "capacity_tests"

    test_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    pack_id: Mapped[str] = mapped_column(String(64), nullable=False, default="BV-PACK-8S4P")
    test_date: Mapped[str] = mapped_column(String(32), nullable=False)
    measured_capacity_ah: Mapped[float] = mapped_column(Float, nullable=False)
    measured_energy_wh: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_capacity_ah: Mapped[float] = mapped_column(Float, nullable=False)
    test_temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    discharge_profile: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    validation_status: Mapped[str] = mapped_column(String(32), nullable=False, default="UNVALIDATED")
    data_source: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")


class DatasetMetadataORM(Base):
    __tablename__ = "dataset_metadata"

    dataset_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    chemistry: Mapped[str] = mapped_column(String(32), nullable=False, default="LiFePO4")
    record_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    validation_status: Mapped[str] = mapped_column(String(32), nullable=False, default="UNVALIDATED")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False, default=utc_now_iso)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ModelMetadataORM(Base):
    __tablename__ = "model_metadata"

    model_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    model_type: Mapped[str] = mapped_column(String(64), nullable=False)
    runtime_framework: Mapped[str] = mapped_column(String(64), nullable=False)
    file_path: Mapped[str] = mapped_column(String(256), nullable=False)
    deployed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    registered_at: Mapped[str] = mapped_column(String(64), nullable=False, default=utc_now_iso)


class InferenceRecordORM(Base):
    __tablename__ = "inference_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    soh_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    rul_cycles: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_source: Mapped[str] = mapped_column(String(32), nullable=False)


class SystemEventORM(Base):
    __tablename__ = "system_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
