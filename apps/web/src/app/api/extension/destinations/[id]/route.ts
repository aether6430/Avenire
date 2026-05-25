import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { resolveExtensionRouteError } from "../../extension-route-model";
import { handleExtensionDestinationRouteDelete } from "./extension-destination-route-delete";
import { handleExtensionDestinationRoutePatch } from "./extension-destination-route-patch";

export async function PATCH(
  request: Request,
  contextParams: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleExtensionDestinationRoutePatch({
      params: contextParams.params,
      request,
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to update extension destination.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}

export async function DELETE(
  _request: Request,
  contextParams: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleExtensionDestinationRouteDelete({
      params: contextParams.params,
      userId: user.id,
    });
  } catch (error) {
    const failure = resolveExtensionRouteError(error, {
      fallback: "Unable to delete extension destination.",
      status: 500,
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
