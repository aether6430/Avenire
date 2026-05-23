"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getTaskStoreSnapshot,
  primeWorkspaceTaskStore,
  reloadWorkspaceTasks,
  subscribeToTaskStore,
} from "@/lib/task-client-store";

export function useCommandPaletteWorkspaceTasks({
  open,
  resolvedWorkspaceUuid,
}: {
  open: boolean;
  resolvedWorkspaceUuid: string | null;
}) {
  const {
    errorMessage: workspaceTasksErrorMessage,
    loadFailed: workspaceTasksLoadFailed,
    tasks: cachedTasks,
  } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );

  useEffect(() => {
    if (!(open && resolvedWorkspaceUuid)) {
      return;
    }

    primeWorkspaceTaskStore(resolvedWorkspaceUuid);
    void reloadWorkspaceTasks(resolvedWorkspaceUuid, { background: true });
  }, [open, resolvedWorkspaceUuid]);

  const workspaceTasks = useMemo(
    () =>
      cachedTasks
        .filter((task) => task.workspaceId === resolvedWorkspaceUuid)
        .slice(0, 8),
    [cachedTasks, resolvedWorkspaceUuid]
  );

  return {
    workspaceTasksErrorMessage,
    workspaceTasks,
    workspaceTasksLoadFailed,
  };
}
