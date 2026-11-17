import {
  DataQualityReport,
  DatasetMetadata,
  ExperimentSession,
  LabCapacityTestRecord,
  TelemetryRecord,
} from '../types/datalab';

export interface ExportOutcome {
  ok: boolean;
  filename: string;
  recordCount: number;
  message: string;
}

function triggerDownload(filename: string, content: string, mimeType: string): ExportOutcome {
  try {
    if (!content || content.trim().length === 0) {
      return { ok: false, filename, recordCount: 0, message: 'Export failed: generated file was empty.' };
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true, filename, recordCount: 0, message: `Exported ${filename}` };
  } catch (err) {
    return {
      ok: false,
      filename,
      recordCount: 0,
      message: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

export function exportTelemetryRecordsCsv(
  records: TelemetryRecord[],
  prefix = 'battvision_historical_telemetry'
): ExportOutcome {
  const filename = `${prefix}_${Date.now()}.csv`;
  if (!records.length) {
    return { ok: false, filename, recordCount: 0, message: 'No telemetry records available to export.' };
  }
  const header =
    'timestamp,pack_voltage,pack_current,power,state_of_charge,temperature_1,temperature_2,temperature_3,temperature_4,acceleration_x,acceleration_y,acceleration_z,gyroscope_x,gyroscope_y,gyroscope_z,source\n';
  const rows = records
    .map((r) =>
      [
        r.timestamp,
        r.packVoltage ?? '',
        r.packCurrent ?? '',
        r.power ?? '',
        r.stateOfCharge ?? '',
        r.temperature1 ?? '',
        r.temperature2 ?? '',
        r.temperature3 ?? '',
        r.temperature4 ?? '',
        r.accelerationX ?? '',
        r.accelerationY ?? '',
        r.accelerationZ ?? '',
        r.gyroscopeX ?? '',
        r.gyroscopeY ?? '',
        r.gyroscopeZ ?? '',
        r.source,
      ].join(',')
    )
    .join('\n');

  const res = triggerDownload(filename, header + rows + '\n', 'text/csv;charset=utf-8;');
  return { ...res, recordCount: records.length };
}

export function exportExperimentSessionCsv(session: ExperimentSession): ExportOutcome {
  const safeId = session.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filename = `battvision_experiment_${safeId}_${Date.now()}.csv`;
  const header =
    'experiment_id,title,pack_id,category,status,start_timestamp,end_timestamp,sample_count,data_source,simulated,test_conditions,description,notes\n';
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const row = [
    session.id,
    esc(session.title),
    session.packId,
    esc(session.category),
    session.status,
    session.startTimestamp,
    session.endTimestamp ?? '',
    session.sampleCount,
    session.dataSource,
    session.simulated ? 'DEMO' : 'HARDWARE',
    esc(session.testConditions),
    esc(session.description),
    esc(session.notes.join(' | ')),
  ].join(',');

  const res = triggerDownload(filename, header + row + '\n', 'text/csv;charset=utf-8;');
  return { ...res, recordCount: 1 };
}

export function exportCapacityTestsCsv(tests: LabCapacityTestRecord[]): ExportOutcome {
  const filename = `battvision_capacity_tests_${Date.now()}.csv`;
  if (!tests.length) {
    return { ok: false, filename, recordCount: 0, message: 'No capacity test records available to export.' };
  }
  const header =
    'test_id,pack_id,test_date,test_temperature_c,starting_soc_pct,discharge_profile,duration_min,measured_capacity_ah,measured_energy_wh,reference_capacity_ah,calculated_soh_pct,validation_status,data_source\n';
  const rows = tests
    .map((t) => {
      const soh = ((t.measuredCapacityAh / t.referenceCapacityAh) * 100).toFixed(2);
      return [
        t.testId,
        t.packId,
        t.testDate,
        t.testTemperatureC ?? '',
        t.startingSocPct ?? '',
        `"${t.dischargeCurrentProfile.replace(/"/g, '""')}"`,
        t.testDurationMin,
        t.measuredCapacityAh,
        t.measuredEnergyWh ?? '',
        t.referenceCapacityAh,
        soh,
        t.validationStatus,
        t.dataSource,
      ].join(',');
    })
    .join('\n');

  const res = triggerDownload(filename, header + rows + '\n', 'text/csv;charset=utf-8;');
  return { ...res, recordCount: tests.length };
}

export function exportDatasetMetadataJson(datasets: DatasetMetadata[]): ExportOutcome {
  const filename = `battvision_dataset_metadata_${Date.now()}.json`;
  const sanitized = datasets.map(({ records: _r, ...meta }) => meta);
  const res = triggerDownload(
    filename,
    JSON.stringify({ exportedAt: new Date().toISOString(), datasets: sanitized }, null, 2),
    'application/json;charset=utf-8;'
  );
  return { ...res, recordCount: sanitized.length };
}

export function exportQualityReportJson(report: DataQualityReport): ExportOutcome {
  const filename = `battvision_data_quality_${Date.now()}.json`;
  const res = triggerDownload(
    filename,
    JSON.stringify({ exportedAt: new Date().toISOString(), report }, null, 2),
    'application/json;charset=utf-8;'
  );
  return { ...res, recordCount: report.totalRecords };
}
