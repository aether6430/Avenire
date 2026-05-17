"use client";

import { toast } from "sonner";
import {
  readCachedTasks,
  writeCachedTasks,
} from "@/lib/dashboard-browser-cache";
import {
  applyPatchedTaskToSnapshot,
  applyRemovedTaskFromSnapshot,
  applyTaskStoreError,
  applyTaskStoreErrorMessage,
  applyTaskStoreLoading,
  applyUpsertedTaskToSnapshot,
  createPrimedTaskStoreSnapshot,
  DEFAULT_TASK_STORE_SNAPSHOT,
  sortWorkspaceTasksWithPreferences,
  type TaskStoreSnapshot,
  toTaskStoreErrorMessage,
} from "@/lib/task-client-store-model";
import type { WorkspaceTask } from "@/lib/tasks";
import { getUserSettingsSnapshot } from "@/lib/user-settings-client";

let taskStoreSnapshot: TaskStoreSnapshot = DEFAULT_TASK_STORE_SNAPSHOT;
let taskStoreRequest: Promise<void> | null = null;
const taskStoreListeners = new Set<() => void>();

function getCompletedTasksAtTop() {
  return getUserSettingsSnapshot().settings.completedTasksAtTop;
}

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
  return sortWorkspaceTasksWithPreferences(tasks, {
    completedTasksAtTop: getCompletedTasksAtTop(),
  });
}

export function primeWorkspaceTaskStore(workspaceUuid: string) {
  if (taskStoreSnapshot.workspaceUuid === workspaceUuid) {
    return;
  }

  updateTaskStore(
    createPrimedTaskStoreSnapshot({
      cachedTasks: readCachedTasks(workspaceUuid),
      completedTasksAtTop: getCompletedTasksAtTop(),
      workspaceUuid,
    })
  );
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
    updateTaskStore((current) => applyTaskStoreLoading(current));
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
        loadFailed: false,
        loading: false,
        tasks,
        workspaceUuid,
      });
    } catch (error) {
      const errorMessage = toTaskStoreErrorMessage(error);
      updateTaskStore((current) => applyTaskStoreError(current, errorMessage));
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
    const next = applyPatchedTaskToSnapshot({
      completedTasksAtTop: getCompletedTasksAtTop(),
      current,
      taskId,
      updater,
      workspaceUuid,
    });

    if (next !== current) {
      writeCachedTasks(workspaceUuid, next.tasks);
    }
    return next;
  });
}

export function upsertWorkspaceTask(
  workspaceUuid: string,
  task: WorkspaceTask
) {
  updateTaskStore((current) => {
    const next = applyUpsertedTaskToSnapshot({
      completedTasksAtTop: getCompletedTasksAtTop(),
      current,
      task,
      workspaceUuid,
    });

    writeCachedTasks(workspaceUuid, next.tasks);
    return next;
  });
}

export function removeWorkspaceTask(workspaceUuid: string, taskId: string) {
  updateTaskStore((current) => {
    const next = applyRemovedTaskFromSnapshot({
      current,
      taskId,
      workspaceUuid,
    });

    if (next !== current) {
      writeCachedTasks(workspaceUuid, next.tasks);
    }
    return next;
  });
}

export function setWorkspaceTaskError(errorMessage: string | null) {
  updateTaskStore((current) =>
    applyTaskStoreErrorMessage(current, errorMessage)
  );
  if (errorMessage) {
    toast.error(errorMessage);
  }
}
