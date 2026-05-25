import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import type { TaskRouteBody } from "../tasks-route-model";
import {
  resolveTaskRouteError,
  TASK_DELETE_ERROR,
  TASK_LOAD_ERROR,
  TASK_UPDATE_ERROR,
} from "../tasks-route-model";
import { handleTaskRouteGet } from "./task-route-get";
import {
  handleTaskRouteDelete,
  handleTaskRoutePatch,
} from "./task-route-mutations";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    return await handleTaskRouteGet({
      taskId,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveTaskRouteError(error, TASK_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = (await request.json().catch(() => ({}))) as TaskRouteBody;

    return await handleTaskRoutePatch({
      body,
      taskId,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveTaskRouteError(error, TASK_UPDATE_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const ctx = await getWorkspaceContextForUser();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    return await handleTaskRouteDelete({
      taskId,
      workspaceId: ctx.workspace.workspaceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveTaskRouteError(error, TASK_DELETE_ERROR),
      },
      { status: 500 }
    );
  }
}
