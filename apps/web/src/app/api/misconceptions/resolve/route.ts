import { NextResponse } from "next/server";
import { resolveMisconceptionRouteError } from "../misconception-route-model";
import { handleMisconceptionResolveRoutePost } from "./misconception-resolve-route-post";

export async function POST(request: Request) {
  try {
    return await handleMisconceptionResolveRoutePost({
      request,
    });
  } catch (error) {
    const failure = resolveMisconceptionRouteError(error, {
      fallback: "Unable to resolve misconceptions.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
