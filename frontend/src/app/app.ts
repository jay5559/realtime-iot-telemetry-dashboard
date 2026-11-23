import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { LineChart } from './line-chart';
import { METRICS, Metric } from './models';
import { TelemetryService } from './telemetry.service';

@Component({
  selector: 'app-root',
  imports: [DatePipe, DecimalPipe, LineChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly svc = inject(TelemetryService);
  protected readonly metrics = METRICS;

  protected readonly selectedId = signal<string | null>(null);
  protected readonly metric = signal<Metric>('temperatureC');

  /** Falls back to the first device until the user picks one. */
  protected readonly selected = computed(() => {
    const devices = this.svc.devices();
    return devices.find((d) => d.deviceId === this.selectedId()) ?? devices[0] ?? null;
  });

  protected readonly metricMeta = computed(() => METRICS.find((m) => m.key === this.metric())!);

  protected readonly chartValues = computed(() => {
    const dev = this.selected();
    if (!dev) return [];
    const key = this.metric();
    return (this.svc.history()[dev.deviceId] ?? []).map((r) => r[key]);
  });

  ngOnInit(): void {
    this.svc.connect();
  }

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected setMetric(key: Metric): void {
    this.metric.set(key);
  }
}
