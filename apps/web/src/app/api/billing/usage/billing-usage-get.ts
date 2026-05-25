import { auth } from "@avenire/auth/server";
import { getUsageOverview } from "@avenire/database";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  BILLING_USAGE_LOAD_ERROR,
  resolveBillingUsageRouteError,
} from "./billing-usage-route-model";

export async function handleBillingUsageGet() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUsageOverview(session.user.id);
    return NextResponse.json({ usage });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveBillingUsageRouteError(error, BILLING_USAGE_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
