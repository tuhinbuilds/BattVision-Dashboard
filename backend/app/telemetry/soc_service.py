"""
Modular State of Charge (SoC) Estimation Service using Coulomb Counting.
- Integrates measured current over actual elapsed timestamps (dt).
- Explicitly tracks calibration state, current offset, and missing-data gaps.
- Does NOT assume pack voltage alone provides reliable LiFePO4 SoC.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from app.config import settings


@dataclass
class SoCEstimateResult:
    soc_pct: Optional[float]
    remaining_capacity_ah: Optional[float]
    method: str
    calibrated: bool
    sign_convention: str
    status: str
    last_updated: Optional[str]
    note: str


class CoulombCountingSoCService:
    def __init__(
        self,
        reference_capacity_ah: float = settings.battery.pack_nominal_capacity_ah,
        initial_soc_pct: Optional[float] = None,
        current_offset_a: float = 0.0,
        positive_is_discharge: bool = True,
    ) -> None:
        self.reference_capacity_ah = reference_capacity_ah
        self.current_offset_a = current_offset_a
        self.positive_is_discharge = positive_is_discharge
        self._soc_pct: Optional[float] = initial_soc_pct
        self._calibrated: bool = False
        self._last_ts: Optional[datetime] = None
        self._last_ts_iso: Optional[str] = None

    def calibrate(self, known_soc_pct: float, timestamp_iso: Optional[str] = None) -> None:
        clamped = max(0.0, min(100.0, float(known_soc_pct)))
        self._soc_pct = clamped
        self._calibrated = True
        if timestamp_iso:
            self._last_ts = datetime.fromisoformat(timestamp_iso.replace("Z", "+00:00"))
            self._last_ts_iso = timestamp_iso

    def reset(self) -> None:
        self._soc_pct = None
        self._calibrated = False
        self._last_ts = None
        self._last_ts_iso = None

    def update(
        self,
        timestamp_iso: str,
        pack_current_a: Optional[float],
        pack_voltage_v: Optional[float] = None,
        incoming_soc_hint: Optional[float] = None,
    ) -> SoCEstimateResult:
        ts = datetime.fromisoformat(timestamp_iso.replace("Z", "+00:00"))

        # If uninitialized and an explicit hint exists (e.g. demo packet), initialize as uncalibrated
        if self._soc_pct is None:
            if incoming_soc_hint is not None:
                self._soc_pct = max(0.0, min(100.0, float(incoming_soc_hint)))
                self._calibrated = False
                self._last_ts = ts
                self._last_ts_iso = timestamp_iso
                return self.snapshot()
            return SoCEstimateResult(
                soc_pct=None,
                remaining_capacity_ah=None,
                method="COULOMB_COUNTING",
                calibrated=False,
                sign_convention=self._sign_label(),
                status="UNINITIALIZED",
                last_updated=None,
                note="SoC uninitialized. Calibrate at full charge (29.2 V) or provide valid initial SoC.",
            )

        if pack_current_a is None:
            return SoCEstimateResult(
                soc_pct=round(self._soc_pct, 2),
                remaining_capacity_ah=round((self._soc_pct / 100.0) * self.reference_capacity_ah, 2),
                method="COULOMB_COUNTING",
                calibrated=self._calibrated,
                sign_convention=self._sign_label(),
                status="MISSING_CURRENT_HELD",
                last_updated=self._last_ts_iso,
                note="Current reading missing; previous SoC held without advancing integration.",
            )

        if self._last_ts is not None:
            dt_sec = (ts - self._last_ts).total_seconds()
            if 0 < dt_sec <= 300:
                corrected_i = pack_current_a - self.current_offset_a
                signed_discharge_a = corrected_i if self.positive_is_discharge else -corrected_i
                delta_ah = signed_discharge_a * (dt_sec / 3600.0)
                delta_soc = (delta_ah / self.reference_capacity_ah) * 100.0
                self._soc_pct = max(0.0, min(100.0, self._soc_pct - delta_soc))

                # Optional conservative full-charge ceiling anchor only at near-zero current & >=29.1V
                if (
                    pack_voltage_v is not None
                    and pack_voltage_v >= 29.1
                    and abs(corrected_i) <= 0.4
                ):
                    self._soc_pct = 100.0
                    self._calibrated = True

        self._last_ts = ts
        self._last_ts_iso = timestamp_iso
        return self.snapshot()

    def _sign_label(self) -> str:
        return (
            "POSITIVE_DISCHARGE_NEGATIVE_CHARGE"
            if self.positive_is_discharge
            else "POSITIVE_CHARGE_NEGATIVE_DISCHARGE"
        )

    def snapshot(self) -> SoCEstimateResult:
        if self._soc_pct is None:
            return SoCEstimateResult(
                soc_pct=None,
                remaining_capacity_ah=None,
                method="COULOMB_COUNTING",
                calibrated=False,
                sign_convention=self._sign_label(),
                status="UNAVAILABLE",
                last_updated=None,
                note="Awaiting calibrated initial state and valid current telemetry.",
            )
        return SoCEstimateResult(
            soc_pct=round(self._soc_pct, 2),
            remaining_capacity_ah=round((self._soc_pct / 100.0) * self.reference_capacity_ah, 2),
            method="COULOMB_COUNTING",
            calibrated=self._calibrated,
            sign_convention=self._sign_label(),
            status="CALIBRATED_ESTIMATE" if self._calibrated else "UNCALIBRATED_ESTIMATE",
            last_updated=self._last_ts_iso,
            note=(
                "Estimated via elapsed-time Coulomb counting. "
                + (
                    "Full-charge calibration applied."
                    if self._calibrated
                    else "Uncalibrated estimate - not a validated lab measurement."
                )
            ),
        )
