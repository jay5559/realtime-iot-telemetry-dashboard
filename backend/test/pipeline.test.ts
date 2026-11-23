import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluate, statusOf } from '../src/alertRules';
import { IngestionPipeline, MessageBus, TELEMETRY_TOPIC } from '../src/pipeline';
import { MemoryStore } from '../src/store';
import { Telemetry } from '../src/types';

const base: Telemetry = {
  deviceId: 'PUMP-1',
  line: 'Line-A',
  timestamp: new Date().toISOString(),
  temperatureC: 60,
  vibrationMmS: 3,
  pressureBar: 5,
  rpm: 1450,
};

describe('alert rules', () => {
  it('returns no alerts for normal readings', () => {
    assert.deepEqual(evaluate(base), []);
  });

  it('raises a warning and a critical at the right thresholds', () => {
    const warn = evaluate({ ...base, temperatureC: 85 });
    assert.equal(warn.length, 1);
    assert.equal(warn[0].severity, 'warning');

    const crit = evaluate({ ...base, vibrationMmS: 12 });
    assert.equal(crit[0].severity, 'critical');
    assert.equal(statusOf(crit), 'critical');
  });
});

describe('ingestion pipeline', () => {
  it('stores valid readings, emits alerts and rejects invalid payloads', async () => {
    const bus = new MessageBus();
    const store = new MemoryStore();
    const pipeline = new IngestionPipeline(store, bus);
    const alerts: unknown[] = [];
    pipeline.on('alert', (a) => alerts.push(a));

    assert.equal(await pipeline.handle({ ...base, temperatureC: 99 }), true);
    assert.equal(await pipeline.handle({ nonsense: true }), false);

    assert.equal(pipeline.accepted, 1);
    assert.equal(pipeline.rejected, 1);
    assert.equal(alerts.length, 1);
    assert.equal((await store.recentReadings('PUMP-1', 10)).length, 1);
    assert.equal(pipeline.listDevices()[0].status, 'critical');
  });

  it('consumes messages published on the bus', async () => {
    const bus = new MessageBus();
    const store = new MemoryStore();
    new IngestionPipeline(store, bus);
    bus.publish(TELEMETRY_TOPIC, base);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal((await store.recentReadings('PUMP-1', 10)).length, 1);
  });
});
