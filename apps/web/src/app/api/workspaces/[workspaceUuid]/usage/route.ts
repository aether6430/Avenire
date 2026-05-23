import { NextResponse } from "next/server";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { handleWorkspaceUsageRouteGet } from "./workspace-usage-route-get";
import {
  resolveWorkspaceUsageRouteError,
  WORKSPACE_USAGE_LOAD_ERROR,
} from "./workspace-usage-route-model";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await handleWorkspaceUsageRouteGet({
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceUsageRouteError(
          error,
          WORKSPACE_USAGE_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
