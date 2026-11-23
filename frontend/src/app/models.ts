export interface Telemetry {
  deviceId: string;
  line: string;
  timestamp: string;
  temperatureC: number;
  vibrationMmS: number;
  pressureBar: number;
  rpm: number;
}

export type Status = 'ok' | 'warning' | 'critical';

export interface DeviceSummary {
  deviceId: string;
  line: string;
  lastSeen: string;
  latest: Telemetry;
  status: Status;
}

export interface Alert {
  id: number;
  deviceId: string;
  metric: 'temperatureC' | 'vibrationMmS' | 'pressureBar';
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  timestamp: string;
  message: string;
}

export type Metric = 'temperatureC' | 'vibrationMmS' | 'pressureBar' | 'rpm';

export const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'temperatureC', label: 'Temperature', unit: '°C' },
  { key: 'vibrationMmS', label: 'Vibration', unit: 'mm/s' },
  { key: 'pressureBar', label: 'Pressure', unit: 'bar' },
  { key: 'rpm', label: 'Speed', unit: 'rpm' },
];
