import {
  CanonicalCsvField,
  CSVColumnMapping,
  DataImportResult,
  TelemetryRecord,
} from '../types/datalab';
import { formatTimeShort } from './simulationService';

export const CANONICAL_CSV_FIELDS: { field: CanonicalCsvField; label: string }[] = [
  { field: '__unmapped__', label: '— Ignore / Unmapped —' },
  { field: 'timestamp', label: 'timestamp (ISO / Epoch / HH:MM:SS)' },
  { field: 'pack_voltage', label: 'pack_voltage (V)' },
  { field: 'pack_current', label: 'pack_current (A)' },
  { field: 'power', label: 'power (W)' },
  { field: 'state_of_charge', label: 'state_of_charge (%)' },
  { field: 'temperature_1', label: 'temperature_1 (°C)' },
  { field: 'temperature_2', label: 'temperature_2 (°C)' },
  { field: 'temperature_3', label: 'temperature_3 (°C)' },
  { field: 'temperature_4', label: 'temperature_4 (°C)' },
  { field: 'acceleration_x', label: 'acceleration_x (g)' },
  { field: 'acceleration_y', label: 'acceleration_y (g)' },
  { field: 'acceleration_z', label: 'acceleration_z (g)' },
  { field: 'gyroscope_x', label: 'gyroscope_x (°/s)' },
  { field: 'gyroscope_y', label: 'gyroscope_y (°/s)' },
  { field: 'gyroscope_z', label: 'gyroscope_z (°/s)' },
  { field: 'cycle_number', label: 'cycle_number' },
  { field: 'discharge_capacity', label: 'discharge_capacity (Ah)' },
];

const MAX_CSV_BYTES = 15 * 1024 * 1024; // 15 MB safety guard
const MAX_PARSED_ROWS = 20000;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function guessCanonicalField(header: string): CanonicalCsvField {
  const h = header.toLowerCase().replace(/[\s\-()]/g, '_');
  if (h.includes('timestamp') || h === 'time' || h === 'epoch_ms' || h === 'date') return 'timestamp';
  if (h.includes('pack_volt') || h === 'voltage' || h === 'v_pack' || h === 'voltage_v') return 'pack_voltage';
  if (h.includes('pack_curr') || h === 'current' || h === 'i_pack' || h === 'current_a') return 'pack_current';
  if (h.includes('power') || h === 'p_w') return 'power';
  if (h.includes('soc') || h.includes('state_of_charge')) return 'state_of_charge';
  if (h.includes('temp1') || h.includes('temperature_1') || h === 't1' || h === 'temp_1') return 'temperature_1';
  if (h.includes('temp2') || h.includes('temperature_2') || h === 't2' || h === 'temp_2') return 'temperature_2';
  if (h.includes('temp3') || h.includes('temperature_3') || h === 't3' || h === 'temp_3') return 'temperature_3';
  if (h.includes('temp4') || h.includes('temperature_4') || h === 't4' || h === 'temp_4') return 'temperature_4';
  if (h.includes('acc_x') || h.includes('acceleration_x')) return 'acceleration_x';
  if (h.includes('acc_y') || h.includes('acceleration_y')) return 'acceleration_y';
  if (h.includes('acc_z') || h.includes('acceleration_z')) return 'acceleration_z';
  if (h.includes('gyro_x') || h.includes('gyroscope_x')) return 'gyroscope_x';
  if (h.includes('gyro_y') || h.includes('gyroscope_y')) return 'gyroscope_y';
  if (h.includes('gyro_z') || h.includes('gyroscope_z')) return 'gyroscope_z';
  if (h.includes('cycle')) return 'cycle_number';
  if (h.includes('capacity') || h.includes('cap_ah')) return 'discharge_capacity';
  return '__unmapped__';
}

export function parseTimestampValue(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{13}$/.test(s)) return Number(s);
  if (/^\d{10}$/.test(s)) return Number(s) * 1000;
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return parsed;
  // Support HH:MM:SS relative to today
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) {
    const today = new Date().toISOString().slice(0, 10);
    const t = Date.parse(`${today}T${s}`);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function parseAndValidateCsv(
  filename: string,
  fileSizeBytes: number,
  content: string
): DataImportResult {
  const fail = (error: string): DataImportResult => ({
    ok: false,
    error,
    filename,
    fileSizeBytes,
    totalRows: 0,
    headers: [],
    detectedTypes: {},
    previewRows: [],
    rawRows: [],
    suggestedMapping: {},
    warnings: [],
    missingCount: 0,
    duplicateTimestamps: 0,
    invalidTimestamps: 0,
  });

  if (!filename.toLowerCase().endsWith('.csv')) {
    return fail('Unsupported file type. Please select a valid .csv file.');
  }
  if (fileSizeBytes > MAX_CSV_BYTES) {
    return fail('File exceeds 15 MB browser preview limit. Split or pre-filter the CSV file.');
  }
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return fail('CSV must contain a header row and at least one data row.');
  }

  const headers = parseCsvLine(lines[0]).filter((h) => h.length > 0);
  if (headers.length < 2) {
    return fail('Invalid CSV structure: fewer than 2 comma-separated columns detected.');
  }

  const warnings: string[] = [];
  const dataLines = lines.slice(1, MAX_PARSED_ROWS + 1);
  if (lines.length - 1 > MAX_PARSED_ROWS) {
    warnings.push(`File truncated to first ${MAX_PARSED_ROWS.toLocaleString()} rows for responsive UI preview.`);
  }

  const rawRows: Record<string, string>[] = [];
  let missingCount = 0;

  for (const line of dataLines) {
    const cells = parseCsvLine(line);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const val = cells[idx] ?? '';
      rowObj[h] = val;
      if (val === '' || val.toLowerCase() === 'nan' || val.toLowerCase() === 'null') {
        missingCount++;
      }
    });
    rawRows.push(rowObj);
  }

  const suggestedMapping: CSVColumnMapping = {};
  const detectedTypes: Record<string, 'timestamp' | 'number' | 'string'> = {};

  for (const h of headers) {
    const mapped = guessCanonicalField(h);
    suggestedMapping[h] = mapped;

    const sampleVals = rawRows
      .slice(0, 30)
      .map((r) => r[h])
      .filter((v) => v !== '');

    if (sampleVals.length === 0) {
      detectedTypes[h] = 'string';
      continue;
    }

    const numericMatches = sampleVals.filter((v) => !Number.isNaN(Number(v))).length;
    const tsMatches = sampleVals.filter((v) => parseTimestampValue(v) !== null).length;

    if (mapped === 'timestamp' || (tsMatches / sampleVals.length >= 0.8 && numericMatches < sampleVals.length)) {
      detectedTypes[h] = 'timestamp';
    } else if (numericMatches / sampleVals.length >= 0.85) {
      detectedTypes[h] = 'number';
    } else {
      detectedTypes[h] = 'string';
    }

    if (mapped === '__unmapped__') {
      warnings.push(`Unsupported or unrecognized column "${h}" (will remain unmapped unless assigned).`);
    }
  }

  // Validate timestamps & duplicates on mapped timestamp column
  const tsHeader = headers.find((h) => suggestedMapping[h] === 'timestamp');
  let invalidTimestamps = 0;
  let duplicateTimestamps = 0;

  if (!tsHeader) {
    warnings.push('No timestamp column automatically detected — assign one via column mapping.');
  } else {
    const seen = new Set<number>();
    for (const row of rawRows) {
      const parsed = parseTimestampValue(row[tsHeader]);
      if (parsed === null) {
        invalidTimestamps++;
      } else if (seen.has(parsed)) {
        duplicateTimestamps++;
      } else {
        seen.add(parsed);
      }
    }
    if (invalidTimestamps > 0) {
      warnings.push(`${invalidTimestamps} row(s) have invalid or unparseable timestamps.`);
    }
    if (duplicateTimestamps > 0) {
      warnings.push(`${duplicateTimestamps} duplicate timestamp(s) detected.`);
    }
  }

  return {
    ok: true,
    filename,
    fileSizeBytes,
    totalRows: rawRows.length,
    headers,
    detectedTypes,
    previewRows: rawRows.slice(0, 10),
    rawRows,
    suggestedMapping,
    warnings,
    missingCount,
    duplicateTimestamps,
    invalidTimestamps,
  };
}

function toNum(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Converts raw CSV rows using user-confirmed column mapping into normalized TelemetryRecords
 * without mutating original raw rows.
 */
export function applyColumnMappingToRecords(
  rawRows: Record<string, string>[],
  mapping: CSVColumnMapping
): TelemetryRecord[] {
  const inverse: Partial<Record<CanonicalCsvField, string>> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (target !== '__unmapped__' && !inverse[target]) {
      inverse[target] = header;
    }
  }

  const baseNow = Date.now() - rawRows.length * 1000;

  return rawRows.map((row, idx) => {
    const tsRaw = inverse.timestamp ? row[inverse.timestamp] : '';
    const parsedTs = parseTimestampValue(tsRaw);
    const epochMs = parsedTs ?? baseNow + idx * 1000;

    const v = toNum(inverse.pack_voltage ? row[inverse.pack_voltage] : undefined);
    const i = toNum(inverse.pack_current ? row[inverse.pack_current] : undefined);
    const pRaw = toNum(inverse.power ? row[inverse.power] : undefined);
    const p = pRaw !== null ? pRaw : v !== null && i !== null ? Number((v * i).toFixed(1)) : null;

    return {
      epochMs,
      timestamp: parsedTs !== null ? new Date(epochMs).toISOString() : tsRaw || new Date(epochMs).toISOString(),
      timeLabel: formatTimeShort(epochMs),
      packVoltage: v,
      packCurrent: i,
      power: p,
      stateOfCharge: toNum(inverse.state_of_charge ? row[inverse.state_of_charge] : undefined),
      temperature1: toNum(inverse.temperature_1 ? row[inverse.temperature_1] : undefined),
      temperature2: toNum(inverse.temperature_2 ? row[inverse.temperature_2] : undefined),
      temperature3: toNum(inverse.temperature_3 ? row[inverse.temperature_3] : undefined),
      temperature4: toNum(inverse.temperature_4 ? row[inverse.temperature_4] : undefined),
      accelerationX: toNum(inverse.acceleration_x ? row[inverse.acceleration_x] : undefined),
      accelerationY: toNum(inverse.acceleration_y ? row[inverse.acceleration_y] : undefined),
      accelerationZ: toNum(inverse.acceleration_z ? row[inverse.acceleration_z] : undefined),
      gyroscopeX: toNum(inverse.gyroscope_x ? row[inverse.gyroscope_x] : undefined),
      gyroscopeY: toNum(inverse.gyroscope_y ? row[inverse.gyroscope_y] : undefined),
      gyroscopeZ: toNum(inverse.gyroscope_z ? row[inverse.gyroscope_z] : undefined),
      cycleNumber: toNum(inverse.cycle_number ? row[inverse.cycle_number] : undefined),
      dischargeCapacityAh: toNum(
        inverse.discharge_capacity ? row[inverse.discharge_capacity] : undefined
      ),
      source: 'DEMO',
    };
  });
}
