# Plant Telemetry Dashboard

A small full-stack **Industrial IoT** project: simulated machines publish telemetry, a Node.js/TypeScript backend validates, stores and evaluates it, and an Angular dashboard shows live readings and alerts.

## Architecture

```
 Gateways (simulated)        Backend (Node.js + TypeScript)                       Browser
┌──────────────────┐   ┌──────────────────────────────────────────┐    ┌──────────────────────┐
│ PUMP / MOTOR /   │   │ MessageBus ──► IngestionPipeline         │    │ Angular (signals)    │
│ COMPRESSOR /     │──►│   (MQTT-style      │ 1. validate (zod)   │    │  • device cards      │
│ TURBINE          │   │    topic)          │ 2. persist          │ SSE│  • live trend chart  │
│ + POST /api/     │   │                    │ 3. evaluate rules   │───►│  • alerts table      │
│   telemetry      │   │                    │ 4. fan out events   │    └──────────────────────┘
└──────────────────┘   │ REST API + Server-Sent Events            │
                       │ Store: Memory │ PostgreSQL/TimescaleDB   │
                       └──────────────────────────────────────────┘
```

## What it demonstrates

| Requirement | Where |
| --- | --- |
| Angular (standalone components, signals, OnPush) | `frontend/src/app` |
| Node.js + TypeScript REST APIs | `backend/src/index.ts` |
| Event-driven architecture (MQTT/Pub/Sub style) | `backend/src/pipeline.ts` |
| Real-time streaming to the UI | Server-Sent Events (`/api/stream`) |
| PostgreSQL / TimescaleDB time-series | `backend/schema.sql`, `backend/src/store.ts` |
| Clean design, testability | pure `evaluate()` rules, `TelemetryStore` interface |
| Unit tests | `backend/test`, `frontend/src/app/*.spec.ts` |
| Docker / CI-CD readiness | `docker-compose.yml`, both `Dockerfile`s |

## Run locally (no database needed)

```bash
# terminal 1
cd backend && npm install && npm run dev      # http://localhost:3000

# terminal 2
cd frontend && npm install && npm start       # http://localhost:4200
```

The dev server proxies `/api` to the backend. Without `DATABASE_URL` the backend uses an in-memory store.

## Run everything with Docker (TimescaleDB included)

```bash
docker compose up --build
# open http://localhost:8080
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Accepted / rejected message counters |
| GET | `/api/devices` | Latest state and status per device |
| GET | `/api/devices/:id/telemetry?limit=60` | Recent readings |
| GET | `/api/alerts?limit=25` | Recent alerts |
| POST | `/api/telemetry` | HTTP ingestion for gateways without MQTT |
| GET | `/api/stream` | SSE stream of `reading` and `alert` events |

Example ingestion:

```bash
curl -X POST localhost:3000/api/telemetry -H 'content-type: application/json' -d '{
  "deviceId":"PUMP-101","line":"Line-A","timestamp":"2026-01-01T10:00:00Z",
  "temperatureC":97,"vibrationMmS":4,"pressureBar":5.5,"rpm":1450
}'
```

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Possible extensions

- Replace `MessageBus` with a real MQTT client (`mqtt`) or GCP Pub/Sub subscriber.
- Stream readings into BigQuery via Dataflow for long-term analytics.
- Add JWT auth, rate limiting, and OpenTelemetry tracing.
- Deploy to Cloud Run / GKE with a CI pipeline.
