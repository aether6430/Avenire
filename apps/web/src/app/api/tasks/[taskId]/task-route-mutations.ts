import {
  deleteTaskForUser,
  updateTaskForUser,
} from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import {
  resolveTaskUpdatePayload,
  type TaskRouteBody,
} from "../tasks-route-model";

export async function handleTaskRoutePatch(input: {
  body: TaskRouteBody;
  taskId: string;
  workspaceId: string;
}) {
  const payload = resolveTaskUpdatePayload(input.body);

  let task;
  try {
    task = await updateTaskForUser(input.workspaceId, input.taskId, payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update task.",
      },
      { status: 400 }
    );
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateTaskListCache(input.workspaceId);

  return NextResponse.json({ task });
}

export async function handleTaskRouteDelete(input: {
  taskId: string;
  workspaceId: string;
}) {
  const deleted = await deleteTaskForUser(input.workspaceId, input.taskId);

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateTaskListCache(input.workspaceId);

  return NextResponse.json({ success: true });
}
