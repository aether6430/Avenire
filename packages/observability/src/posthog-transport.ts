export interface ResilientPostHogFetchOptions {
  cooldownMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  onUnavailable?: (retryAfterMs: number) => void;
}

const TELEMETRY_ACCEPTED_RESPONSE = 202;

/**
 * PostHog logs every background flush rejection to stderr. Keep telemetry
 * best-effort by opening a small in-process circuit after a transport failure;
 * queued events are discarded while the circuit is open instead of blocking
 * requests, retrying repeatedly, or filling the terminal with stack traces.
 */
export function createResilientPostHogFetch({
  cooldownMs = 60_000,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  onUnavailable,
}: ResilientPostHogFetchOptions = {}) {
  let unavailableUntil = 0;

  return async (url: string | URL | Request, init?: RequestInit) => {
    const currentTime = now();
    if (currentTime < unavailableUntil) {
      return new Response(null, { status: TELEMETRY_ACCEPTED_RESPONSE });
    }

    try {
      const response = await fetchImpl(url, init);
      if (response.ok) {
        return response;
      }
    } catch {
      // The SDK's requestTimeout abort signal reaches this path as well.
    }

    unavailableUntil = currentTime + cooldownMs;
    onUnavailable?.(cooldownMs);
    return new Response(null, { status: TELEMETRY_ACCEPTED_RESPONSE });
  };
}
