import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, OnDestroy, computed, inject, signal } from '@angular/core';
import { Alert, DeviceSummary, Telemetry } from './models';

const API = '/api';
const HISTORY_LIMIT = 60;
const ALERT_LIMIT = 25;

/**
 * Holds all dashboard state as signals. Initial data comes from REST,
 * then live updates arrive over Server-Sent Events.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService implements OnDestroy {
  private http = inject(HttpClient);
  private zone = inject(NgZone);
  private source?: EventSource;

  readonly devices = signal<DeviceSummary[]>([]);
  readonly alerts = signal<Alert[]>([]);
  readonly history = signal<Record<string, Telemetry[]>>({});
  readonly connected = signal(false);

  readonly criticalCount = computed(() => this.devices().filter((d) => d.status === 'critical').length);
  readonly warningCount = computed(() => this.devices().filter((d) => d.status === 'warning').length);

  connect(): void {
    this.http.get<DeviceSummary[]>(`${API}/devices`).subscribe((devices) => {
      this.devices.set(devices);
      devices.forEach((d) => this.loadHistory(d.deviceId));
    });
    this.http.get<Alert[]>(`${API}/alerts?limit=${ALERT_LIMIT}`).subscribe((a) => this.alerts.set(a));
    this.openStream();
  }

  private loadHistory(deviceId: string): void {
    this.http
      .get<Telemetry[]>(`${API}/devices/${deviceId}/telemetry?limit=${HISTORY_LIMIT}`)
      .subscribe((rows) => this.history.update((h) => ({ ...h, [deviceId]: rows })));
  }

  private openStream(): void {
    this.source?.close();
    this.source = new EventSource(`${API}/stream`);
    this.source.onopen = () => this.zone.run(() => this.connected.set(true));
    this.source.onerror = () => this.zone.run(() => this.connected.set(false));
    this.source.addEventListener('reading', (e) =>
      this.zone.run(() => this.onReading(JSON.parse((e as MessageEvent).data) as DeviceSummary)),
    );
    this.source.addEventListener('alert', (e) =>
      this.zone.run(() => this.onAlert(JSON.parse((e as MessageEvent).data) as Alert)),
    );
  }

  /** Exposed (not private) so it can be unit tested without a live stream. */
  onReading(summary: DeviceSummary): void {
    this.devices.update((list) => {
      const others = list.filter((d) => d.deviceId !== summary.deviceId);
      return [...others, summary].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
    });
    this.history.update((h) => {
      const rows = [...(h[summary.deviceId] ?? []), summary.latest].slice(-HISTORY_LIMIT);
      return { ...h, [summary.deviceId]: rows };
    });
  }

  onAlert(alert: Alert): void {
    this.alerts.update((list) => [alert, ...list].slice(0, ALERT_LIMIT));
  }

  ngOnDestroy(): void {
    this.source?.close();
  }
}
