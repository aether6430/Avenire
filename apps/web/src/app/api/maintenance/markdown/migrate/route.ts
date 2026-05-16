import { NextResponse } from "next/server";
import { isAuthorizedMaintenanceRequest } from "../../maintenance-route-model";
import { handleMaintenanceMarkdownMigrateRoutePost } from "./maintenance-markdown-migrate-route-post";

export async function POST(request: Request) {
  if (!isAuthorizedMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleMaintenanceMarkdownMigrateRoutePost();
}
