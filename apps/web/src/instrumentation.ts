import { reportError } from "@avenire/observability";

interface RequestErrorContext {
  renderSource?: string;
  revalidateReason?: string;
  routePath?: string;
  routerKind?: string;
  routeType?: string;
}

interface RequestErrorRequest {
  headers?: Headers;
  method?: string;
  path?: string;
  url?: string;
}

export function register() {
  const processOn =
    typeof globalThis.process?.on === "function"
      ? globalThis.process.on.bind(globalThis.process)
      : null;

  if (!processOn) {
    return;
  }

  processOn("unhandledRejection", (error) => {
    void reportError({
      error,
      eventName: "web.unhandled_rejection",
      context: {
        feature: "runtime",
        service: "web",
      },
    });
  });

  processOn("uncaughtException", (error) => {
    void reportError({
      error,
      eventName: "web.uncaught_exception",
      context: {
        feature: "runtime",
        service: "web",
      },
    });
  });
}

export function onRequestError(
  error: unknown,
  request: RequestErrorRequest,
  context: RequestErrorContext
) {
  return reportError({
    error,
    eventName: "web.request_error",
    context: {
      feature: "runtime",
      requestId:
        request.headers?.get("x-request-id") ??
        request.headers?.get("x-correlation-id") ??
        null,
      route: context.routePath ?? request.path ?? request.url,
      service: "web",
    },
    payload: {
      method: request.method ?? null,
      renderSource: context.renderSource ?? null,
      revalidateReason: context.revalidateReason ?? null,
      routerKind: context.routerKind ?? null,
      routeType: context.routeType ?? null,
    },
  });
}
