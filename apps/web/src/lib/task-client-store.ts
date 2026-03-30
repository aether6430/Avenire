"use client";

import { toast } from "sonner";
import { readCachedTasks, writeCachedTasks } from "@/lib/dashboard-browser-cache";
import type { WorkspaceTask } from "@/lib/tasks";

interface TaskStoreSnapshot {
  errorMessage: string | null;
  loading: boolean;
  tasks: WorkspaceTask[];
  workspaceUuid: string | null;
}

const DEFAULT_SNAPSHOT: TaskStoreSnapshot = {
  errorMessage: null,
  loading: false,
  tasks: [],
  workspaceUuid: null,
};

let taskStoreSnapshot: TaskStoreSnapshot = DEFAULT_SNAPSHOT;
let taskStoreRequest: Promise<void> | null = null;
const taskStoreListeners = new Set<() => void>();

function emitTaskStore() {
  for (const listener of taskStoreListeners) {
    listener();
  }
}

function updateTaskStore(
  updater:
    | TaskStoreSnapshot
    | ((current: TaskStoreSnapshot) => TaskStoreSnapshot)
) {
  taskStoreSnapshot =
    typeof updater === "function" ? updater(taskStoreSnapshot) : updater;
  emitTaskStore();
}

export function subscribeToTaskStore(listener: () => void) {
  taskStoreListeners.add(listener);
  return () => {
    taskStoreListeners.delete(listener);
  };
}

export function getTaskStoreSnapshot() {
  return taskStoreSnapshot;
}

export function sortWorkspaceTasks(tasks: WorkspaceTask[]) {
  return tasks.slice().sort((left, right) => {
    const statusRank = (status: WorkspaceTask["status"]) => {
      switch (status) {
        case "planned":
          return 0;
        case "drafting":
          return 1;
        case "polishing":
          return 2;
        case "completed":
        default:
          return 3;
      }
    };

    const leftStatus = statusRank(left.status);
    const rightStatus = statusRank(right.status);
    if (leftStatus !== rightStatus) {
      return leftStatus - rightStatus;
    }

    const leftDue = left.dueAt
      ? new Date(left.dueAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt
      ? new Date(right.dueAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    const priorityRank = (priority: WorkspaceTask["priority"]) => {
      switch (priority) {
        case "high":
          return 2;
        case "normal":
          return 1;
        default:
          return 0;
      }
    };

    const priorityDiff = priorityRank(right.priority) - priorityRank(left.priority);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

export function primeWorkspaceTaskStore(workspaceUuid: string) {
  if (taskStoreSnapshot.workspaceUuid === workspaceUuid) {
    return;
  }

  const cached = readCachedTasks(workspaceUuid);
  updateTaskStore({
    errorMessage: null,
    loading: cached === null,
    tasks: cached ? sortWorkspaceTasks(cached) : [],
    workspaceUuid,
  });
}

export async function reloadWorkspaceTasks(
  workspaceUuid: string,
  options?: { background?: boolean }
) {
  if (taskStoreRequest && taskStoreSnapshot.workspaceUuid === workspaceUuid) {
    return taskStoreRequest;
  }

  if (
    taskStoreSnapshot.workspaceUuid !== workspaceUuid ||
    (!options?.background && taskStoreSnapshot.tasks.length === 0)
  ) {
    primeWorkspaceTaskStore(workspaceUuid);
  }

  if (!options?.background && taskStoreSnapshot.tasks.length === 0) {
    updateTaskStore((current) => ({ ...current, loading: true }));
  }

  taskStoreRequest = (async () => {
    try {
      const response = await fetch("/api/tasks?includeCompleted=true", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Could not load tasks right now.");
      }

      const payload = (await response.json()) as { tasks?: WorkspaceTask[] };
      const tasks = sortWorkspaceTasks(payload.tasks ?? []);
      writeCachedTasks(workspaceUuid, tasks);
      updateTaskStore({
        errorMessage: null,
        loading: false,
        tasks,
        workspaceUuid,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Could not load tasks right now.";
      updateTaskStore((current) => ({
        ...current,
        errorMessage,
        loading: false,
      }));
      toast.error(errorMessage);
    } finally {
      taskStoreRequest = null;
    }
  })();

  return taskStoreRequest;
}

export function patchWorkspaceTask(
  workspaceUuid: string,
  taskId: string,
  updater: (task: WorkspaceTask) => WorkspaceTask
) {
  updateTaskStore((current) => {
    if (current.workspaceUuid !== workspaceUuid) {
      return current;
    }
    const tasks = sortWorkspaceTasks(
      current.tasks.map((task) => (task.id === taskId ? updater(task) : task))
    );
    writeCachedTasks(workspaceUuid, tasks);
    return { ...current, tasks };
  });
}

export function upsertWorkspaceTask(workspaceUuid: string, task: WorkspaceTask) {
  updateTaskStore((current) => {
    if (current.workspaceUuid !== workspaceUuid) {
      return {
        errorMessage: null,
        loading: false,
        tasks: sortWorkspaceTasks([task]),
        workspaceUuid,
      };
    }
    const tasks = sortWorkspaceTasks(
      current.tasks
        .filter((entry) => entry.id !== task.id)
        .concat(task)
    );
    writeCachedTasks(workspaceUuid, tasks);
    return { ...current, tasks };
  });
}

export function removeWorkspaceTask(workspaceUuid: string, taskId: string) {
  updateTaskStore((current) => {
    if (current.workspaceUuid !== workspaceUuid) {
      return current;
    }
    const tasks = current.tasks.filter((task) => task.id !== taskId);
    writeCachedTasks(workspaceUuid, tasks);
    return { ...current, tasks };
  });
}

export function setWorkspaceTaskError(errorMessage: string | null) {
  updateTaskStore((current) => ({ ...current, errorMessage }));
  if (errorMessage) {
    toast.error(errorMessage);
  }
}
