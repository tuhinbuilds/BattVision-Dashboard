"""
Portable host / Linux SBC operating-system metrics adapter.
Reads standard Linux /proc & /sysfs files when available, or os.statvfs / os.getloadavg;
explicitly returns None for unavailable metrics rather than fabricating values.
"""
from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Dict, Optional

from app.config import settings
from app.hardware.base import EdgeMetricsAdapter


class PortableEdgeMetricsAdapter(EdgeMetricsAdapter):
    def __init__(self) -> None:
        self._started_at = time.monotonic()

    def _read_linux_cpu_temp(self) -> Optional[float]:
        thermal_path = Path("/sys/class/thermal/thermal_zone0/temp")
        if thermal_path.exists():
            try:
                raw = thermal_path.read_text(encoding="utf-8").strip()
                return round(float(raw) / 1000.0, 1)
            except (OSError, ValueError):
                return None
        return None

    def _read_linux_mem_pct(self) -> Optional[float]:
        meminfo = Path("/proc/meminfo")
        if not meminfo.exists():
            return None
        try:
            values: Dict[str, int] = {}
            for line in meminfo.read_text(encoding="utf-8").splitlines():
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = int(parts[1].strip().split()[0])
                    values[key] = val
            total = values.get("MemTotal")
            avail = values.get("MemAvailable")
            if total and avail is not None:
                return round(((total - avail) / total) * 100.0, 1)
        except (OSError, ValueError):
            return None
        return None

    def _read_storage_pct(self) -> Optional[float]:
        try:
            st = os.statvfs(str(settings.database_path.parent))
            total = st.f_blocks * st.f_frsize
            free = st.f_bavail * st.f_frsize
            if total > 0:
                return round(((total - free) / total) * 100.0, 1)
        except OSError:
            return None
        return None

    def _read_load_pct(self) -> Optional[float]:
        try:
            load1, _, _ = os.getloadavg()
            cpus = os.cpu_count() or 1
            return round(min(100.0, (load1 / cpus) * 100.0), 1)
        except (OSError, AttributeError):
            return None

    def read_metrics(self) -> Dict[str, object]:
        return {
            "platform": "LINUX SBC" if platform.system() == "Linux" else f"DEV HOST ({platform.system()})",
            "sbc_model": settings.hardware.edge_sbc_model,
            "python_version": platform.python_version(),
            "cpu_load_pct": self._read_load_pct(),
            "memory_used_pct": self._read_linux_mem_pct(),
            "storage_used_pct": self._read_storage_pct(),
            "cpu_temp_c": self._read_linux_cpu_temp(),
            "backend_uptime_seconds": int(time.monotonic() - self._started_at),
            "internet_required": False,
        }
