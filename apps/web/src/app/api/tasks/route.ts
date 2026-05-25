import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleTasksRoutePost } from "./tasks-route-create";
import { handleTasksRouteGet } from "./tasks-route-list";
import {
  resolveTaskRouteError,
  TASK_CREATE_ERROR,
  TASK_LIST_LOAD_ERROR,
  type TaskRouteBody,
} from "./tasks-route-model";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await handleTasksRouteGet({
      request,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveTaskRouteError(error, TASK_LIST_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as TaskRouteBody;

    return await handleTasksRoutePost({
      body,
      userId: ctx.user.id,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveTaskRouteError(error, TASK_CREATE_ERROR),
      },
      { status: 500 }
    );
  }
}
