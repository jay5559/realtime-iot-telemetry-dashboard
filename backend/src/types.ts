import { z } from 'zod';

/** Payload published by an industrial gateway (mirrors an MQTT message body). */
export const TelemetrySchema = z.object({
  deviceId: z.string().min(1),
  line: z.string().min(1),
  timestamp: z.string().datetime(),
  temperatureC: z.number().min(-50).max(250),
  vibrationMmS: z.number().min(0).max(100),
  pressureBar: z.number().min(0).max(50),
  rpm: z.number().min(0).max(10000),
});

export type Telemetry = z.infer<typeof TelemetrySchema>;

export type Severity = 'warning' | 'critical';

export interface Alert {
  id: number;
  deviceId: string;
  metric: 'temperatureC' | 'vibrationMmS' | 'pressureBar';
  severity: Severity;
  value: number;
  threshold: number;
  timestamp: string;
  message: string;
}

export interface DeviceSummary {
  deviceId: string;
  line: string;
  lastSeen: string;
  latest: Telemetry;
  status: 'ok' | 'warning' | 'critical';
}
