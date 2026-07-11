import { createClient } from "redis";

const DEFAULT_CONNECT_TIMEOUT_MS = 2000;
const DEFAULT_RECONNECT_DELAY_MS = 1000;
const FAILURE_WINDOW_MS = 60_000;
const FAILURE_THRESHOLD = 3;
const RECOVERY_COOLDOWN_MS = 30_000;

interface CircuitState {
  consecutiveFailures: number;
  firstFailureAtMs: number;
  openUntilMs: number;
  probeInFlight: boolean;
}

const circuits = new Map<string, CircuitState>();

function circuitKey(url: string, label: string) {
  return `${label}:${normalizeRedisUrl(url)}`;
}

function getCircuit(key: string): CircuitState {
  const existing = circuits.get(key);
  if (existing) {
    return existing;
  }

  const state: CircuitState = {
    consecutiveFailures: 0,
    firstFailureAtMs: 0,
    openUntilMs: 0,
    probeInFlight: false,
  };
  circuits.set(key, state);
  return state;
}

function recordFailure(state: CircuitState, nowMs: number) {
  if (
    state.firstFailureAtMs === 0 ||
    nowMs - state.firstFailureAtMs > FAILURE_WINDOW_MS
  ) {
    state.consecutiveFailures = 1;
    state.firstFailureAtMs = nowMs;
  } else {
    state.consecutiveFailures += 1;
  }

  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.openUntilMs = nowMs + RECOVERY_COOLDOWN_MS;
  }
}

function recordSuccess(state: CircuitState) {
  state.consecutiveFailures = 0;
  state.firstFailureAtMs = 0;
  state.openUntilMs = 0;
}

export type ManagedRedisClient = ReturnType<typeof createClient>;

function isExpectedRedisConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    /Socket closed unexpectedly|The client is closed|Connection is closed|Invalid URL|disconnect/i.test(
      error.message
    )
  );
}

export function normalizeRedisUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `redis://${trimmed}`;
}

export function createManagedRedisClient(
  url: string,
  label: string
): ManagedRedisClient {
  const client = createClient({
    url: normalizeRedisUrl(url),
    socket: {
      connectTimeout: DEFAULT_CONNECT_TIMEOUT_MS,
      keepAlive: true,
      reconnectStrategy: (retries) =>
        Math.min(retries * 50, DEFAULT_RECONNECT_DELAY_MS),
    },
  });

  client.on("error", (error) => {
    if (isExpectedRedisConnectionError(error)) {
      return;
    }

    console.error(`Redis error in ${label}`, error);
  });

  return client;
}

export async function ensureManagedRedisClient(
  client: ManagedRedisClient | null,
  url: string,
  label: string
): Promise<ManagedRedisClient | null> {
  const nextClient = client ?? createManagedRedisClient(url, label);

  if (nextClient.isOpen && nextClient.isReady) {
    return nextClient;
  }

  const state = getCircuit(circuitKey(url, label));
  const nowMs = Date.now();
  if (state.openUntilMs > nowMs || state.probeInFlight) {
    return null;
  }

  state.probeInFlight = true;
  try {
    await nextClient.connect();
    recordSuccess(state);
    return nextClient;
  } catch (error) {
    recordFailure(state, Date.now());
    if (!isExpectedRedisConnectionError(error)) {
      console.error(`Redis connect error in ${label}`, error);
    }

    return null;
  } finally {
    state.probeInFlight = false;
  }
}

export function resetRedisCircuitBreakersForTests() {
  circuits.clear();
}
