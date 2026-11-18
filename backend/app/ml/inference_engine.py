"""
Modular Edge ML Model Registry and Inference Runtime Interface.
Returns explicit MODEL_NOT_DEPLOYED state until a validated model artifact is installed.
Never fabricates accuracy metrics or inference predictions.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from app.config import settings


@dataclass
class InferenceOutput:
    deployed: bool
    status: str
    soh_pct: Optional[float]
    rul_cycles: Optional[float]
    inference_timestamp: Optional[str]
    latency_ms: Optional[float]
    note: str


class EdgeMLInferenceEngine:
    def __init__(self) -> None:
        self._deployed = False
        self._model_name: Optional[str] = None
        self._model_version: Optional[str] = None
        self._model_type: Optional[str] = None
        self._runtime_framework: str = "Pending Selection (Lightweight Python Edge Runtime)"
        self._last_inference_ts: Optional[str] = None
        self._last_latency_ms: Optional[float] = None

    def get_status(self) -> Dict[str, object]:
        return {
            "deployed": self._deployed,
            "status": "DEPLOYED" if self._deployed else "MODEL_NOT_DEPLOYED",
            "model_name": self._model_name or "N/A",
            "model_version": self._model_version or "N/A",
            "model_type": self._model_type or "N/A",
            "runtime_framework": self._runtime_framework,
            "models_dir": str(settings.models_dir),
            "validation_metrics_available": False,
            "mae": None,
            "rmse": None,
            "r2": None,
            "last_inference_timestamp": self._last_inference_ts,
            "inference_latency_ms": self._last_latency_ms,
            "note": "No validated Edge-AI model artifact deployed. Inference outputs withheld.",
        }

    def run_inference(self, _features: Dict[str, Optional[float]]) -> InferenceOutput:
        # Honest no-model behavior - never invent SoH or RUL numbers
        return InferenceOutput(
            deployed=False,
            status="MODEL_NOT_DEPLOYED",
            soh_pct=None,
            rul_cycles=None,
            inference_timestamp=None,
            latency_ms=None,
            note="SOH / RUL model not deployed. Train and approve a model offline before edge deployment.",
        )
