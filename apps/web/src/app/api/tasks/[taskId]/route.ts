import {
  deleteTaskForUser,
  getTaskForUser,
  updateTaskForUser,
} from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const task = await getTaskForUser(ctx.workspace.workspaceId, taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateTaskListCache(ctx.workspace.workspaceId);

  return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    assigneeUserId?: string | null;
    title?: string;
    description?: string | null;
    resources?: Array<{
      href: string;
      resourceId: string;
      resourceType: "file" | "folder" | "chat";
      subtitle: string | null;
      title: string;
    }>;
    status?: "planned" | "drafting" | "polishing" | "completed";
    priority?: "low" | "normal" | "high";
    dueAt?: string | null;
  };

  let dueAtValue: Date | null | undefined;
  if (body.dueAt) {
    dueAtValue = new Date(body.dueAt);
  } else if (body.dueAt === null) {
    dueAtValue = null;
  } else {
    dueAtValue = undefined;
  }

  let task;
  try {
    task = await updateTaskForUser(ctx.workspace.workspaceId, taskId, {
      assigneeUserId: body.assigneeUserId,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueAt: dueAtValue,
      resources: body.resources,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update task.",
      },
      { status: 400 }
    );
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateTaskListCache(ctx.workspace.workspaceId);

  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const deleted = await deleteTaskForUser(ctx.workspace.workspaceId, taskId);

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateTaskListCache(ctx.workspace.workspaceId);

  return NextResponse.json({ success: true });
}
