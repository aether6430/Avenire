import { auth } from "@avenire/auth/server";
import {
  createCustomerPortalLink,
  createCustomerPortalLinkForExternalCustomer,
} from "@avenire/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
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
    : "/settings?tab=billing";
  const returnUrl = `${baseUrl}${returnPath}`;

  try {
    const customer = await getBillingCustomerByUserId(session.user.id);
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
    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    void apiLogger.requestFailed(500, error);
    return NextResponse.json(
      { error: "Unable to create portal session" },
      { status: 500 }
    );
  }
}
