import { handleBillingUsageGet } from "./billing-usage-get";

export async function GET() {
  return await handleBillingUsageGet();
}
