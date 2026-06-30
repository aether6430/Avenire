#!/usr/bin/env node
import process from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const requireFromWorkspace = createRequire(resolve(process.cwd(), "package.json"));
const { DurableStreamTestServer } = requireFromWorkspace("@durable-streams/server");

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), "../../.env"));

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65_535
    ? parsed
    : fallback;
}

function parseDurationMs(value, fallback) {
  if (!value) return fallback;

  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i);
  if (!match) return fallback;

  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] ?? "ms").toLowerCase();

  if (unit === "m") return Math.round(amount * 60_000);
  if (unit === "s") return Math.round(amount * 1_000);
  return Math.round(amount);
}

const port = parsePort(process.env.PORT ?? process.env.DURABLE_STREAMS_PORT, 4437);
const host = process.env.DURABLE_STREAMS_HOST?.trim() || "127.0.0.1";
const dataDir = process.env.DURABLE_STREAMS_DATA_DIR?.trim() || undefined;
const longPollTimeout = parseDurationMs(
  process.env.DURABLE_STREAMS_LONG_POLL_TIMEOUT,
  30_000
);

const server = new DurableStreamTestServer({
  port,
  host,
  dataDir,
  longPollTimeout,
});

function shutdown(signal) {
  console.log(`\n${signal} received; stopping durable streams server...`);
  Promise.resolve(server.stop())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const url = await server.start();
console.log(`Durable streams server listening at ${url ?? server.url ?? `http://${host}:${port}`}`);
if (dataDir) {
  console.log(`Using file-backed durable streams storage at ${dataDir}`);
}
