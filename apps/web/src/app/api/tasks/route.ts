import {
  createTaskForUser,
  listTasksForUser,
} from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as
    | "pending"
    | "in_progress"
    | "completed"
    | null;
  const includeCompleted = searchParams.get("includeCompleted") === "true";
  const dueBefore = searchParams.get("dueBefore");
  const limit = searchParams.get("limit");

  const tasks = await listTasksForUser(ctx.user.id, ctx.workspace.workspaceId, {
    status: status ?? undefined,
    includeCompleted: includeCompleted || status === "completed",
    dueBefore: dueBefore ? new Date(dueBefore) : undefined,
    limit: limit ? Number.parseInt(limit, 10) : undefined,
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    description?: string | null;
    status?: "pending" | "in_progress" | "completed";
    priority?: "low" | "normal" | "high";
    dueAt?: string | null;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const task = await createTaskForUser(ctx.user.id, ctx.workspace.workspaceId, {
    title: body.title.trim(),
    description: body.description ?? null,
    status: body.status ?? "pending",
    priority: body.priority ?? "normal",
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
  });

  return NextResponse.json({ task }, { status: 201 });
}
