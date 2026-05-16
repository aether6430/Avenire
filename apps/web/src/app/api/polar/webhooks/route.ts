import type { NextRequest } from "next/server";
import { handlePolarWebhookRoutePost } from "./polar-webhook-route-post";

export async function POST(request: NextRequest) {
  return await handlePolarWebhookRoutePost({ request });
}
