import { NextResponse } from "next/server";
import {
  isAuthorizedMaintenanceRequest,
  resolveMaintenanceRouteError,
} from "../../maintenance-route-model";
import { handleMaintenanceMarkdownMigrateRoutePost } from "./maintenance-markdown-migrate-route-post";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedMaintenanceRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleMaintenanceMarkdownMigrateRoutePost();
  } catch (error) {
    const failure = resolveMaintenanceRouteError(error, {
      fallback: "Unable to migrate markdown files.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
