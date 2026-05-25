import { auth } from "@avenire/auth/server";
import { createCheckoutSession } from "@avenire/payments/checkout";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUserBillingRecords } from "@/lib/billing";
import { createApiLogger } from "@/lib/observability";
import {
  DEFAULT_SETTINGS_BILLING_CHECKOUT_SUCCESS_PATH,
  DEFAULT_SETTINGS_BILLING_RETURN_PATH,
} from "@/lib/settings-overlay-route";
import {
  buildBillingCheckoutFailureUrl,
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
  const baseUrl = resolveBillingAppBaseUrl(request);

  if (!session?.user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const selection = resolveCheckoutSelection(request);
  if (!selection) {
    void apiLogger.requestFailed(400, "Invalid plan or billing period");
    return NextResponse.redirect(
      new URL(
        `${DEFAULT_SETTINGS_BILLING_RETURN_PATH}&error=invalid_checkout`,
        baseUrl
      )
    );
  }

  const successUrl = `${baseUrl}${DEFAULT_SETTINGS_BILLING_CHECKOUT_SUCCESS_PATH}`;
  const returnUrl = `${baseUrl}${DEFAULT_SETTINGS_BILLING_RETURN_PATH}`;

  try {
    console.info("[api/billing/checkout] starting checkout", {
      billing: selection.billing,
      email: session.user.email,
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
      hasProductId: Boolean(
        process.env[
          `POLAR_PRODUCT_ID_${selection.plan.toUpperCase()}_${selection.billing.toUpperCase()}`
        ]?.trim()
      ),
      plan: selection.plan,
      polarServer: process.env.POLAR_SERVER ?? null,
      productEnvKey: `POLAR_PRODUCT_ID_${selection.plan.toUpperCase()}_${selection.billing.toUpperCase()}`,
      userId: session.user.id,
    });

    const { activeSubscription } = await ensureUserBillingRecords({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    if (activeSubscription) {
      console.info("[api/billing/checkout] active subscription found", {
        productId: activeSubscription.productId,
        status: activeSubscription.status,
        subscriptionId: activeSubscription.id,
        userId: session.user.id,
      });
      void apiLogger.requestSucceeded(302, {
        ...selection,
        reason: "active_subscription",
      });
      return NextResponse.redirect(
        new URL(
          `${DEFAULT_SETTINGS_BILLING_RETURN_PATH}&billing=active`,
          baseUrl
        )
      );
    }

    const checkout = await createCheckoutSession({
      billing: selection.billing,
      email: session.user.email,
      plan: selection.plan,
      returnUrl,
      successUrl,
      userId: session.user.id,
    });

    console.info("[api/billing/checkout] checkout session created", {
      billing: selection.billing,
      checkoutId: "id" in checkout ? checkout.id : null,
      hasUrl: Boolean(checkout.url),
      plan: selection.plan,
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
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
      polarServer: process.env.POLAR_SERVER ?? null,
      userId: session.user.id,
    });
    void apiLogger.requestFailed(500, error, selection);
    return NextResponse.redirect(buildBillingCheckoutFailureUrl(request));
  }
}
