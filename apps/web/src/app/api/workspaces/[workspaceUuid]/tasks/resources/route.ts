import { NextResponse } from "next/server";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { handleWorkspaceTaskResourcesRouteGet } from "./workspace-task-resources-route-get";
import {
  resolveWorkspaceTaskResourcesRouteError,
  WORKSPACE_TASK_RESOURCES_LOAD_ERROR,
} from "./workspace-task-resources-route-model";

export async function GET(
  request: Request,
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

    return await handleWorkspaceTaskResourcesRouteGet({
      request,
      userId: user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceTaskResourcesRouteError(
          error,
          WORKSPACE_TASK_RESOURCES_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
