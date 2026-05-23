import { NextResponse } from "next/server";
import {
  isAuthorizedMaintenanceRequest,
  resolveMaintenanceRouteError,
} from "../maintenance-route-model";
import { handleMaintenanceWaitlistRouteGet } from "./maintenance-waitlist-route-get";
import { handleMaintenanceWaitlistRoutePost } from "./maintenance-waitlist-route-post";

export async function GET(request: Request) {
  try {
    if (!isAuthorizedMaintenanceRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleMaintenanceWaitlistRouteGet();
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to list waitlist entries.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedMaintenanceRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleMaintenanceWaitlistRoutePost({
      request,
    });
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to approve waitlist entry.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
