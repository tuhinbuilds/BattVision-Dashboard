"""
Configurable backend diagnostic rule engine.
- Explicitly marks checks NOT_EVALUATED when required inputs are missing.
- Never fabricates manufacturer-approved safety thresholds.
- Never replaces independent JK Smart BMS protection.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from app.config import DiagnosticThresholds, settings
from app.schemas.telemetry import TelemetryPacketV1


@dataclass
class RuleResult:
    rule_id: str
    rule_name: str
    outcome: str  # PASS | TRIGGERED | NOT_EVALUATED
    severity: str  # NORMAL | INFO | WARNING | CRITICAL
    source_component: str
    observed_value: str
    configured_threshold: str
    explanation: str
    data_source: str


class BackendDiagnosticRuleEngine:
    def __init__(self, thresholds: DiagnosticThresholds = settings.thresholds) -> None:
        self.thresholds = thresholds

    def evaluate(
        self,
        packet: Optional[TelemetryPacketV1],
        freshness_age_sec: Optional[float] = None,
    ) -> List[RuleResult]:
        t = self.thresholds
        if packet is None:
            return [
                RuleResult(
                    rule_id="COMM-001",
                    rule_name="Telemetry Stream Availability",
                    outcome="TRIGGERED",
                    severity="WARNING",
                    source_component="ESP32-S3 / TRANSPORT",
                    observed_value="NO_PACKETS_RECEIVED",
                    configured_threshold=f"<= {t.freshness_stale_seconds}s freshness",
                    explanation="No telemetry packets have been received by the edge backend.",
                    data_source="UNAVAILABLE",
                ),
                RuleResult(
                    rule_id="VOLT-001",
                    rule_name="Pack Voltage Envelope",
                    outcome="NOT_EVALUATED",
                    severity="INFO",
                    source_component="INA226",
                    observed_value="UNAVAILABLE",
                    configured_threshold=f"{t.pack_voltage_low_v}V - {t.pack_voltage_high_v}V (Project Config)",
                    explanation="VOLTAGE CHECK: NOT EVALUATED - TELEMETRY UNAVAILABLE",
                    data_source="UNAVAILABLE",
                ),
            ]

        src = packet.source.value
        results: List[RuleResult] = []

        # VOLT-001 / VOLT-002
        if packet.pack_voltage is None:
            results.append(
                RuleResult(
                    rule_id="VOLT-001",
                    rule_name="Pack Voltage Envelope",
                    outcome="NOT_EVALUATED",
                    severity="INFO",
                    source_component="INA226",
                    observed_value="MISSING (null)",
                    configured_threshold=f"{t.pack_voltage_low_v}V - {t.pack_voltage_high_v}V (Project Config)",
                    explanation="Pack voltage missing in packet; check not evaluated.",
                    data_source=src,
                )
            )
        elif packet.pack_voltage > t.pack_voltage_high_v:
            results.append(
                RuleResult(
                    rule_id="VOLT-001",
                    rule_name="Pack Over-Voltage Limit",
                    outcome="TRIGGERED",
                    severity="CRITICAL",
                    source_component="INA226",
                    observed_value=f"{packet.pack_voltage:.2f} V",
                    configured_threshold=f"> {t.pack_voltage_high_v:.1f} V (Project Config)",
                    explanation="Pack voltage exceeded configured project upper monitoring limit.",
                    data_source=src,
                )
            )
        elif packet.pack_voltage < t.pack_voltage_low_v:
            results.append(
                RuleResult(
                    rule_id="VOLT-002",
                    rule_name="Pack Under-Voltage Limit",
                    outcome="TRIGGERED",
                    severity="WARNING",
                    source_component="INA226",
                    observed_value=f"{packet.pack_voltage:.2f} V",
                    configured_threshold=f"< {t.pack_voltage_low_v:.1f} V (Project Config)",
                    explanation="Pack voltage fell below configured project lower monitoring limit.",
                    data_source=src,
                )
            )
        else:
            results.append(
                RuleResult(
                    rule_id="VOLT-001",
                    rule_name="Pack Voltage Envelope",
                    outcome="PASS",
                    severity="NORMAL",
                    source_component="INA226",
                    observed_value=f"{packet.pack_voltage:.2f} V",
                    configured_threshold=f"{t.pack_voltage_low_v}V - {t.pack_voltage_high_v}V (Project Config)",
                    explanation="Pack voltage within configured project monitoring range.",
                    data_source=src,
                )
            )

        # TEMP-001 (per-probe check; missing probes flagged individually)
        valid_temps: Dict[str, float] = {
            k: v for k, v in packet.temperatures.items() if v is not None
        }
        missing_probes = [k for k, v in packet.temperatures.items() if v is None]

        if missing_probes:
            results.append(
                RuleResult(
                    rule_id="SENSOR-TEMP-MISS",
                    rule_name="DS18B20 Missing Probe Channel",
                    outcome="TRIGGERED",
                    severity="WARNING",
                    source_component=", ".join(missing_probes),
                    observed_value="MISSING (null)",
                    configured_threshold="4 active probes expected",
                    explanation=f"Missing temperature reading(s) on {', '.join(missing_probes)}; remaining probes evaluated independently.",
                    data_source=src,
                )
            )

        if not valid_temps:
            results.append(
                RuleResult(
                    rule_id="TEMP-001",
                    rule_name="Zone Temperature Monitoring",
                    outcome="NOT_EVALUATED",
                    severity="INFO",
                    source_component="4× DS18B20",
                    observed_value="UNAVAILABLE",
                    configured_threshold=f"<= {t.temp_warning_c:.1f} °C (Project Config)",
                    explanation="No valid DS18B20 probe readings available to evaluate.",
                    data_source=src,
                )
            )
        else:
            hot_probe, max_temp = max(valid_temps.items(), key=lambda kv: kv[1])
            if max_temp >= t.temp_critical_c:
                results.append(
                    RuleResult(
                        rule_id="TEMP-001",
                        rule_name="High Zone Temperature",
                        outcome="TRIGGERED",
                        severity="CRITICAL",
                        source_component=hot_probe,
                        observed_value=f"{max_temp:.1f} °C",
                        configured_threshold=f">= {t.temp_critical_c:.1f} °C (Project Config)",
                        explanation=f"{hot_probe} exceeded configured critical monitoring threshold.",
                        data_source=src,
                    )
                )
            elif max_temp >= t.temp_warning_c:
                results.append(
                    RuleResult(
                        rule_id="TEMP-001",
                        rule_name="Elevated Zone Temperature",
                        outcome="TRIGGERED",
                        severity="WARNING",
                        source_component=hot_probe,
                        observed_value=f"{max_temp:.1f} °C",
                        configured_threshold=f">= {t.temp_warning_c:.1f} °C (Project Config)",
                        explanation=f"{hot_probe} exceeded configured warning monitoring threshold.",
                        data_source=src,
                    )
                )
            else:
                results.append(
                    RuleResult(
                        rule_id="TEMP-001",
                        rule_name="Zone Temperature Monitoring",
                        outcome="PASS",
                        severity="NORMAL",
                        source_component="4× DS18B20",
                        observed_value=f"{max_temp:.1f} °C max ({hot_probe})",
                        configured_threshold=f"< {t.temp_warning_c:.1f} °C (Project Config)",
                        explanation="All active temperature probes below configured warning marker.",
                        data_source=src,
                    )
                )

        # CURR-001 (ACS758-50B ±50A nominal)
        if packet.pack_current is None:
            results.append(
                RuleResult(
                    rule_id="CURR-001",
                    rule_name="Pack Current Envelope",
                    outcome="NOT_EVALUATED",
                    severity="INFO",
                    source_component="ACS758-50B",
                    observed_value="MISSING (null)",
                    configured_threshold=f"<= {t.current_warning_a:.1f} A (Project Config)",
                    explanation="Current reading missing; check not evaluated.",
                    data_source=src,
                )
            )
        elif abs(packet.pack_current) > t.current_warning_a:
            results.append(
                RuleResult(
                    rule_id="CURR-001",
                    rule_name="Elevated Pack Current",
                    outcome="TRIGGERED",
                    severity="WARNING",
                    source_component="ACS758-50B",
                    observed_value=f"{packet.pack_current:.2f} A",
                    configured_threshold=f"> ±{t.current_warning_a:.1f} A (Project Config)",
                    explanation="Pack current magnitude exceeded configured monitoring threshold.",
                    data_source=src,
                )
            )
        else:
            results.append(
                RuleResult(
                    rule_id="CURR-001",
                    rule_name="Pack Current Envelope",
                    outcome="PASS",
                    severity="NORMAL",
                    source_component="ACS758-50B",
                    observed_value=f"{packet.pack_current:.2f} A",
                    configured_threshold=f"<= ±{t.current_warning_a:.1f} A (Project Config)",
                    explanation="Current within configured monitoring range (±50 A nominal sensor).",
                    data_source=src,
                )
            )

        # Freshness check
        if freshness_age_sec is not None and freshness_age_sec > t.freshness_stale_seconds:
            results.append(
                RuleResult(
                    rule_id="SENSOR-001",
                    rule_name="Telemetry Freshness Timeout",
                    outcome="TRIGGERED",
                    severity="WARNING",
                    source_component=packet.device_id,
                    observed_value=f"{freshness_age_sec:.1f} s old",
                    configured_threshold=f"<= {t.freshness_stale_seconds:.1f} s",
                    explanation="Latest telemetry packet exceeded configured freshness window.",
                    data_source=src,
                )
            )

        return results
