"""
Configurable newline-delimited JSON packet framing parser for ESP32-S3 USB/UART/Network transports.
Rejects corrupted or malformed packets explicitly without silently accepting bad data.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from pydantic import ValidationError

from app.hardware.base import TelemetryTransport, TransportHealth
from app.schemas.telemetry import DataSourceType, TelemetryPacketV1
from app.utils.logging_config import emit_log


class PacketParseError(ValueError):
    """Raised when an incoming raw telemetry frame fails framing or schema validation."""


class LineFramedTelemetryTransport(TelemetryTransport):
    def __init__(
        self,
        transport_name: str = "ESP32_LINE_TRANSPORT",
        source_type: DataSourceType = DataSourceType.SERIAL_HARDWARE,
        port_label: str = "TBD",
        baud_label: str = "TBD",
    ) -> None:
        self.transport_name = transport_name
        self.source_type = source_type
        self.port_label = port_label
        self.baud_label = baud_label
        self._connected = False
        self._last_received_at: Optional[str] = None
        self._packets_received = 0
        self._malformed_packets = 0
        self._sequence_gaps = 0
        self._duplicate_packets = 0
        self._last_error: Optional[str] = None
        self._last_sequence: Optional[int] = None

    def parse_frame(self, raw_line: str) -> TelemetryPacketV1:
        cleaned = raw_line.strip()
        if not cleaned:
            self._malformed_packets += 1
            self._last_error = "Empty packet line"
            raise PacketParseError("Empty packet line")

        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            self._malformed_packets += 1
            self._last_error = f"Malformed JSON: {exc.msg}"
            emit_log("COMMUNICATION", f"Malformed packet rejected: {exc.msg}", level="WARNING")
            raise PacketParseError(f"Malformed JSON: {exc.msg}") from exc

        if not isinstance(payload, dict):
            self._malformed_packets += 1
            self._last_error = "Telemetry frame must be a JSON object"
            raise PacketParseError("Telemetry frame must be a JSON object")

        try:
            packet = TelemetryPacketV1.model_validate(payload)
        except ValidationError as exc:
            self._malformed_packets += 1
            self._last_error = f"Schema validation failed ({len(exc.errors())} error(s))"
            emit_log("COMMUNICATION", f"Schema validation failed: {exc}", level="WARNING")
            raise PacketParseError(str(exc)) from exc

        if self._last_sequence is not None:
            if packet.sequence == self._last_sequence:
                self._duplicate_packets += 1
            elif packet.sequence > self._last_sequence + 1:
                self._sequence_gaps += packet.sequence - self._last_sequence - 1
        self._last_sequence = packet.sequence
        self._packets_received += 1
        self._last_received_at = datetime.now(timezone.utc).isoformat()
        self._last_error = None
        return packet

    def mark_disconnected(self, reason: str = "Device not attached") -> None:
        self._connected = False
        self._last_error = reason

    def get_health(self) -> TransportHealth:
        status = (
            "NOT_CONFIGURED"
            if self.port_label == "TBD" and self._packets_received == 0
            else "CONNECTED"
            if self._connected
            else "DISCONNECTED"
        )
        return TransportHealth(
            transport_name=self.transport_name,
            source_type=self.source_type,
            connected=self._connected,
            status_label=status,
            last_received_at=self._last_received_at,
            packets_received=self._packets_received,
            malformed_packets=self._malformed_packets,
            sequence_gaps=self._sequence_gaps,
            duplicate_packets=self._duplicate_packets,
            last_error=self._last_error,
        )
