import { createRequire } from "node:module";

const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_RECONNECT_DELAY_MS = 1_000;

type ManagedRedisClient = {
  connect(): Promise<void>;
  isOpen: boolean;
  isReady: boolean;
  on(event: "error", listener: (error: unknown) => void): unknown;
};

const requireFromWorkspaceRoot = createRequire(
  new URL("../../../../package.json", import.meta.url)
);

function isExpectedRedisConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    /Socket closed unexpectedly|The client is closed|Connection is closed|Invalid URL|disconnect/i.test(
      error.message
    )
  );
}

function normalizeRedisUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `redis://${trimmed}`;
}

function createManagedRedisClient(url: string, label: string) {
  const { createClient } = requireFromWorkspaceRoot("redis") as {
    createClient: (options: {
      socket: {
        connectTimeout: number;
        keepAlive: boolean;
        reconnectStrategy: (retries: number) => number;
      };
      url: string;
    }) => ManagedRedisClient;
  };
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
) {
  const nextClient = client ?? createManagedRedisClient(url, label);

  if (nextClient.isOpen && nextClient.isReady) {
    return nextClient;
  }

  try {
    await nextClient.connect();
    return nextClient;
  } catch (error) {
    if (!isExpectedRedisConnectionError(error)) {
      console.error(`Redis connect error in ${label}`, error);
    }

    return null;
  }
}
