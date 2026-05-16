interface RequestErrorContext {
  renderSource?: string;
  revalidateReason?: string;
  routePath?: string;
  routerKind?: string;
  routeType?: string;
}

interface ReportErrorInput {
  context?: Record<string, unknown>;
  error: unknown;
  eventName?: string;
  payload?: Record<string, unknown>;
}

type RuntimeProcessEnv = NodeJS.ProcessEnv & {
  NEXT_RUNTIME?: string;
};

function getNextRuntime(env: NodeJS.ProcessEnv = process.env) {
  return (env as RuntimeProcessEnv).NEXT_RUNTIME;
}

async function reportRuntimeError(input: ReportErrorInput) {
  if (getNextRuntime() === "edge") {
    return;
  }

  const { reportError } = await import("@avenire/observability");
  return reportError(input);
}

interface RequestErrorRequest {
  headers?: Headers | Record<string, string | string[] | undefined>;
  method?: string;
  path?: string;
  url?: string;
}

function getHeader(
  headers: RequestErrorRequest["headers"],
  name: string
): string | null {
  if (!headers) {
    return null;
  }

  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }

  const value =
    (headers as Record<string, string | string[] | undefined>)[name] ??
    (headers as Record<string, string | string[] | undefined>)[
      name.toLowerCase()
    ];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export function register() {
  if (getNextRuntime() === "edge") {
    return;
  }

  const runtimeProcess = (
    globalThis as typeof globalThis & {
      process?: { on?: unknown };
    }
  ).process;
  const processOn =
    typeof runtimeProcess?.on === "function"
      ? runtimeProcess.on.bind(runtimeProcess)
      : null;

  if (!processOn) {
    return;
  }

  processOn("unhandledRejection", (error) => {
    void reportRuntimeError({
      error,
      eventName: "web.unhandled_rejection",
      context: {
        feature: "runtime",
        service: "web",
      },
    });
  });

  processOn("uncaughtException", (error) => {
    void reportRuntimeError({
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
  return reportRuntimeError({
    error,
    eventName: "web.request_error",
    context: {
      feature: "runtime",
      requestId:
        getHeader(request.headers, "x-request-id") ??
        getHeader(request.headers, "x-correlation-id") ??
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
