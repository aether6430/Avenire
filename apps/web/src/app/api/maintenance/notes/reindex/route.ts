import { NextResponse } from "next/server";
import {
  isAuthorizedMaintenanceRequest,
  resolveMaintenanceRouteError,
} from "../../maintenance-route-model";
import { handleMaintenanceNotesReindexRoutePost } from "./maintenance-notes-reindex-route-post";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedMaintenanceRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleMaintenanceNotesReindexRoutePost();
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to enqueue note reindex jobs.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
