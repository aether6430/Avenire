import { createTaskForUser } from "@avenire/database/task-data";
import { NextResponse } from "next/server";
import { invalidateTaskListCache } from "@/lib/tasks-cache";
import type { CaptureRequestBody } from "./capture-route-model";
import {
  CAPTURE_TASK_ERROR,
  resolveCaptureRouteError,
  resolveTaskCapturePayload,
} from "./capture-route-model";

export async function handleCaptureTask(input: {
  body: CaptureRequestBody;
  userId: string;
  workspaceId: string;
}) {
  const payload = resolveTaskCapturePayload(input.body, input.userId);
  if (!payload.title) {
    return NextResponse.json(
      { error: "Task title is required" },
      { status: 400 }
    );
  }

  try {
    const task = await createTaskForUser(
      input.userId,
      input.workspaceId,
      payload
    );
    await invalidateTaskListCache(input.workspaceId);
    return NextResponse.json({ kind: "task", task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveCaptureRouteError(error, CAPTURE_TASK_ERROR),
      },
      { status: 500 }
    );
  }
}
