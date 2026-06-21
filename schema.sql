-- Haritha Fresh — database schema (Vercel/serverless version)
-- Run this once in your Supabase project's SQL editor (or any Postgres client).
-- It is safe to re-run (IF NOT EXISTS) — if you already ran the original
-- schema.sql, just run this one too; it only adds the new `live_locations`
-- table, everything else is unchanged.

CREATE TABLE IF NOT EXISTS vegetables (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '🥗',
  price      NUMERIC NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'kg',
  stock      INTEGER NOT NULL DEFAULT 0,
  available  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS partners (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  phone   TEXT NOT NULL,
  online  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  items           JSONB NOT NULL,
  customer        JSONB NOT NULL,
  payment_method  TEXT,
  payment_status  TEXT,
  subtotal        NUMERIC,
  fee             NUMERIC,
  total           NUMERIC,
  status          TEXT NOT NULL,
  partner_id      TEXT,
  placed_at       BIGINT NOT NULL,
  history         JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS customers (
  phone          TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_credentials (
  partner_id     TEXT PRIMARY KEY,
  password_hash  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

-- NEW for the Vercel/serverless version: serverless functions don't share
-- memory between requests, so a customer's live GPS ping (while a rider is
-- en route) has to be persisted somewhere shared instead of an in-memory
-- object. This table holds only the CURRENT position per order — it's
-- overwritten on every ping, and rows are deleted automatically once that
-- order is no longer being delivered (see /api/index.js).
CREATE TABLE IF NOT EXISTS live_locations (
  order_id    TEXT PRIMARY KEY,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  updated_at  BIGINT NOT NULL
);
