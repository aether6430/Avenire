import { NextResponse } from "next/server";
import { resolveWaitlistRouteError } from "../waitlist-route-model";
import { handleWaitlistRequestPost } from "./waitlist-request-route-post";

export async function POST(request: Request) {
  try {
    return await handleWaitlistRequestPost({ request });
  } catch (error) {
    const failure = resolveWaitlistRouteError(error);
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
