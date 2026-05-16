import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import type { TaskRouteBody } from "../tasks-route-model";
import { handleTaskRouteGet } from "./task-route-get";
import {
  handleTaskRouteDelete,
  handleTaskRoutePatch,
} from "./task-route-mutations";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  return await handleTaskRouteGet({
    taskId,
    workspaceId: ctx.workspace.workspaceId,
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
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
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  return await handleTaskRouteDelete({
    taskId,
    workspaceId: ctx.workspace.workspaceId,
  });
}
