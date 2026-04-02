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
  const trimmedValue = isoValue.trim();
  if (!trimmedValue) {
    return "";
  }

  const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 23, 59);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const date = new Date(trimmedValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
