"""
JK Smart BMS (B1A8S10P) Hardware Adapter Placeholder.
Protocol, pinout, and electrical interface remain explicitly unverified until confirmed
against actual hardware documentation. Never fabricates BMS frames or protection overrides.
"""
from __future__ import annotations

from typing import Dict, Optional

from app.config import settings
from app.hardware.base import BMSAdapter


class JKSmartBMSPlaceholderAdapter(BMSAdapter):
    def get_status(self) -> Dict[str, object]:
        return {
            "model": settings.hardware.bms_model,
            "interface": settings.hardware.bms_interface,
            "protocol": settings.hardware.bms_protocol,
            "connected": False,
            "status": "NOT_CONFIGURED",
            "independent_protection": True,
            "note": (
                "JK Smart BMS B1A8S10P protocol, pinout, and galvanic isolation require physical "
                "verification before live polling. BMS retains sole hardware safety authority."
            ),
        }

    def read_group_voltages(self) -> Optional[list[float]]:
        # Never invent 8S group voltages when BMS is not connected
        return None
