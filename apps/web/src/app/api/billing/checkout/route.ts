import { NextResponse } from "next/server";
import { buildBillingCheckoutFailureUrl } from "../billing-route-model";
import { handleBillingCheckoutGet } from "./billing-checkout-get";

export async function GET(request: Request) {
  try {
    return await handleBillingCheckoutGet(request);
  } catch {
    return NextResponse.redirect(buildBillingCheckoutFailureUrl(request));
  }
}
