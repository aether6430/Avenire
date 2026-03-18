import {
  deleteTaskForUser,
  getTaskForUser,
  updateTaskForUser,
} from "@avenire/database/task-data";
import { NextResponse } from "next/server";
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
  const task = await getTaskForUser(ctx.user.id, taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    description?: string | null;
    status?: "pending" | "in_progress" | "completed";
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

  const task = await updateTaskForUser(ctx.user.id, taskId, {
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    dueAt: dueAtValue,
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const deleted = await deleteTaskForUser(ctx.user.id, taskId);

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
