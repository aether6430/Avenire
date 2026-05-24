import { NextResponse } from "next/server";
import { resolveMisconceptionRouteError } from "../misconception-route-model";
import { handleMisconceptionDeleteRoutePost } from "./misconception-delete-route-post";

export async function POST(request: Request) {
  try {
    return await handleMisconceptionDeleteRoutePost({
      request,
    });
  } catch (error) {
    const failure = resolveMisconceptionRouteError(error, {
      fallback: "Unable to delete misconceptions.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
