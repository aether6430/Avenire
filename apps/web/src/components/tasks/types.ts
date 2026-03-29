"use client";

import type { WorkspaceTask, WorkspaceTaskPriority, WorkspaceTaskStatus } from "@/lib/tasks";

export type TaskGrouping = "due" | "status";
export type TaskStatusFilter = "all" | WorkspaceTaskStatus;

export interface TaskEditorDraft {
  assigneeUserId: string;
  description: string;
  dueAt: string;
  priority: WorkspaceTaskPriority;
  status: WorkspaceTaskStatus;
  title: string;
}

export function createTaskDraft(
  currentUserId: string,
  task?: WorkspaceTask | null
): TaskEditorDraft {
  if (!task) {
    return {
      assigneeUserId: currentUserId,
      description: "",
      dueAt: "",
      priority: "normal",
      status: "pending",
      title: "",
    };
  }

  return {
    assigneeUserId: task.assigneeUserId ?? currentUserId,
    description: task.description ?? "",
    dueAt: task.dueAt ? toDateTimeLocalValue(task.dueAt) : "",
    priority: task.priority ?? "normal",
    status: task.status,
    title: task.title,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateTimeLocalValue(isoValue: string) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
