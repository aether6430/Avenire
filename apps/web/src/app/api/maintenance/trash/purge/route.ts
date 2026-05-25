import { NextResponse } from "next/server";
import {
  isAuthorizedMaintenanceRequest,
  resolveMaintenanceRouteError,
} from "../../maintenance-route-model";
import { handleMaintenanceTrashPurgeRoutePost } from "./maintenance-trash-purge-route-post";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedMaintenanceRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleMaintenanceTrashPurgeRoutePost();
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to purge trash.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
