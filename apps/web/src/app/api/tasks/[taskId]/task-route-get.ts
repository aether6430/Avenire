import { getTaskForUser } from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { invalidateTaskListCache } from "@/lib/tasks-cache";

export async function handleTaskRouteGet(input: {
  taskId: string;
  workspaceId: string;
}) {
  const task = await getTaskForUser(input.workspaceId, input.taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateTaskListCache(input.workspaceId);

  return NextResponse.json({ task });
}
