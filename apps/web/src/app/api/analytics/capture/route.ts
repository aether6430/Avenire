import { logInfo, reportError } from "@avenire/observability";
import { Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";

const analyticsCaptureSchema = Schema.Struct({
  distinctId: Schema.optional(Schema.String),
  event: Schema.optional(Schema.String),
  properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

const analyticsErrorSchema = Schema.Struct({
  error: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
});

const ALLOWED_EVENTS = new Set([
  "web.pageview",
  "web.session.end",
  "web.performance.import",
  "web.performance.interaction",
  "onboarding.started",
  "onboarding.completed",
]);

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.slice(0, 500) : fallback;
}

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, analyticsCaptureSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

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
      cached:
        typeof properties.cached === "boolean" ? properties.cached : undefined,
      initiatorType: safeString(properties.initiatorType),
      interactionType: safeString(properties.interactionType),
      resourcePath: safeString(properties.resourcePath),
      surface: safeString(properties.surface),
      transferSize:
        typeof properties.transferSize === "number"
          ? Math.max(0, Math.round(properties.transferSize))
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
  const parsed = await parseJsonRequest(request, analyticsErrorSchema);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

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
