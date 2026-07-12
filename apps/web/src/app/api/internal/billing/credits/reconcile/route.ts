import { Effect, Schema } from "effect-v4";
import { NextResponse } from "next/server";
import { reconcilePolarCreditConsumption } from "@/lib/billing-credit-sync";
import { createApiLogger } from "@/lib/observability";

const reconciliationQuery = Schema.Struct({
  userId: Schema.Trim.check(Schema.isMinLength(1)),
});

function isAuthorized(request: Request) {
  const secret = (
    process.env.BILLING_SYNC_SECRET ??
    process.env.CRON_SECRET ??
    ""
  ).trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  const logger = createApiLogger({
    feature: "billing",
    request,
    route: "/api/internal/billing/credits/reconcile",
    userId: null,
  });
  void logger.requestStarted();
  if (!isAuthorized(request)) {
    void logger.requestFailed(401, "Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  const parsed = await Effect.runPromiseExit(
    Schema.decodeUnknownEffect(reconciliationQuery)({ userId })
  );
  if (parsed._tag === "Failure") {
    void logger.requestFailed(400, "Invalid userId");
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  try {
    const result = await reconcilePolarCreditConsumption(parsed.value.userId);
    const status = result.diverged ? 409 : 200;
    if (result.diverged) {
      void logger.requestFailed(status, "Polar credit divergence", result);
    } else {
      void logger.requestSucceeded(status, result);
    }
    return NextResponse.json(result, { status });
  } catch (error) {
    void logger.requestFailed(503, error);
    return NextResponse.json(
      { error: "Billing credit reconciliation unavailable" },
      { status: 503 }
    );
  }
}
