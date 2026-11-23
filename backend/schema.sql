-- PostgreSQL schema. Uses TimescaleDB hypertables when the extension is available
-- (the docker-compose image ships with it), and falls back to plain tables otherwise.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS telemetry (
  time            TIMESTAMPTZ      NOT NULL,
  device_id       TEXT             NOT NULL,
  line            TEXT             NOT NULL,
  temperature_c   DOUBLE PRECISION NOT NULL,
  vibration_mm_s  DOUBLE PRECISION NOT NULL,
  pressure_bar    DOUBLE PRECISION NOT NULL,
  rpm             INTEGER          NOT NULL
);

SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry (device_id, time DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id         BIGSERIAL PRIMARY KEY,
  time       TIMESTAMPTZ      NOT NULL,
  device_id  TEXT             NOT NULL,
  metric     TEXT             NOT NULL,
  severity   TEXT             NOT NULL CHECK (severity IN ('warning', 'critical')),
  value      DOUBLE PRECISION NOT NULL,
  threshold  DOUBLE PRECISION NOT NULL,
  message    TEXT             NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts (time DESC);

-- Example analytics query: 1-minute averages per device (TimescaleDB time_bucket).
-- SELECT time_bucket('1 minute', time) AS minute, device_id, avg(temperature_c)
-- FROM telemetry WHERE time > now() - interval '1 hour'
-- GROUP BY minute, device_id ORDER BY minute;
