import { auth } from "@avenire/auth/server";
import {
  createCustomerPortalLink,
  createCustomerPortalLinkForExternalCustomer,
} from "@avenire/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUserBillingRecords } from "@/lib/billing";
import { BILLING_SETTINGS_PATH } from "@/lib/billing-plans";
import { getBillingCustomerByUserId } from "@/lib/database-billing";
import { createApiLogger } from "@/lib/observability";

export async function POST(request: Request) {
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
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const returnPath = body.returnPath?.startsWith("/")
    ? body.returnPath
    : BILLING_SETTINGS_PATH;
  const returnUrl = `${baseUrl}${returnPath}`;

  try {
    await ensureUserBillingRecords({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    console.info("[api/billing/portal] creating portal session", {
      userId: session.user.id,
      returnUrl,
      polarServer: process.env.POLAR_SERVER ?? null,
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
    });
    const customer = await getBillingCustomerByUserId(session.user.id);
    console.info("[api/billing/portal] billing customer lookup complete", {
      userId: session.user.id,
      hasStoredPolarCustomerId: Boolean(customer?.polarCustomerId),
    });
    const sessionLink = customer?.polarCustomerId
      ? await createCustomerPortalLink(customer.polarCustomerId, returnUrl)
      : await createCustomerPortalLinkForExternalCustomer(
          session.user.id,
          returnUrl
        );
    const portalUrl = sessionLink.customerPortalUrl;

    if (!portalUrl) {
      void apiLogger.requestFailed(500, "Unable to create portal session");
      return NextResponse.json(
        { error: "Unable to create portal session" },
        { status: 500 }
      );
    }

    void apiLogger.featureUsed("payments.portal.opened");
    void apiLogger.requestSucceeded(200);
    console.info("[api/billing/portal] portal session created", {
      userId: session.user.id,
      usedStoredPolarCustomerId: Boolean(customer?.polarCustomerId),
      hasPortalUrl: Boolean(portalUrl),
    });
    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("[api/billing/portal] failed to create portal session", {
      userId: session.user.id,
      returnUrl,
      polarServer: process.env.POLAR_SERVER ?? null,
      hasAccessToken: Boolean(process.env.POLAR_ACCESS_TOKEN?.trim()),
      error,
    });
    void apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Unable to create portal session" },
      { status: 500 }
    );
  }
}
