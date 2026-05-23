import { getTaskForUser } from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import { resolveTaskRouteError, TASK_LOAD_ERROR } from "../tasks-route-model";

export async function handleTaskRouteGet(input: {
  taskId: string;
  workspaceId: string;
}) {
  try {
    const task = await getTaskForUser(input.workspaceId, input.taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await invalidateTaskListCache(input.workspaceId);

    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveTaskRouteError(error, TASK_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
