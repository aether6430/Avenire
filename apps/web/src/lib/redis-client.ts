import { createClient } from "redis";

const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_RECONNECT_DELAY_MS = 1_000;

export function isExpectedRedisConnectionError(error: unknown) {
  return (
    error instanceof Error &&
    /Socket closed unexpectedly|The client is closed|Connection is closed|disconnect/i.test(
      error.message
    )
  );
}

export function createManagedRedisClient(url: string, label: string) {
  const client = createClient({
    url,
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
  client: any | null,
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
