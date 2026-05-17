"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getDashboardDisplayTasks,
  getDashboardTaskManagerState,
} from "@/components/dashboard/dashboard-task-manager-model";
import {
  deleteWorkspaceTaskWithRollback,
  updateWorkspaceTaskStatusWithRollback,
} from "@/components/tasks/tasks-mutation-runtime";
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
    const previousStatus = task.status;
    const nextStatus = previousStatus === "completed" ? "planned" : "completed";

    await updateWorkspaceTaskStatusWithRollback({
      nextStatus,
      patchWorkspaceTask,
      persistTaskStatus: async (input) => {
        const response = await fetch(`/api/tasks/${input.taskId}`, {
          body: JSON.stringify({ status: input.status }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          task?: WorkspaceTask;
        };
        if (!(response.ok && payload.task)) {
          throw new Error(payload.error ?? "Failed to update task.");
        }
        return payload.task;
      },
      reloadWorkspaceTasks,
      setWorkspaceTaskError,
      task,
      upsertWorkspaceTask,
      workspaceId,
    });
  };

  const handleDeleteTask = async (task: WorkspaceTask) => {
    await deleteWorkspaceTaskWithRollback({
      deleteTaskRecord: async (taskId) => {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete task.");
        }
      },
      reloadWorkspaceTasks,
      removeWorkspaceTask,
      setWorkspaceTaskError,
      task,
      upsertWorkspaceTask,
      workspaceId,
    });
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
