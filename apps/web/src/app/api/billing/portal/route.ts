import { NextResponse } from "next/server";
import {
  BILLING_PORTAL_ROUTE_ERROR,
  resolveBillingRouteError,
} from "../billing-route-model";
import { handleBillingPortalPost } from "./billing-portal-post";

export async function POST(request: Request) {
  try {
    return await handleBillingPortalPost(request);
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveBillingRouteError(error, BILLING_PORTAL_ROUTE_ERROR),
      },
      { status: 500 }
    );
  }
}
