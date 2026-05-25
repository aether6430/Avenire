import { NextResponse } from "next/server";
import { handleBillingUsageGet } from "./billing-usage-get";
import {
  BILLING_USAGE_LOAD_ERROR,
  resolveBillingUsageRouteError,
} from "./billing-usage-route-model";

export async function GET() {
  try {
    return await handleBillingUsageGet();
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveBillingUsageRouteError(error, BILLING_USAGE_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
