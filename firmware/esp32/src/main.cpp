/**
 * BattVision Embedded Acquisition Firmware Skeleton
 * Target: PCBCupid Glyph ESP32-S3
 *
 * Modular Architecture:
 *  1. SensorManager (INA226, ADS1115, ACS758-50B, 4x DS18B20, MPU6050)
 *  2. Calibration & Validation Layer (rejects NaN/out-of-range; preserves null for missing)
 *  3. TelemetryPacketBuilder (newline-delimited JSON v1.0)
 *  4. CommunicationManager (USB Serial / configurable local transport)
 *  5. Watchdog & Error Handling
 *
 * IMPORTANT: Do not connect to the physical 8S4P LiFePO4 battery until all TBD values in
 * include/board_config.h and external voltage/current conditioning circuits are verified.
 */
#include <Arduino.h>
#include "board_config.h"
#include "telemetry_packet.h"

namespace {

uint32_t gSequence = 0;
unsigned long gLastSampleMs = 0;

void appendOptionalFloat(String& out, const OptionalFloat& field, int decimals) {
  if (!field.valid) {
    out += "null";
  } else {
    out += String(field.value, decimals);
  }
}

void acquireSensors(TelemetryPacketV1& pkt) {
  // All channels default to invalid (JSON null) until corresponding drivers & board_config.h
  // pins/addresses are verified on physical hardware.
  pkt.packVoltage.clear();
  pkt.packCurrent.clear();
  pkt.power.clear();
  for (int i = 0; i < bv_config::kTempProbeCount; ++i) {
    pkt.temperatures[i].clear();
  }
  pkt.accelX.clear();
  pkt.accelY.clear();
  pkt.accelZ.clear();
  pkt.gyroX.clear();
  pkt.gyroY.clear();
  pkt.gyroZ.clear();

  // Compute derived power strictly when both voltage and current are valid
  if (pkt.packVoltage.valid && pkt.packCurrent.valid) {
    pkt.power.set(pkt.packVoltage.value * pkt.packCurrent.value);
  }
}

String serializePacketJson(const TelemetryPacketV1& pkt) {
  String json;
  json.reserve(512);
  json += "{\"schema_version\":\"";
  json += bv_config::kSchemaVersion;
  json += "\",\"device_id\":\"";
  json += bv_config::kDeviceId;
  json += "\",\"sequence\":";
  json += String(pkt.sequence);
  json += ",\"timestamp\":\"1970-01-01T00:00:00Z\"";  // Edge SBC attaches synchronized UTC or RTC time
  json += ",\"source\":\"";
  json += pkt.source;
  json += "\",\"pack_voltage\":";
  appendOptionalFloat(json, pkt.packVoltage, 3);
  json += ",\"pack_current\":";
  appendOptionalFloat(json, pkt.packCurrent, 3);
  json += ",\"power\":";
  appendOptionalFloat(json, pkt.power, 2);
  json += ",\"temperatures\":{\"TEMP-01\":";
  appendOptionalFloat(json, pkt.temperatures[0], 2);
  json += ",\"TEMP-02\":";
  appendOptionalFloat(json, pkt.temperatures[1], 2);
  json += ",\"TEMP-03\":";
  appendOptionalFloat(json, pkt.temperatures[2], 2);
  json += ",\"TEMP-04\":";
  appendOptionalFloat(json, pkt.temperatures[3], 2);
  json += "},\"accelerometer\":{\"x\":";
  appendOptionalFloat(json, pkt.accelX, 3);
  json += ",\"y\":";
  appendOptionalFloat(json, pkt.accelY, 3);
  json += ",\"z\":";
  appendOptionalFloat(json, pkt.accelZ, 3);
  json += "},\"gyroscope\":{\"x\":";
  appendOptionalFloat(json, pkt.gyroX, 2);
  json += ",\"y\":";
  appendOptionalFloat(json, pkt.gyroY, 2);
  json += ",\"z\":";
  appendOptionalFloat(json, pkt.gyroZ, 2);
  json += "},\"sensor_status\":{\"INA226\":\"NOT_CONFIGURED\",\"ACS758-50B\":\"NOT_CONFIGURED\",\"ADS1115\":\"NOT_CONFIGURED\",\"MPU6050\":\"NOT_CONFIGURED\",\"TEMP-01\":\"NOT_CONFIGURED\",\"TEMP-02\":\"NOT_CONFIGURED\",\"TEMP-03\":\"NOT_CONFIGURED\",\"TEMP-04\":\"NOT_CONFIGURED\"},\"validity\":{}}";
  return json;
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);
}

void loop() {
  const unsigned long now = millis();
  if (now - gLastSampleMs >= bv_config::kTelemetryIntervalMs) {
    gLastSampleMs = now;
    TelemetryPacketV1 pkt;
    pkt.sequence = ++gSequence;
    pkt.source = "SERIAL_HARDWARE";
    acquireSensors(pkt);
    Serial.println(serializePacketJson(pkt));
  }
}
