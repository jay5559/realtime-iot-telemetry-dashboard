import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { Alert, DeviceSummary } from './models';
import { TelemetryService } from './telemetry.service';

const summary = (deviceId: string, temp: number): DeviceSummary => ({
  deviceId,
  line: 'Line-A',
  lastSeen: new Date().toISOString(),
  status: 'ok',
  latest: {
    deviceId,
    line: 'Line-A',
    timestamp: new Date().toISOString(),
    temperatureC: temp,
    vibrationMmS: 3,
    pressureBar: 5,
    rpm: 1450,
  },
});

describe('TelemetryService', () => {
  let svc: TelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    svc = TestBed.inject(TelemetryService);
  });

  it('replaces a device on new readings and keeps devices sorted', () => {
    svc.onReading(summary('B', 60));
    svc.onReading(summary('A', 61));
    svc.onReading(summary('B', 65));
    expect(svc.devices().map((d) => d.deviceId)).toEqual(['A', 'B']);
    expect(svc.devices()[1].latest.temperatureC).toBe(65);
  });

  it('caps history at 60 points per device', () => {
    for (let i = 0; i < 80; i++) svc.onReading(summary('A', i));
    expect(svc.history()['A'].length).toBe(60);
    expect(svc.history()['A'][59].temperatureC).toBe(79);
  });

  it('prepends alerts and counts critical devices', () => {
    const alert: Alert = {
      id: 1, deviceId: 'A', metric: 'temperatureC', severity: 'critical',
      value: 99, threshold: 95, timestamp: new Date().toISOString(), message: 'hot',
    };
    svc.onAlert(alert);
    expect(svc.alerts()[0].id).toBe(1);

    svc.onReading({ ...summary('A', 99), status: 'critical' });
    expect(svc.criticalCount()).toBe(1);
  });
});
