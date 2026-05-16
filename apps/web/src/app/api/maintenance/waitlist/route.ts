import { NextResponse } from "next/server";
import { isAuthorizedMaintenanceRequest } from "../maintenance-route-model";
import { handleMaintenanceWaitlistRouteGet } from "./maintenance-waitlist-route-get";
import { handleMaintenanceWaitlistRoutePost } from "./maintenance-waitlist-route-post";

export async function GET(request: Request) {
  if (!isAuthorizedMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleMaintenanceWaitlistRouteGet();
}

export async function POST(request: Request) {
  if (!isAuthorizedMaintenanceRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleMaintenanceWaitlistRoutePost({
    request,
  });
}
