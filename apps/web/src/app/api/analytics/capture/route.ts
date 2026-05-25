import { logInfo, reportError } from "@avenire/observability";
import { NextResponse } from "next/server";

const ALLOWED_EVENTS = new Set([
  "web.pageview",
  "web.session.end",
  "onboarding.started",
  "onboarding.completed",
]);

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.slice(0, 500) : fallback;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    distinctId?: string;
    event?: string;
    properties?: Record<string, unknown>;
  };

  const eventName = safeString(body.event);
  if (!ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const properties = body.properties ?? {};
  const distinctId = safeString(body.distinctId, "anonymous");

  await logInfo({
    eventName,
    context: {
      route: "/api/analytics/capture",
      service: "web",
      userId: distinctId.startsWith("user:") ? distinctId.slice(5) : null,
    },
    payload: {
      distinctId,
      path: safeString(properties.path),
      referrer: safeString(properties.referrer),
      search: safeString(properties.search),
      title: safeString(properties.title),
      durationMs:
        typeof properties.durationMs === "number"
          ? Math.max(0, Math.round(properties.durationMs))
          : undefined,
      viewport:
        typeof properties.viewport === "object" && properties.viewport
          ? properties.viewport
          : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    error?: string;
    path?: string;
  };

  await reportError({
    error: new Error(safeString(body.error, "Client error")),
    context: {
      route: "/api/analytics/capture",
      service: "web",
    },
    payload: {
      path: safeString(body.path),
      source: "client",
    },
  });

  return NextResponse.json({ ok: true });
}
