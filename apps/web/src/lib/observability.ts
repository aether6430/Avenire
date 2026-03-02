import { randomUUID } from "node:crypto";
import { scopedLogger, safeError } from "@avenire/observability";

interface ApiLoggerInput {
  request: Request;
  route: string;
  feature: string;
  userId?: string | null;
  workspaceId?: string | null;
  context?: Record<string, unknown>;
}

export function createApiLogger(input: ApiLoggerInput) {
  const requestId =
    input.request.headers.get("x-request-id") ??
    input.request.headers.get("x-correlation-id") ??
    randomUUID();

  const baseContext = {
    route: input.route,
    feature: input.feature,
    requestId,
    userId: input.userId ?? null,
    workspaceId: input.workspaceId ?? null,
    ...input.context,
  };

  const logger = scopedLogger(baseContext);

  return {
    requestId,
    info(eventName: string, payload?: Record<string, unknown>) {
      return logger.info(eventName, payload);
    },
    warn(eventName: string, payload?: Record<string, unknown>) {
      return logger.warn(eventName, payload);
    },
    error(eventName: string, payload?: Record<string, unknown>) {
      return logger.error(eventName, payload);
    },
    meter(eventName: string, payload?: Record<string, unknown>) {
      return logger.meter(eventName, payload);
    },
    requestStarted(payload?: Record<string, unknown>) {
      return logger.info("api.request.started", payload);
    },
    requestSucceeded(status: number, payload?: Record<string, unknown>) {
      return logger.info("api.request.succeeded", { status, ...(payload ?? {}) });
    },
    requestFailed(status: number, error: unknown, payload?: Record<string, unknown>) {
      return logger.error("api.request.failed", {
        status,
        error: safeError(error),
        ...(payload ?? {}),
      });
    },
    rateLimited(meterName: string, retryAfter?: string | null, payload?: Record<string, unknown>) {
      return logger.warn("api.request.rate_limited", {
        meter: meterName,
        retryAfter: retryAfter ?? null,
        ...(payload ?? {}),
      });
    },
    featureUsed(featureName: string, payload?: Record<string, unknown>) {
      return logger.meter("feature.used", {
        featureName,
        ...(payload ?? {}),
      });
    },
  };
}
