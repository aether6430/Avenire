import { auth } from "@avenire/auth/server";
import { createCheckoutSession } from "@avenire/payments/checkout";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { DEFAULT_SETTINGS_BILLING_CHECKOUT_SUCCESS_PATH } from "@/lib/settings-overlay-route";
import {
  resolveBillingAppBaseUrl,
  resolveCheckoutSelection,
} from "../billing-route-model";

export async function handleBillingCheckoutGet(request: Request) {
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

  const selection = resolveCheckoutSelection(request);
  if (!selection) {
    void apiLogger.requestFailed(400, "Invalid plan or billing period");
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  const baseUrl = resolveBillingAppBaseUrl(request);
  const successUrl = `${baseUrl}${DEFAULT_SETTINGS_BILLING_CHECKOUT_SUCCESS_PATH}`;
  const returnUrl = `${baseUrl}/pricing`;

  try {
    const checkout = await createCheckoutSession({
      billing: selection.billing,
      email: session.user.email,
      plan: selection.plan,
      returnUrl,
      successUrl,
      userId: session.user.id,
    });

    void apiLogger.featureUsed("payments.checkout.started", selection);
    void apiLogger.meter("meter.billing.checkout.started", selection);
    void apiLogger.requestSucceeded(302, selection);
    return NextResponse.redirect(checkout.url);
  } catch (error) {
    console.error("[api/billing/checkout] failed to create checkout", {
      error,
      ...selection,
      userId: session.user.id,
    });
    void apiLogger.requestFailed(500, error, selection);
    return NextResponse.redirect(
      new URL("/pricing?error=checkout", request.url)
    );
  }
}
