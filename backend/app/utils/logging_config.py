"""Structured backend logging with bounded in-memory log buffer for dashboard inspection."""
from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque, Dict, List


@dataclass
class StructuredLogRecord:
    timestamp: str
    category: str
    level: str
    message: str


class BoundedLogBuffer:
    def __init__(self, maxlen: int = 300) -> None:
        self._buffer: Deque[StructuredLogRecord] = deque(maxlen=maxlen)

    def append(self, category: str, level: str, message: str) -> StructuredLogRecord:
        rec = StructuredLogRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            category=category.upper(),
            level=level.upper(),
            message=message,
        )
        self._buffer.append(rec)
        return rec

    def list_recent(self, limit: int = 100, category: str | None = None) -> List[Dict[str, str]]:
        items = list(self._buffer)
        if category:
            cat_u = category.upper()
            items = [i for i in items if i.category == cat_u]
        return [
            {
                "timestamp": r.timestamp,
                "category": r.category,
                "level": r.level,
                "message": r.message,
            }
            for r in items[-limit:]
        ]


log_buffer = BoundedLogBuffer(maxlen=300)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("battvision.edge")


def emit_log(category: str, message: str, level: str = "INFO") -> None:
    log_buffer.append(category=category, level=level, message=message)
    lvl = getattr(logging, level.upper(), logging.INFO)
    logger.log(lvl, "[%s] %s", category.upper(), message)
