import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { handleTasksRoutePost } from "./tasks-route-create";
import { handleTasksRouteGet } from "./tasks-route-list";
import type { TaskRouteBody } from "./tasks-route-model";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleTasksRouteGet({
    request,
    workspaceId: ctx.workspace.workspaceId,
  });
}

export async function POST(request: Request) {
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
}
