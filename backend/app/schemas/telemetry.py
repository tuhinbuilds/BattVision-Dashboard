"""Versioned Pydantic schemas for BattVision Telemetry Packet v1.0 and API responses."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class DataSourceType(str, Enum):
    SIMULATION = "SIMULATION"
    SERIAL_HARDWARE = "SERIAL_HARDWARE"
    NETWORK_HARDWARE = "NETWORK_HARDWARE"
    IMPORTED_DATA = "IMPORTED_DATA"


class Vector3Schema(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None


class TelemetryPacketV1(BaseModel):
    """
    Version 1.0 telemetry packet contract between ESP32-S3 (or simulator) and Python backend.
    Missing measurements MUST be null (None) — never 0.
    """
    schema_version: str = Field(default="1.0")
    device_id: str = Field(..., min_length=2, max_length=64)
    sequence: int = Field(..., ge=0)
    timestamp: str
    source: DataSourceType

    pack_voltage: Optional[float] = None
    pack_current: Optional[float] = None
    power: Optional[float] = None
    state_of_charge: Optional[float] = None

    temperatures: Dict[str, Optional[float]] = Field(
        default_factory=lambda: {
            "TEMP-01": None,
            "TEMP-02": None,
            "TEMP-03": None,
            "TEMP-04": None,
        }
    )
    accelerometer: Vector3Schema = Field(default_factory=Vector3Schema)
    gyroscope: Vector3Schema = Field(default_factory=Vector3Schema)
    adc_channels: Dict[str, Optional[float]] = Field(default_factory=dict)
    cell_voltages: Optional[List[Optional[float]]] = None

    sensor_status: Dict[str, str] = Field(default_factory=dict)
    validity: Dict[str, bool] = Field(default_factory=dict)
    error_flags: List[str] = Field(default_factory=list)

    @field_validator("schema_version")
    @classmethod
    def check_schema_version(cls, v: str) -> str:
        if v != "1.0":
            raise ValueError(f"Unsupported schema_version '{v}'. Expected '1.0'.")
        return v

    @field_validator("timestamp")
    @classmethod
    def check_iso_timestamp(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"Invalid ISO-8601 timestamp: '{v}'") from exc
        return v


class ExperimentCreateSchema(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    category: str = Field(default="General observation")
    description: str = Field(default="")
    test_conditions: str = Field(default="")
    data_source: DataSourceType = Field(default=DataSourceType.SIMULATION)


class CapacityTestCreateSchema(BaseModel):
    test_date: str
    measured_capacity_ah: float = Field(..., gt=0, le=50)
    measured_energy_wh: Optional[float] = Field(default=None, gt=0)
    reference_capacity_ah: float = Field(default=24.0, gt=0)
    test_temperature_c: Optional[float] = None
    discharge_profile: str = Field(default="")
    validation_status: str = Field(default="UNVALIDATED")
    data_source: DataSourceType = Field(default=DataSourceType.SIMULATION)
    notes: str = Field(default="")
