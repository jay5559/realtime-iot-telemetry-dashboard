import { Pool } from 'pg';
import { NewAlert } from './alertRules';
import { Alert, Telemetry } from './types';

/** Storage abstraction so the pipeline does not care where data lands. */
export interface TelemetryStore {
  saveReading(reading: Telemetry): Promise<void>;
  saveAlert(alert: NewAlert): Promise<Alert>;
  recentReadings(deviceId: string, limit: number): Promise<Telemetry[]>;
  recentAlerts(limit: number): Promise<Alert[]>;
}

/** Bounded in-memory store: zero-setup default for local demos. */
export class MemoryStore implements TelemetryStore {
  private readings = new Map<string, Telemetry[]>();
  private alerts: Alert[] = [];
  private nextAlertId = 1;

  constructor(private readonly maxPerDevice = 500, private readonly maxAlerts = 200) {}

  async saveReading(reading: Telemetry): Promise<void> {
    const list = this.readings.get(reading.deviceId) ?? [];
    list.push(reading);
    if (list.length > this.maxPerDevice) list.shift();
    this.readings.set(reading.deviceId, list);
  }

  async saveAlert(alert: NewAlert): Promise<Alert> {
    const saved: Alert = { ...alert, id: this.nextAlertId++ };
    this.alerts.push(saved);
    if (this.alerts.length > this.maxAlerts) this.alerts.shift();
    return saved;
  }

  async recentReadings(deviceId: string, limit: number): Promise<Telemetry[]> {
    return (this.readings.get(deviceId) ?? []).slice(-limit);
  }

  async recentAlerts(limit: number): Promise<Alert[]> {
    return this.alerts.slice(-limit).reverse();
  }
}

/** PostgreSQL / TimescaleDB store. Enabled when DATABASE_URL is set. */
export class PostgresStore implements TelemetryStore {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async saveReading(r: Telemetry): Promise<void> {
    await this.pool.query(
      `INSERT INTO telemetry (time, device_id, line, temperature_c, vibration_mm_s, pressure_bar, rpm)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [r.timestamp, r.deviceId, r.line, r.temperatureC, r.vibrationMmS, r.pressureBar, r.rpm],
    );
  }

  async saveAlert(a: NewAlert): Promise<Alert> {
    const { rows } = await this.pool.query(
      `INSERT INTO alerts (time, device_id, metric, severity, value, threshold, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [a.timestamp, a.deviceId, a.metric, a.severity, a.value, a.threshold, a.message],
    );
    return { ...a, id: Number(rows[0].id) };
  }

  async recentReadings(deviceId: string, limit: number): Promise<Telemetry[]> {
    const { rows } = await this.pool.query(
      `SELECT time, device_id, line, temperature_c, vibration_mm_s, pressure_bar, rpm
       FROM telemetry WHERE device_id = $1 ORDER BY time DESC LIMIT $2`,
      [deviceId, limit],
    );
    return rows
      .map((row) => ({
        deviceId: row.device_id as string,
        line: row.line as string,
        timestamp: new Date(row.time).toISOString(),
        temperatureC: Number(row.temperature_c),
        vibrationMmS: Number(row.vibration_mm_s),
        pressureBar: Number(row.pressure_bar),
        rpm: Number(row.rpm),
      }))
      .reverse();
  }

  async recentAlerts(limit: number): Promise<Alert[]> {
    const { rows } = await this.pool.query(
      `SELECT id, time, device_id, metric, severity, value, threshold, message
       FROM alerts ORDER BY time DESC LIMIT $1`,
      [limit],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      deviceId: row.device_id,
      metric: row.metric,
      severity: row.severity,
      value: Number(row.value),
      threshold: Number(row.threshold),
      timestamp: new Date(row.time).toISOString(),
      message: row.message,
    }));
  }
}
