import {
  createTaskForUser,
  listTasksForUser,
} from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import {
  createTaskListCacheKey,
  getCachedTaskList,
  getTaskListCacheVersion,
  invalidateTaskListCache,
  setCachedTaskList,
} from "@/lib/tasks-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as
    | "planned"
    | "drafting"
    | "polishing"
    | "completed"
    | null;
  const includeCompleted = searchParams.get("includeCompleted") === "true";
  const assigneeUserId = searchParams.get("assigneeUserId");
  const dueBefore = searchParams.get("dueBefore");
  const limit = searchParams.get("limit");
  const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

  const version = await getTaskListCacheVersion(
    ctx.workspace.workspaceId
  );
  const cacheKey = createTaskListCacheKey({
    assigneeUserId: assigneeUserId ?? undefined,
    dueBefore: dueBefore ?? undefined,
    includeCompleted: includeCompleted || status === "completed",
    limit: parsedLimit,
    status: status ?? undefined,
    version,
    workspaceUuid: ctx.workspace.workspaceId,
  });
  const cached = await getCachedTaskList<{ tasks: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-tasks-cache": "hit" },
    });
  }

  const tasks = await listTasksForUser(ctx.workspace.workspaceId, {
    status: status ?? undefined,
    assigneeUserId: assigneeUserId ?? undefined,
    includeCompleted: includeCompleted || status === "completed",
    dueBefore: dueBefore ? new Date(dueBefore) : undefined,
    limit: parsedLimit,
  });

  await setCachedTaskList(cacheKey, { tasks });

  return NextResponse.json(
    { tasks },
    { headers: { "x-tasks-cache": "miss" } }
  );
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const task = await createTaskForUser(
      ctx.user.id,
      ctx.workspace.workspaceId,
      {
        assigneeUserId: body.assigneeUserId ?? ctx.user.id,
        title: body.title.trim(),
        description: body.description ?? null,
        status: body.status ?? "planned",
        priority: body.priority ?? "normal",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        resources: body.resources ?? [],
      }
    );

    await invalidateTaskListCache(ctx.workspace.workspaceId);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create task.",
      },
      { status: 400 }
    );
  }
}
