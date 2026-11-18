"""Centralized backend runtime state store holding HAL adapters, services, and WS hub."""
from __future__ import annotations

from app.communication.ws_manager import WebSocketHub
from app.config import settings
from app.diagnostics.rule_engine import BackendDiagnosticRuleEngine
from app.hardware.bms_adapter import JKSmartBMSPlaceholderAdapter
from app.hardware.edge_metrics import PortableEdgeMetricsAdapter
from app.hardware.serial_transport import LineFramedTelemetryTransport
from app.ml.health_services import RemainingUsefulLifeService, StateOfHealthService
from app.ml.inference_engine import EdgeMLInferenceEngine
from app.schemas.telemetry import DataSourceType
from app.telemetry.ingestion import TelemetryIngestionService
from app.telemetry.soc_service import CoulombCountingSoCService


class BackendStateStore:
    def __init__(self) -> None:
        self.ws_hub = WebSocketHub()
        self.bms_adapter = JKSmartBMSPlaceholderAdapter()
        self.edge_metrics = PortableEdgeMetricsAdapter()
        self.serial_transport = LineFramedTelemetryTransport(
            transport_name="ESP32_SERIAL_TRANSPORT",
            source_type=DataSourceType.SERIAL_HARDWARE,
            port_label=settings.hardware.serial_port,
            baud_label=settings.hardware.serial_baud_rate,
        )
        self.soc_service = CoulombCountingSoCService()
        self.rule_engine = BackendDiagnosticRuleEngine()
        self.ml_engine = EdgeMLInferenceEngine()
        self.soh_service = StateOfHealthService()
        self.rul_service = RemainingUsefulLifeService()
        self.ingestion = TelemetryIngestionService(
            soc_service=self.soc_service,
            rule_engine=self.rule_engine,
        )


state_store = BackendStateStore()
