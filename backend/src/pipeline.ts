import { EventEmitter } from 'node:events';
import { evaluate, statusOf } from './alertRules';
import { TelemetryStore } from './store';
import { Alert, DeviceSummary, Telemetry, TelemetrySchema } from './types';

/**
 * Lightweight stand-in for a message broker (MQTT / Pub/Sub / Kafka).
 * Gateways publish to a topic; the ingestion consumer subscribes.
 * Swapping this for a real broker only touches this file.
 */
export class MessageBus extends EventEmitter {
  publish(topic: string, payload: unknown): void {
    this.emit(topic, payload);
  }
  subscribe(topic: string, handler: (payload: unknown) => void): void {
    this.on(topic, handler);
  }
}

export const TELEMETRY_TOPIC = 'plant/+/telemetry';

export interface PipelineEvents {
  reading: (summary: DeviceSummary) => void;
  alert: (alert: Alert) => void;
}

/** Validates, persists, evaluates and fans out every incoming reading. */
export class IngestionPipeline extends EventEmitter {
  private devices = new Map<string, DeviceSummary>();
  public rejected = 0;
  public accepted = 0;

  constructor(private readonly store: TelemetryStore, bus: MessageBus) {
    super();
    bus.subscribe(TELEMETRY_TOPIC, (payload) => {
      this.handle(payload).catch((err) => console.error('ingest error', err));
    });
  }

  async handle(payload: unknown): Promise<boolean> {
    const parsed = TelemetrySchema.safeParse(payload);
    if (!parsed.success) {
      this.rejected++;
      return false;
    }
    const reading: Telemetry = parsed.data;
    this.accepted++;

    await this.store.saveReading(reading);

    const newAlerts = evaluate(reading);
    const savedAlerts: Alert[] = [];
    for (const a of newAlerts) savedAlerts.push(await this.store.saveAlert(a));

    const summary: DeviceSummary = {
      deviceId: reading.deviceId,
      line: reading.line,
      lastSeen: reading.timestamp,
      latest: reading,
      status: statusOf(newAlerts),
    };
    this.devices.set(reading.deviceId, summary);

    this.emit('reading', summary);
    for (const a of savedAlerts) this.emit('alert', a);
    return true;
  }

  listDevices(): DeviceSummary[] {
    return [...this.devices.values()].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  }
}
