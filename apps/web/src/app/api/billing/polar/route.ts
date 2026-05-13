import { auth } from "@avenire/auth/server";
import { ensurePolarCustomer } from "@avenire/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";

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
    const customer = await ensurePolarCustomer({
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
