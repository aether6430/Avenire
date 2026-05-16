import { createTaskForUser } from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import {
  resolveTaskCreatePayload,
  type TaskRouteBody,
} from "./tasks-route-model";

export async function handleTasksRoutePost(input: {
  body: TaskRouteBody;
  userId: string;
  workspaceId: string;
}) {
  const payload = resolveTaskCreatePayload({
    body: input.body,
    fallbackAssigneeUserId: input.userId,
  });

  if (!payload.title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const task = await createTaskForUser(
      input.userId,
      input.workspaceId,
      payload
    );

    await invalidateTaskListCache(input.workspaceId);

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create task.",
      },
      { status: 400 }
    );
  }
}
