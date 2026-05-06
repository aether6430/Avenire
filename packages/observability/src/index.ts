import { PostHog } from "posthog-node";

const service = process.env.OBSERVABILITY_SERVICE ?? "web";
const posthogKey =
  process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.POSTHOG_HOST ??
  process.env.NEXT_PUBLIC_POSTHOG_HOST ??
  "https://us.i.posthog.com";

const posthog = posthogKey
  ? new PostHog(posthogKey, {
      host: posthogHost,
      enableExceptionAutocapture: true,
    })
  : null;

export type LogLevel = "info" | "warn" | "error" | "meter";

export interface ObservabilityContext {
  feature?: string | null;
  requestId?: string | null;
  route?: string;
  service?: string;
  userId?: string | null;
  workspaceId?: string | null;
  [key: string]: unknown;
}

export interface ObservabilityEvent {
  context?: ObservabilityContext;
  eventName: string;
  payload?: Record<string, unknown>;
}

export interface CaptureErrorInput {
  context?: ObservabilityContext;
  error: unknown;
  eventName?: string;
  payload?: Record<string, unknown>;
}

const REDACTED_KEYS = new Set([
  "authorization",
  "cookie",
  "cookies",
  "email",
  "filename",
  "file_name",
  "message",
  "messages",
  "name",
  "prompt",
  "storagekey",
  "storageurl",
  "text",
  "token",
  "apikey",
  "api_key",
  "secret",
  "password",
]);

function normalizeRedactedKey(key: string) {
  return key.toLowerCase();
}

function isRedactedKey(key: string) {
  return REDACTED_KEYS.has(normalizeRedactedKey(key));
}

function shouldEnableObservability() {
  const envValue = process.env.OBSERVABILITY_ENABLED;
  if (envValue === "false") {
    return false;
  }

  if (envValue === "true") {
    return true;
  }

  return process.env.NODE_ENV === "production";
}

function getSampleRate() {
  const raw = Number.parseFloat(process.env.OBSERVABILITY_SAMPLE_RATE ?? "1");
  if (!Number.isFinite(raw)) {
    return 1;
  }

  return Math.min(1, Math.max(0, raw));
}

function shouldSample() {
  return Math.random() <= getSampleRate();
}

function getDistinctId(context: ObservabilityContext) {
  const userId = context.userId;
  if (typeof userId === "string" && userId.length > 0) {
    return userId;
  }

  const workspaceId = context.workspaceId;
  if (typeof workspaceId === "string" && workspaceId.length > 0) {
    return `workspace:${workspaceId}`;
  }

  const requestId = context.requestId;
  if (typeof requestId === "string" && requestId.length > 0) {
    return `request:${requestId}`;
  }

  return `service:${service}`;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (isRedactedKey(key)) {
      redacted[key] = "[REDACTED]";
      continue;
    }
    redacted[key] = redactValue(entry);
  }

  return redacted;
}

function redactObject(value: Record<string, unknown>) {
  return redactValue(value) as Record<string, unknown>;
}

function redactErrorText(input?: string) {
  if (!input) {
    return undefined;
  }

  let result = input;
  for (const key of REDACTED_KEYS) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(${escapedKey}\\s*[:=]\\s*)([^\\s,;]+)`, "gi");
    result = result.replace(pattern, "$1[REDACTED]");
  }

  return result;
}

export function safeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactErrorText(error.message),
      stack: redactErrorText(error.stack),
    };
  }

  if (typeof error === "string") {
    return { message: redactErrorText(error) };
  }

  return { message: "Unknown error", value: redactValue(error) };
}

async function ingest(level: LogLevel, input: ObservabilityEvent) {
  if (!shouldEnableObservability()) {
    return;
  }

  if (!shouldSample()) {
    return;
  }

  const payload = redactObject(input.payload ?? {});
  const context = redactObject(input.context ?? {});
  const properties = {
    timestamp: new Date().toISOString(),
    level,
    log_level: level,
    service,
    ...context,
    ...payload,
  };

  if (!posthog) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[posthog-disabled]", {
        event: input.eventName,
        distinctId: getDistinctId(context),
        properties,
      });
    }
    return;
  }

  try {
    await posthog.captureImmediate({
      distinctId: getDistinctId(context),
      event: input.eventName,
      properties,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[posthog-capture-failed]", safeError(error));
    }
  }
}

async function captureExceptionEvent(input: CaptureErrorInput) {
  if (!shouldEnableObservability()) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[posthog-error-disabled]", safeError(input.error));
    }
    return;
  }

  const errorContext = redactObject(input.context ?? {});
  const payload = redactObject(input.payload ?? {});
  const properties = {
    timestamp: new Date().toISOString(),
    eventName: input.eventName ?? "error.captured",
    level: "error",
    log_level: "error",
    service,
    ...errorContext,
    ...payload,
    error: safeError(input.error),
  };

  if (!posthog) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[posthog-error-disabled]", {
        distinctId: getDistinctId(errorContext),
        properties,
      });
    }
    return;
  }

  try {
    await posthog.captureExceptionImmediate(
      input.error,
      getDistinctId(errorContext),
      properties
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[posthog-error-capture-failed]", safeError(error));
    }
  }
}

export function scopedLogger(context: ObservabilityContext) {
  return {
    info(eventName: string, payload?: Record<string, unknown>) {
      return ingest("info", { eventName, payload, context });
    },
    warn(eventName: string, payload?: Record<string, unknown>) {
      return ingest("warn", { eventName, payload, context });
    },
    error(eventName: string, payload?: Record<string, unknown>) {
      return ingest("error", { eventName, payload, context });
    },
    captureError(
      error: unknown,
      payload?: Record<string, unknown>,
      eventName?: string
    ) {
      return captureExceptionEvent({ context, error, eventName, payload });
    },
    meter(eventName: string, payload?: Record<string, unknown>) {
      return ingest("meter", { eventName, payload, context });
    },
  };
}

export function logInfo(input: ObservabilityEvent) {
  return ingest("info", input);
}

export function logWarn(input: ObservabilityEvent) {
  return ingest("warn", input);
}

export function logError(input: ObservabilityEvent) {
  return ingest("error", input);
}

export function reportError(input: CaptureErrorInput) {
  return captureExceptionEvent(input);
}

export function meter(input: ObservabilityEvent) {
  return ingest("meter", input);
}

export async function logEvent(
  eventName: string,
  payload: Record<string, unknown>
) {
  await logInfo({
    eventName,
    payload,
  });
}

export async function flushObservability() {
  if (!posthog) {
    return;
  }

  await posthog.flush();
}

export function shutdownObservability(timeoutMs = 5000) {
  if (!posthog) {
    return;
  }

  posthog.shutdown(timeoutMs);
}
