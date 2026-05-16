"use client";

import { buildTaskPayload } from "@/components/tasks/tasks-workspace-model";
import type { TaskEditorDraft } from "@/components/tasks/types";
import type { WorkspaceTask } from "@/lib/tasks";

async function parseTaskWorkspaceResponse(
  response: Response,
  fallback: string
) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    task?: WorkspaceTask;
  };

  if (!(response.ok && payload.task)) {
    throw new Error(payload.error ?? fallback);
  }

  return payload.task;
}

export async function updateWorkspaceTaskStatus(input: {
  status: WorkspaceTask["status"];
  taskId: string;
}) {
  const response = await fetch(`/api/tasks/${input.taskId}`, {
    body: JSON.stringify({ status: input.status }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  return parseTaskWorkspaceResponse(response, "Unable to update task.");
}

export async function saveWorkspaceTaskDraft(input: {
  draft: TaskEditorDraft;
  mode: "create" | "edit";
  selectedTaskId: string | null;
}) {
  const response = await fetch(
    input.mode === "create"
      ? "/api/tasks"
      : `/api/tasks/${input.selectedTaskId}`,
    {
      body: JSON.stringify(buildTaskPayload(input.draft)),
      headers: { "Content-Type": "application/json" },
      method: input.mode === "create" ? "POST" : "PATCH",
    }
  );

  return parseTaskWorkspaceResponse(response, "Unable to save task.");
}

export async function deleteWorkspaceTaskRecord(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Unable to delete task.");
  }
}
