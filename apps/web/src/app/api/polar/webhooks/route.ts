import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolvePolarWebhookRouteError } from "./polar-webhook-route-model";
import { handlePolarWebhookRoutePost } from "./polar-webhook-route-post";

export async function POST(request: NextRequest) {
  try {
    return await handlePolarWebhookRoutePost({ request });
  } catch (error) {
    const failure = resolvePolarWebhookRouteError(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
