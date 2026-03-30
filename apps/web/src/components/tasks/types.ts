"use client";

import type { WorkspaceTask, WorkspaceTaskPriority, WorkspaceTaskStatus } from "@/lib/tasks";

export type TaskGrouping = "due" | "status";
export type TaskViewMode = "list" | "kanban";
export type TaskStatusFilter = "all" | WorkspaceTaskStatus;

export interface TaskEditorDraft {
  assigneeUserId: string;
  selectedAssignee?: import("@/lib/tasks").WorkspaceMemberOption | null;
  description: string;
  dueAt: string;
  priority: WorkspaceTaskPriority;
  resources: WorkspaceTask["resources"];
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
      selectedAssignee: null,
      description: "",
      dueAt: "",
      priority: "normal",
      resources: [],
      status: "planned",
      title: "",
    };
  }

  return {
    assigneeUserId: task.assigneeUserId ?? currentUserId,
    selectedAssignee: task.assignee ?? null,
    description: task.description ?? "",
    dueAt: task.dueAt ? toDateTimeLocalValue(task.dueAt) : "",
    priority: task.priority ?? "normal",
    resources: task.resources ?? [],
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
