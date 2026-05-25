import {
  deleteTaskForUser,
  updateTaskForUser,
} from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import {
  resolveTaskRouteError,
  resolveTaskUpdatePayload,
  TASK_DELETE_ERROR,
  TASK_UPDATE_ERROR,
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
        error: resolveTaskRouteError(error, TASK_UPDATE_ERROR),
      },
      { status: 500 }
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
  let deleted;
  try {
    deleted = await deleteTaskForUser(input.workspaceId, input.taskId);
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveTaskRouteError(error, TASK_DELETE_ERROR),
      },
      { status: 500 }
    );
  }

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await invalidateTaskListCache(input.workspaceId);

  return NextResponse.json({ success: true });
}
