#pragma once
/**
 * BattVision ESP32-S3 Board & Hardware Interface Configuration
 * Controller: PCBCupid Glyph ESP32-S3
 * Pack: BV-PACK-8S4P (8S4P LiFePO4, 32 x 32700, 25.6V nom, 24Ah, 614.4Wh, 29.2V full)
 *
 * CRITICAL SAFETY & VERIFICATION NOTICE:
 * - All GPIO pin assignments, I2C addresses, shunt constants, and ADC divider ratios
 *   below are intentionally marked TBD (-1 / 0) until verified on the physical bench circuit.
 * - NEVER connect raw 25.6V or 29.2V pack voltage directly to ADS1115 or ESP32-S3 pins.
 * - ACS758-50B is rated for +/-50 A nominal (NOT 100 A).
 * - JK Smart BMS (B1A8S10P) remains the sole independent battery protection system.
 */

namespace bv_config {

constexpr const char* kDeviceId = "BV-ESP32-01";
constexpr const char* kSchemaVersion = "1.0";

// Placeholder sentinel for unverified hardware parameters
constexpr int kPinTbd = -1;
constexpr uint8_t kI2cAddrTbd = 0x00;

// I2C Bus (INA226, ADS1115, MPU6050) — verify exact PCBCupid Glyph ESP32-S3 pinout
constexpr int kI2cSdaPin = kPinTbd;
constexpr int kI2cSclPin = kPinTbd;

// Unverified I2C addresses — confirm with I2C scanner on physical bench
constexpr uint8_t kIna226Address = kI2cAddrTbd;
constexpr uint8_t kAds1115Address = kI2cAddrTbd;
constexpr uint8_t kMpu6050Address = kI2cAddrTbd;

// 1-Wire Bus for 4x DS18B20 waterproof probes (external pull-up required)
constexpr int kOneWirePin = kPinTbd;
constexpr int kTempProbeCount = 4;

// ACS758-50B Conditioned Analog Calibration (verify supply voltage, divider, and zero-current offset)
constexpr float kAcs758NominalRangeA = 50.0f;
constexpr float kAcs758ZeroOffsetV = 0.0f;      // TBD: measure at 0 A on physical bench
constexpr float kAcs758SensitivityVPerA = 0.0f; // TBD: depends on 3.3V/5V supply & conditioning

// INA226 Shunt Configuration (verify shunt resistance & max bus rating before connecting to pack)
constexpr float kIna226ShuntOhms = 0.0f;        // TBD

// JK Smart BMS (B1A8S10P) — protocol, pinout, and galvanic isolation pending verification
constexpr bool kBmsEnabled = false;

// Sampling interval (configurable; adjust after bench timing validation)
constexpr unsigned long kTelemetryIntervalMs = 1000;

}  // namespace bv_config
