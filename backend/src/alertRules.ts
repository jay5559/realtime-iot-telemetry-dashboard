import { Alert, Severity, Telemetry } from './types';

interface Rule {
  metric: Alert['metric'];
  label: string;
  warning: number;
  critical: number;
}

export const RULES: Rule[] = [
  { metric: 'temperatureC', label: 'Temperature', warning: 80, critical: 95 },
  { metric: 'vibrationMmS', label: 'Vibration', warning: 7, critical: 11 },
  { metric: 'pressureBar', label: 'Pressure', warning: 8, critical: 10 },
];

export type NewAlert = Omit<Alert, 'id'>;

/**
 * Pure function: evaluates one telemetry reading against threshold rules.
 * Keeping it side-effect free makes it trivial to unit test.
 */
export function evaluate(reading: Telemetry): NewAlert[] {
  const alerts: NewAlert[] = [];
  for (const rule of RULES) {
    const value = reading[rule.metric];
    let severity: Severity | null = null;
    let threshold = 0;
    if (value >= rule.critical) {
      severity = 'critical';
      threshold = rule.critical;
    } else if (value >= rule.warning) {
      severity = 'warning';
      threshold = rule.warning;
    }
    if (severity) {
      alerts.push({
        deviceId: reading.deviceId,
        metric: rule.metric,
        severity,
        value,
        threshold,
        timestamp: reading.timestamp,
        message: `${rule.label} ${value.toFixed(1)} exceeded ${severity} threshold ${threshold}`,
      });
    }
  }
  return alerts;
}

export function statusOf(alerts: NewAlert[]): 'ok' | 'warning' | 'critical' {
  if (alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (alerts.length > 0) return 'warning';
  return 'ok';
}
