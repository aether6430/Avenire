import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveExtensionRouteError } from "../extension-route-model";
import { handleExtensionDestinationsRouteGet } from "./extension-destinations-route-get";
import { handleExtensionDestinationsRoutePost } from "./extension-destinations-route-post";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleExtensionDestinationsRouteGet({
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to load extension destinations.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleExtensionDestinationsRoutePost({
      request,
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to save extension destination.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
