"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getDashboardDisplayTasks,
  getDashboardTaskManagerState,
} from "@/components/dashboard/dashboard-task-manager-model";
import { buildOptimisticTaskStatusUpdate } from "@/components/tasks/tasks-workspace-runtime-model";
import {
  getTaskStoreSnapshot,
  patchWorkspaceTask,
  primeWorkspaceTaskStore,
  reloadWorkspaceTasks,
  removeWorkspaceTask,
  setWorkspaceTaskError,
  subscribeToTaskStore,
  upsertWorkspaceTask,
} from "@/lib/task-client-store";
import type { WorkspaceTask } from "@/lib/tasks";
import { TASKS_REFRESH_EVENT } from "@/lib/tasks";
import { useUserSettings } from "@/lib/user-settings-client";

export function useDashboardTaskManager({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null);
  const { loadFailed, loading, tasks } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );
  const {
    settings: { completedTasksAtTop },
  } = useUserSettings();

  useEffect(() => {
    primeWorkspaceTaskStore(workspaceId);
    void reloadWorkspaceTasks(workspaceId);

    const refresh = () => {
      void reloadWorkspaceTasks(workspaceId, { background: true });
    };

    window.addEventListener(TASKS_REFRESH_EVENT, refresh);
    return () => {
      window.removeEventListener(TASKS_REFRESH_EVENT, refresh);
    };
  }, [workspaceId]);

  const sortedTasks = getDashboardDisplayTasks({
    completedTasksAtTop,
    tasks,
    workspaceId,
  });

  const pendingCount = sortedTasks.filter(
    (task) => task.status !== "completed"
  ).length;

  const handleToggleTask = async (task: WorkspaceTask) => {
    const previousTask = task;
    const previousStatus = task.status;
    const nextStatus = previousStatus === "completed" ? "planned" : "completed";
    const optimisticNowIso = new Date().toISOString();

    patchWorkspaceTask(workspaceId, task.id, (current) => ({
      ...buildOptimisticTaskStatusUpdate({
        nextStatus,
        nowIso: optimisticNowIso,
        task: current,
      }),
    }));

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        task?: WorkspaceTask;
      };
      if (!(response.ok && payload.task)) {
        throw new Error(payload.error ?? "Failed to update task.");
      }
      patchWorkspaceTask(
        workspaceId,
        task.id,
        () => payload.task as WorkspaceTask
      );
      void reloadWorkspaceTasks(workspaceId, { background: true });
    } catch (error) {
      upsertWorkspaceTask(workspaceId, previousTask);
      setWorkspaceTaskError(
        error instanceof Error ? error.message : "Could not update that task."
      );
    }
  };

  const handleDeleteTask = async (task: WorkspaceTask) => {
    removeWorkspaceTask(workspaceId, task.id);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete task.");
      }
      void reloadWorkspaceTasks(workspaceId, { background: true });
    } catch (error) {
      upsertWorkspaceTask(workspaceId, task);
      setWorkspaceTaskError(
        error instanceof Error ? error.message : "Could not delete that task."
      );
    }
  };

  const displayTasks = sortedTasks.slice(0, 10);
  const taskManagerState = getDashboardTaskManagerState({
    loadFailed,
    loading,
    visibleTaskCount: sortedTasks.length,
  });

  return {
    displayTasks,
    editingTask,
    handleDeleteTask,
    handleToggleTask,
    pendingCount,
    setEditingTask,
    taskManagerState,
  };
}
