import { NextResponse } from "next/server";
import { deliverPendingPolarUsageEvents } from "@/lib/billing-credit-sync";
import { createApiLogger } from "@/lib/observability";

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
    route: "/api/internal/billing/credits/sync",
    userId: null,
  });
  void logger.requestStarted();

  if (!isAuthorized(request)) {
    void logger.requestFailed(401, "Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deliverPendingPolarUsageEvents();
    void logger.requestSucceeded(200, result);
    return NextResponse.json(result);
  } catch (error) {
    void logger.requestFailed(503, error);
    return NextResponse.json(
      { error: "Billing credit synchronization unavailable" },
      { status: 503 }
    );
  }
}
