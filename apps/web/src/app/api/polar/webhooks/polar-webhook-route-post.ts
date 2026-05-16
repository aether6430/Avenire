import { handlePolarWebhook } from "@avenire/payments/webhooks";
import { type NextRequest, NextResponse } from "next/server";
import { applyPolarWebhookEvent } from "@/lib/billing-webhook";
import { createApiLogger } from "@/lib/observability";
import {
  POLAR_WEBHOOK_INVALID_SIGNATURE_ERROR,
  POLAR_WEBHOOK_SECRET_MISSING_ERROR,
  resolvePolarWebhookEventType,
  resolvePolarWebhookRouteError,
  resolvePolarWebhookSecret,
} from "./polar-webhook-route-model";

export async function handlePolarWebhookRoutePost(input: {
  request: NextRequest;
}) {
  const secret = resolvePolarWebhookSecret();
  const apiLogger = createApiLogger({
    request: input.request,
    route: "/api/polar/webhooks",
    feature: "payments",
  });
  const requestId = apiLogger.requestId;

  try {
    void apiLogger.requestStarted({
      hasSecret: Boolean(secret),
    });
    console.info("[api/polar/webhooks] incoming request", {
      requestId,
      hasSecret: Boolean(secret),
      userAgent: input.request.headers.get("user-agent") ?? null,
      forwardedFor: input.request.headers.get("x-forwarded-for") ?? null,
    });

    if (!secret) {
      console.error("[api/polar/webhooks] POLAR_WEBHOOK_SECRET is missing");
      void apiLogger.requestFailed(503, POLAR_WEBHOOK_SECRET_MISSING_ERROR);
      return NextResponse.json(
        {
          ok: false,
          error: POLAR_WEBHOOK_SECRET_MISSING_ERROR,
        },
        { status: 503 }
      );
    }

    const payload = await input.request.text();
    const event = await handlePolarWebhook(payload, {
      "webhook-id": input.request.headers.get("webhook-id") ?? "",
      "webhook-signature":
        input.request.headers.get("webhook-signature") ??
        input.request.headers.get("polar-signature") ??
        "",
      "webhook-timestamp": input.request.headers.get("webhook-timestamp") ?? "",
    });
    if (!event) {
      console.error("[api/polar/webhooks] signature verification failed", {
        requestId,
      });
      void apiLogger.requestFailed(400, POLAR_WEBHOOK_INVALID_SIGNATURE_ERROR);
      return NextResponse.json(
        {
          ok: false,
          error: POLAR_WEBHOOK_INVALID_SIGNATURE_ERROR,
        },
        { status: 400 }
      );
    }

    const eventType = resolvePolarWebhookEventType(event);
    console.info("[api/polar/webhooks] verified event", {
      requestId,
      type: eventType,
    });
    void apiLogger.meter("meter.billing.webhook.processed", {
      eventType,
      status: "verified",
    });
    void apiLogger.featureUsed("payments.webhook", {
      eventType,
    });

    await applyPolarWebhookEvent(
      event as { type: string; data?: Record<string, unknown> }
    );

    void apiLogger.requestSucceeded(200);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = resolvePolarWebhookRouteError(error);
    console.error("[api/polar/webhooks] failed", { requestId, error });
    void apiLogger.requestFailed(failure.status, error);
    return NextResponse.json({ ok: false }, { status: failure.status });
  }
}
