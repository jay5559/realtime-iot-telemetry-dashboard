import { MessageBus, TELEMETRY_TOPIC } from './pipeline';
import { Telemetry } from './types';

interface SimDevice {
  deviceId: string;
  line: string;
  baseTemp: number;
  baseVib: number;
  basePressure: number;
  baseRpm: number;
  phase: number;
}

const DEVICES: SimDevice[] = [
  { deviceId: 'PUMP-101', line: 'Line-A', baseTemp: 62, baseVib: 3.2, basePressure: 5.5, baseRpm: 1450, phase: 0 },
  { deviceId: 'MOTOR-202', line: 'Line-A', baseTemp: 70, baseVib: 4.0, basePressure: 4.8, baseRpm: 2980, phase: 1.5 },
  { deviceId: 'COMPRESSOR-303', line: 'Line-B', baseTemp: 75, baseVib: 5.0, basePressure: 7.2, baseRpm: 3550, phase: 3 },
  { deviceId: 'TURBINE-404', line: 'Line-B', baseTemp: 68, baseVib: 3.8, basePressure: 6.1, baseRpm: 5200, phase: 4.5 },
];

const noise = (amplitude: number) => (Math.random() - 0.5) * 2 * amplitude;

/**
 * Simulates industrial gateways publishing telemetry onto the bus.
 * Occasionally injects a spike so alerts are visible in the demo.
 */
export function startSimulator(bus: MessageBus, intervalMs = 1000): () => void {
  let tick = 0;
  const timer = setInterval(() => {
    tick++;
    for (const d of DEVICES) {
      const wave = Math.sin(tick / 12 + d.phase);
      const spike = Math.random() < 0.03 ? 1 + Math.random() * 0.35 : 1;
      const reading: Telemetry = {
        deviceId: d.deviceId,
        line: d.line,
        timestamp: new Date().toISOString(),
        temperatureC: round((d.baseTemp + wave * 6 + noise(1.2)) * spike),
        vibrationMmS: round(Math.max(0, (d.baseVib + wave * 1.1 + noise(0.4)) * spike)),
        pressureBar: round(Math.max(0, d.basePressure + wave * 0.8 + noise(0.2))),
        rpm: Math.round(d.baseRpm + noise(25)),
      };
      bus.publish(TELEMETRY_TOPIC, reading);
    }
  }, intervalMs);
  return () => clearInterval(timer);
}

const round = (n: number) => Math.round(n * 10) / 10;
