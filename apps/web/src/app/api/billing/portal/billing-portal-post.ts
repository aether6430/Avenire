import { auth } from "@avenire/auth/server";
import {
  createCustomerPortalLink,
  createCustomerPortalLinkForExternalCustomer,
} from "@avenire/payments/portal";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUserBillingRecords } from "@/lib/billing";
import { getBillingCustomerByUserId } from "@/lib/database-billing-subscriptions";
import { createApiLogger } from "@/lib/observability";
import {
  BILLING_PORTAL_ROUTE_ERROR,
  resolveBillingAppBaseUrl,
  resolvePortalReturnPath,
} from "../billing-route-model";

export async function handleBillingPortalPost(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const apiLogger = createApiLogger({
    request,
    route: "/api/billing/portal",
    feature: "payments",
    userId: session?.user?.id ?? null,
  });
  void apiLogger.requestStarted();

  if (!session?.user) {
    void apiLogger.requestFailed(401, "Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    returnPath?: string;
  };
  const returnUrl = `${resolveBillingAppBaseUrl(request)}${resolvePortalReturnPath(body.returnPath)}`;

  try {
    const { customer: ensuredCustomer } = await ensureUserBillingRecords({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    console.info("[api/billing/portal] creating portal session", {
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
      polarServer: process.env.POLAR_SERVER ?? null,
      returnUrl,
      userId: session.user.id,
    });
    const customer = await getBillingCustomerByUserId(session.user.id);
    console.info("[api/billing/portal] billing customer lookup complete", {
      hasEnsuredPolarCustomerId: Boolean(ensuredCustomer.id),
      hasStoredPolarCustomerId: Boolean(customer?.polarCustomerId),
      userId: session.user.id,
    });
    const portalCustomerId = customer?.polarCustomerId ?? ensuredCustomer.id;
    const sessionLink = portalCustomerId
      ? await createCustomerPortalLink(portalCustomerId, returnUrl)
      : await createCustomerPortalLinkForExternalCustomer(
          session.user.id,
          returnUrl
        );
    const portalUrl = sessionLink.customerPortalUrl;

    if (!portalUrl) {
      void apiLogger.requestFailed(500, BILLING_PORTAL_ROUTE_ERROR);
      return NextResponse.json(
        { error: BILLING_PORTAL_ROUTE_ERROR },
        { status: 500 }
      );
    }

    void apiLogger.featureUsed("payments.portal.opened");
    void apiLogger.requestSucceeded(200);
    console.info("[api/billing/portal] portal session created", {
      hasPortalUrl: Boolean(portalUrl),
      usedStoredPolarCustomerId: Boolean(customer?.polarCustomerId),
      userId: session.user.id,
    });
    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("[api/billing/portal] failed to create portal session", {
      error,
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
      polarServer: process.env.POLAR_SERVER ?? null,
      returnUrl,
      userId: session.user.id,
    });
    void apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: BILLING_PORTAL_ROUTE_ERROR },
      { status: 500 }
    );
  }
}
