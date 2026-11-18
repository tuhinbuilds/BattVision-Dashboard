#pragma once
#include <Arduino.h>
#include <cmath>

/**
 * Version 1.0 Telemetry Packet Structure matching backend/app/schemas/telemetry.py.
 * Missing or invalid readings MUST be serialized as JSON null - NEVER 0.
 */
struct OptionalFloat {
  bool valid = false;
  float value = 0.0f;

  void set(float v) {
    if (!isnan(v) && !isinf(v)) {
      valid = true;
      value = v;
    } else {
      valid = false;
    }
  }

  void clear() { valid = false; }
};

struct TelemetryPacketV1 {
  uint32_t sequence = 0;
  const char* source = "SIMULATION";  // Change to SERIAL_HARDWARE only when wired & validated
  OptionalFloat packVoltage;
  OptionalFloat packCurrent;
  OptionalFloat power;
  OptionalFloat temperatures[4];      // TEMP-01 .. TEMP-04
  OptionalFloat accelX, accelY, accelZ;
  OptionalFloat gyroX, gyroY, gyroZ;
};
