"""
SoH and RUL Service Interfaces.
- SoH requires measured usable capacity relative to an explicitly configured reference capacity.
- Never treats nominal 24 Ah as a measured capacity test result.
- RUL requires validated ageing records, a configurable EoL criterion, and a deployed model.
"""
from __future__ import annotations

from typing import Dict, Optional


class StateOfHealthService:
    def evaluate_from_capacity_test(
        self,
        measured_usable_capacity_ah: Optional[float],
        reference_capacity_ah: float,
        validated: bool = False,
    ) -> Dict[str, object]:
        if measured_usable_capacity_ah is None or reference_capacity_ah <= 0:
            return {
                "available": False,
                "status": "SOH_MODEL_NOT_AVAILABLE",
                "soh_pct": None,
                "measured_capacity_ah": None,
                "reference_capacity_ah": reference_capacity_ah,
                "validated": False,
                "note": "No measured discharge capacity test available. Nominal 24 Ah is not a measured capacity result.",
            }
        soh = round((measured_usable_capacity_ah / reference_capacity_ah) * 100.0, 2)
        return {
            "available": True,
            "status": "CAPACITY_TEST_VALIDATED" if validated else "CAPACITY_TEST_UNVALIDATED",
            "soh_pct": soh,
            "measured_capacity_ah": measured_usable_capacity_ah,
            "reference_capacity_ah": reference_capacity_ah,
            "validated": validated,
            "formula": "SoH (%) = (Current usable capacity / Reference capacity) * 100",
        }


class RemainingUsefulLifeService:
    def evaluate(
        self,
        validated_ageing_records: int,
        eol_threshold_pct: float = 80.0,
        model_deployed: bool = False,
    ) -> Dict[str, object]:
        if not model_deployed or validated_ageing_records < 5:
            return {
                "available": False,
                "status": "RUL_MODEL_NOT_AVAILABLE",
                "remaining_cycles": None,
                "eol_threshold_pct": eol_threshold_pct,
                "validated_ageing_records": validated_ageing_records,
                "note": "INSUFFICIENT AGEING DATA FOR VALIDATED RUL — requires experimental ageing labels and deployed model.",
            }
        return {
            "available": False,
            "status": "RUL_MODEL_NOT_AVAILABLE",
            "remaining_cycles": None,
            "eol_threshold_pct": eol_threshold_pct,
            "validated_ageing_records": validated_ageing_records,
            "note": "Awaiting deployed RUL predictor artifact.",
        }
