"""Hardware Abstraction Layer (HAL) interfaces for BattVision."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Optional

from app.schemas.telemetry import DataSourceType, TelemetryPacketV1


@dataclass
class TransportHealth:
    transport_name: str
    source_type: DataSourceType
    connected: bool
    status_label: str
    last_received_at: Optional[str]
    packets_received: int
    malformed_packets: int
    sequence_gaps: int
    duplicate_packets: int
    last_error: Optional[str]


class TelemetryTransport(ABC):
    @abstractmethod
    def get_health(self) -> TransportHealth:
        raise NotImplementedError

    @abstractmethod
    def parse_frame(self, raw_line: str) -> TelemetryPacketV1:
        raise NotImplementedError


class BMSAdapter(ABC):
    @abstractmethod
    def get_status(self) -> Dict[str, object]:
        raise NotImplementedError

    @abstractmethod
    def read_group_voltages(self) -> Optional[list[float]]:
        raise NotImplementedError


class EdgeMetricsAdapter(ABC):
    @abstractmethod
    def read_metrics(self) -> Dict[str, object]:
        raise NotImplementedError
