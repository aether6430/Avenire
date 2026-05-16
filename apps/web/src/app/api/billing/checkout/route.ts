import { handleBillingCheckoutGet } from "./billing-checkout-get";

export async function GET(request: Request) {
  return await handleBillingCheckoutGet(request);
}
