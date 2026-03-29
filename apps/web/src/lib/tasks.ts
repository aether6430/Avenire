import type { TaskPriority, TaskRecord, TaskStatus } from "@avenire/database/task-data";

export type WorkspaceTask = TaskRecord;
export type WorkspaceTaskStatus = TaskStatus;
export type WorkspaceTaskPriority = TaskPriority;

export interface WorkspaceMemberOption {
  avatar?: string | null;
  email: string | null;
  name: string | null;
  role?: string | null;
  userId: string | null;
}

export const TASKS_REFRESH_EVENT = "dashboard.tasks.refresh";

export function dispatchTasksRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(TASKS_REFRESH_EVENT));
}

export function getTaskStatusLabel(status: WorkspaceTaskStatus) {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    default:
      return "To do";
  }
}

export function getTaskPriorityLabel(priority: WorkspaceTaskPriority | null) {
  switch (priority) {
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Normal";
  }
}

export function getTaskPriorityRank(priority: WorkspaceTaskPriority | null) {
  switch (priority) {
    case "high":
      return 2;
    case "normal":
      return 1;
    default:
      return 0;
  }
}

export function formatTaskDueDate(
  dueAt: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  }
) {
  if (!dueAt) {
    return "No date";
  }

  return new Date(dueAt).toLocaleDateString("en-US", options);
}

export function getTaskInitials(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function getTaskGroupLabel(
  group: "completed" | "in_progress" | "pending" | "overdue" | "today" | "upcoming" | "no_date"
) {
  switch (group) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In progress";
    case "overdue":
      return "Overdue";
    case "today":
      return "Today";
    case "upcoming":
      return "Upcoming";
    case "no_date":
      return "No date";
    default:
      return "To do";
  }
}
