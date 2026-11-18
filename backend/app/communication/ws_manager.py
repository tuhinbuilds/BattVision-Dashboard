"""WebSocket Connection Manager for real-time BattVision dashboard event broadcasting."""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import WebSocket

from app.utils.logging_config import emit_log


class WebSocketHub:
    def __init__(self) -> None:
        self._connections: List[WebSocket] = []

    @property
    def client_count(self) -> int:
        return len(self._connections)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        emit_log("WEBSOCKET", f"Dashboard client connected (total={len(self._connections)})")

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)
            emit_log("WEBSOCKET", f"Dashboard client disconnected (total={len(self._connections)})")

    async def broadcast(self, event_type: str, payload: Dict[str, Any]) -> None:
        if not self._connections:
            return
        message = {"event": event_type, "data": payload}
        stale: List[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)
