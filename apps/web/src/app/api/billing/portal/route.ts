import { handleBillingPortalPost } from "./billing-portal-post";

export async function POST(request: Request) {
  return await handleBillingPortalPost(request);
}
