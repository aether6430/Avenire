import { NextResponse } from "next/server";
import { isAuthorizedMaintenanceRequest } from "../../maintenance-route-model";
import { handleMaintenanceTrashPurgeRoutePost } from "./maintenance-trash-purge-route-post";

export async function POST(request: Request) {
  if (!isAuthorizedMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleMaintenanceTrashPurgeRoutePost();
}
