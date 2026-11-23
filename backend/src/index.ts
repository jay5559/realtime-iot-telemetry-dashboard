import cors from 'cors';
import express, { Request, Response } from 'express';
import { IngestionPipeline, MessageBus, TELEMETRY_TOPIC } from './pipeline';
import { startSimulator } from './simulator';
import { MemoryStore, PostgresStore, TelemetryStore } from './store';

const PORT = Number(process.env.PORT ?? 3000);

const store: TelemetryStore = process.env.DATABASE_URL
  ? new PostgresStore(process.env.DATABASE_URL)
  : new MemoryStore();
console.log(`Storage: ${process.env.DATABASE_URL ? 'PostgreSQL/TimescaleDB' : 'in-memory'}`);

const bus = new MessageBus();
const pipeline = new IngestionPipeline(store, bus);

if (process.env.SIMULATOR !== 'off') startSimulator(bus, Number(process.env.SIM_INTERVAL_MS ?? 1000));

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', accepted: pipeline.accepted, rejected: pipeline.rejected });
});

app.get('/api/devices', (_req, res) => {
  res.json(pipeline.listDevices());
});

app.get('/api/devices/:id/telemetry', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 500);
  res.json(await store.recentReadings(req.params.id, limit));
});

app.get('/api/alerts', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 200);
  res.json(await store.recentAlerts(limit));
});

/** HTTP ingestion endpoint for gateways that cannot speak MQTT. */
app.post('/api/telemetry', (req, res) => {
  bus.publish(TELEMETRY_TOPIC, req.body);
  res.status(202).json({ accepted: true });
});

/** Server-Sent Events: pushes live readings and alerts to the browser. */
app.get('/api/stream', (req: Request, res: Response) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const onReading = (d: unknown) => send('reading', d);
  const onAlert = (a: unknown) => send('alert', a);
  pipeline.on('reading', onReading);
  pipeline.on('alert', onAlert);

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(heartbeat);
    pipeline.off('reading', onReading);
    pipeline.off('alert', onAlert);
  });
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
