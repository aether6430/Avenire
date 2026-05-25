import { auth } from "@avenire/auth/server";
import { mapProductIdToPlan } from "@avenire/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUserBillingRecords } from "@/lib/billing";
import { createApiLogger } from "@/lib/observability";

function resolvePolarRoutePlan(input: {
  activeSubscription:
    | {
        amount?: number;
        metadata?: Record<string, string | number | boolean | undefined>;
        productId?: string;
        status?: string;
      }
    | null
    | undefined;
}) {
  const subscription = input.activeSubscription;
  if (!subscription) {
    return "access" as const;
  }

  return (
    mapProductIdToPlan(subscription.productId) ??
    (subscription.metadata?.plan === "core" ||
    subscription.metadata?.plan === "scholar"
      ? subscription.metadata.plan
      : null) ??
    (typeof subscription.amount === "number" && subscription.amount >= 5000
      ? "scholar"
      : "core")
  );
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const apiLogger = createApiLogger({
    request,
    route: "/api/billing/polar",
    feature: "payments",
    userId: session?.user?.id ?? null,
  });
  void apiLogger.requestStarted();

  if (!session?.user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { activeSubscription, customer } = await ensureUserBillingRecords({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    void apiLogger.requestSucceeded(200);
    return NextResponse.json({
      customer: {
        externalId: customer.externalId ?? null,
        id: customer.id,
      },
      plan: resolvePolarRoutePlan({ activeSubscription }),
      subscription: activeSubscription
        ? {
            id: activeSubscription.id,
            productId: activeSubscription.productId,
            status: activeSubscription.status,
          }
        : null,
    });
  } catch (error) {
    console.error("[api/billing/polar] failed to ensure Polar customer", {
      userId: session.user.id,
      email: session.user.email,
      error,
    });
    void apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Unable to prepare Polar customer" },
      { status: 500 }
    );
  }
}
