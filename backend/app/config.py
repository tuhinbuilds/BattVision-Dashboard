"""
Central configuration for BattVision Offline Edge Backend.
Unknown physical hardware assignments are explicitly marked 'TBD' until bench verified.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"


@dataclass(frozen=True)
class BatterySpecConfig:
    pack_id: str = "BV-PACK-8S4P"
    chemistry: str = "LiFePO4"
    topology: str = "8S4P"
    cell_format: str = "32700"
    cell_count: int = 32
    series_groups: int = 8
    parallel_cells_per_group: int = 4
    cell_nominal_voltage_v: float = 3.2
    cell_capacity_ah: float = 6.0
    pack_nominal_voltage_v: float = 25.6
    pack_nominal_capacity_ah: float = 24.0
    pack_nominal_energy_wh: float = 614.4
    pack_full_charge_voltage_v: float = 29.2
    pack_cutoff_voltage_v: float = 20.0


@dataclass(frozen=True)
class HardwarePendingConfig:
    """Explicitly marks unverified hardware parameters as TBD."""
    controller: str = "PCBCupid Glyph ESP32-S3"
    edge_sbc_model: str = "PENDING_SELECTION"
    bms_model: str = "JK Smart BMS B1A8S10P (Verification Pending)"
    bms_interface: str = "TBD"
    bms_protocol: str = "TBD"
    serial_port: str = os.getenv("BV_SERIAL_PORT", "TBD")
    serial_baud_rate: str = os.getenv("BV_SERIAL_BAUD", "TBD")
    i2c_sda_gpio: str = "TBD"
    i2c_scl_gpio: str = "TBD"
    onewire_gpio: str = "TBD"
    acs758_nominal_range_a: float = 50.0
    current_sign_convention: str = "POSITIVE_DISCHARGE_NEGATIVE_CHARGE"


@dataclass(frozen=True)
class DiagnosticThresholds:
    """Configurable project monitoring thresholds (NOT manufacturer or BMS protection cutoffs)."""
    pack_voltage_high_v: float = 28.8
    pack_voltage_low_v: float = 22.4
    temp_warning_c: float = 38.0
    temp_critical_c: float = 48.0
    temp_spread_warning_c: float = 4.0
    current_warning_a: float = 30.0
    power_warning_w: float = 800.0
    freshness_stale_seconds: float = 5.0


@dataclass(frozen=True)
class Settings:
    system_id: str = "BATTVISION-EDGE-01"
    api_version: str = "1.0.0"
    schema_version: str = "1.0"
    host: str = os.getenv("BV_HOST", "0.0.0.0")
    port: int = int(os.getenv("BV_PORT", "8000"))
    database_path: Path = Path(
        os.getenv("BV_DATABASE_PATH", str(DATA_DIR / "telemetry" / "battvision.db"))
    )
    models_dir: Path = Path(os.getenv("BV_MODELS_DIR", str(DATA_DIR / "models")))
    exports_dir: Path = Path(os.getenv("BV_EXPORTS_DIR", str(DATA_DIR / "exports")))
    frontend_dist_dir: Path = PROJECT_ROOT / "dist"
    battery: BatterySpecConfig = field(default_factory=BatterySpecConfig)
    hardware: HardwarePendingConfig = field(default_factory=HardwarePendingConfig)
    thresholds: DiagnosticThresholds = field(default_factory=DiagnosticThresholds)
    sensor_validation_bounds: Dict[str, tuple[float, float]] = field(
        default_factory=lambda: {
            "pack_voltage": (15.0, 35.0),
            "pack_current": (-55.0, 55.0),  # ACS758-50B nominal ±50A with small margin
            "temperature": (-20.0, 100.0),
            "accel_g": (-16.0, 16.0),
            "gyro_dps": (-500.0, 500.0),
        }
    )


settings = Settings()
