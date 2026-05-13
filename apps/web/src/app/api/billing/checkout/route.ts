import { auth } from "@avenire/auth/server";
import {
  type BillingPeriod,
  createCheckoutSession,
  type PaidPlan,
} from "@avenire/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUserBillingRecords } from "@/lib/billing";
import { BILLING_SETTINGS_PATH } from "@/lib/billing-plans";
import { createApiLogger } from "@/lib/observability";

const BILLING_PERIODS: BillingPeriod[] = ["monthly", "yearly"];
const PAID_PLANS: PaidPlan[] = ["core", "scholar"];

function isBillingPeriod(value: string | null): value is BillingPeriod {
  return Boolean(value && BILLING_PERIODS.includes(value as BillingPeriod));
}

function isPaidPlan(value: string | null): value is PaidPlan {
  return Boolean(value && PAID_PLANS.includes(value as PaidPlan));
}

function appBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const apiLogger = createApiLogger({
    request,
    route: "/api/billing/checkout",
    feature: "payments",
    userId: session?.user?.id ?? null,
  });
  void apiLogger.requestStarted();

  if (!session?.user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan");
  const billing = searchParams.get("billing");

  if (!(isPaidPlan(plan) && isBillingPeriod(billing))) {
    void apiLogger.requestFailed(400, "Invalid plan or billing period");
    return NextResponse.redirect(
      new URL(`${BILLING_SETTINGS_PATH}&error=invalid_checkout`, request.url)
    );
  }

  const baseUrl = appBaseUrl(request);
  const successUrl = `${baseUrl}${BILLING_SETTINGS_PATH}&checkout=success`;
  const returnUrl = `${baseUrl}${BILLING_SETTINGS_PATH}`;

  try {
    console.info("[api/billing/checkout] starting checkout", {
      userId: session.user.id,
      email: session.user.email,
      plan,
      billing,
      polarServer: process.env.POLAR_SERVER ?? null,
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
      productEnvKey: `POLAR_PRODUCT_ID_${plan.toUpperCase()}_${billing.toUpperCase()}`,
      hasProductId: Boolean(
        process.env[
          `POLAR_PRODUCT_ID_${plan.toUpperCase()}_${billing.toUpperCase()}`
        ]?.trim()
      ),
    });
    const { activeSubscription } = await ensureUserBillingRecords({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    if (activeSubscription) {
      console.info("[api/billing/checkout] active subscription found", {
        userId: session.user.id,
        subscriptionId: activeSubscription.id,
        productId: activeSubscription.productId,
        status: activeSubscription.status,
      });
      void apiLogger.requestSucceeded(302, {
        plan,
        billing,
        reason: "active_subscription",
      });
      return NextResponse.redirect(
        new URL(`${BILLING_SETTINGS_PATH}&billing=active`, request.url)
      );
    }

    const checkout = await createCheckoutSession({
      plan,
      billing,
      userId: session.user.id,
      email: session.user.email,
      successUrl,
      returnUrl,
    });

    console.info("[api/billing/checkout] checkout session created", {
      userId: session.user.id,
      plan,
      billing,
      checkoutId: "id" in checkout ? checkout.id : null,
      hasUrl: Boolean(checkout.url),
    });
    void apiLogger.featureUsed("payments.checkout.started", { plan, billing });
    void apiLogger.meter("meter.billing.checkout.started", { plan, billing });
    void apiLogger.requestSucceeded(302, { plan, billing });
    return NextResponse.redirect(checkout.url);
  } catch (error) {
    console.error("[api/billing/checkout] failed to create checkout", {
      plan,
      billing,
      userId: session.user.id,
      polarServer: process.env.POLAR_SERVER ?? null,
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
      error,
    });
    void apiLogger.requestFailed(500, error, { plan, billing });
    return NextResponse.redirect(
      new URL(`${BILLING_SETTINGS_PATH}&error=checkout`, request.url)
    );
  }
}
