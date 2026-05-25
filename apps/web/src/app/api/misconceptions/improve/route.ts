import { NextResponse } from "next/server";
import { resolveMisconceptionRouteError } from "../misconception-route-model";
import { handleMisconceptionImproveRoutePost } from "./misconception-improve-route-post";

export async function POST(request: Request) {
  try {
    return await handleMisconceptionImproveRoutePost({
      request,
    });
  } catch (error) {
    const failure = resolveMisconceptionRouteError(error, {
      fallback: "Unable to improve misconceptions.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
