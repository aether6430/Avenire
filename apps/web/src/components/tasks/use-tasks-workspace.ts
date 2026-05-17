"use client";

import type { Route } from "next";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  deleteWorkspaceTaskRecord,
  saveWorkspaceTaskDraft,
  updateWorkspaceTaskStatus,
} from "@/components/tasks/tasks-workspace-client";
import {
  buildGroupedTasks,
  buildStatusGroups,
  buildTasksWorkspaceRoute,
  filterWorkspaceTasks,
  sameTaskDraft,
  type TasksWorkspaceProps,
} from "@/components/tasks/tasks-workspace-model";
import {
  buildOptimisticTaskStatusUpdate,
  resolveTasksWorkspaceClosedSheetState,
  resolveTasksWorkspaceCreateState,
  resolveTasksWorkspaceDeleteSuccess,
  resolveTasksWorkspaceEditState,
  resolveTasksWorkspaceSaveSuccess,
} from "@/components/tasks/tasks-workspace-runtime-model";
import {
  createTaskDraft,
  type TaskEditorDraft,
  type TaskGrouping,
  type TaskStatusFilter,
  type TaskViewMode,
} from "@/components/tasks/types";
import { emitPetNotification } from "@/lib/pet-preferences";
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
import {
  TASKS_REFRESH_EVENT,
  type WorkspaceMemberOption,
  type WorkspaceTask,
} from "@/lib/tasks";
import { useUserSettings } from "@/lib/user-settings-client";
import {
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { usePaneWorkspaceHistoryActions } from "@/stores/workspaceHistoryStore";

export function useTasksWorkspace({
  currentUserAvatar,
  currentUserEmail,
  currentUserId,
  currentUserName,
  workspaceId,
}: TasksWorkspaceProps) {
  const router = usePaneRouter();
  const pathname = usePanePathname();
  const searchParams = usePaneSearchParams();
  const { recordRoute } = usePaneWorkspaceHistoryActions();
  const {
    loadFailed,
    loading,
    tasks: allTasks,
  } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [grouping, setGrouping] = useState<TaskGrouping>("status");
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "idle">("idle");
  const [draft, setDraft] = useState<TaskEditorDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<WorkspaceTask["status"] | null>(
    null
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    settings: { completedTasksAtTop },
  } = useUserSettings();

  const members = useMemo<WorkspaceMemberOption[]>(
    () => [
      {
        avatar: currentUserAvatar ?? null,
        email: currentUserEmail ?? null,
        name: currentUserName ?? null,
        userId: currentUserId,
      },
    ],
    [currentUserAvatar, currentUserEmail, currentUserId, currentUserName]
  );

  const tasks = useMemo(
    () => allTasks.filter((task) => task.workspaceId === workspaceId),
    [allTasks, workspaceId]
  );
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );
  const baselineDraft = useMemo(
    () =>
      mode === "create"
        ? createTaskDraft(currentUserId)
        : selectedTask
          ? createTaskDraft(currentUserId, selectedTask)
          : null,
    [currentUserId, mode, selectedTask]
  );
  const isDirty = !sameTaskDraft(draft, baselineDraft);

  const filteredTasks = useMemo(
    () =>
      filterWorkspaceTasks({
        assigneeFilter,
        query: deferredSearchQuery,
        statusFilter,
        tasks,
      }),
    [assigneeFilter, deferredSearchQuery, statusFilter, tasks]
  );

  const groupedTasks = useMemo(
    () =>
      buildGroupedTasks({
        filteredTasks,
        grouping,
      }),
    [filteredTasks, grouping]
  );

  const kanbanGroups = useMemo(
    () => buildStatusGroups(filteredTasks),
    [filteredTasks]
  );

  useEffect(() => {
    recordRoute("/workspace/tasks");
  }, [recordRoute]);

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

  useEffect(() => {
    void reloadWorkspaceTasks(workspaceId, { background: true });
  }, [workspaceId]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId) {
      return;
    }
    setSelectedTaskId(taskId);
    setMode("edit");
    setSheetOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (mode !== "edit" || !selectedTask) {
      return;
    }

    setDraft((current) => {
      if (current && isDirty) {
        return current;
      }
      return createTaskDraft(currentUserId, selectedTask);
    });
  }, [currentUserId, isDirty, mode, selectedTask]);

  const syncTaskParam = (taskId: string | null) => {
    const nextRoute = buildTasksWorkspaceRoute({
      pathname,
      searchParams: searchParams.toString(),
      taskId,
    });

    startTransition(() => {
      router.replace(nextRoute as Route, { scroll: false });
    });
  };

  const confirmDiscard = () =>
    !isDirty || window.confirm("Discard your unsaved task changes?");

  const handleSelectTask = (taskId: string) => {
    if (!confirmDiscard()) {
      return;
    }

    const nextTask = tasks.find((task) => task.id === taskId);
    const nextState = resolveTasksWorkspaceEditState({
      currentUserId,
      selectedTask: nextTask ?? null,
      taskId,
    });
    setSelectedTaskId(nextState.selectedTaskId);
    setMode(nextState.mode);
    setDraft(nextState.draft);
    setSheetOpen(nextState.sheetOpen);
    syncTaskParam(nextState.routeTaskId);
  };

  const handleCreateTask = () => {
    if (!confirmDiscard()) {
      return;
    }

    const nextState = resolveTasksWorkspaceCreateState(currentUserId);
    setSelectedTaskId(nextState.selectedTaskId);
    setMode(nextState.mode);
    setDraft(nextState.draft);
    setSheetOpen(nextState.sheetOpen);
    syncTaskParam(nextState.routeTaskId);
  };

  const handleReset = () => {
    setDraft(baselineDraft);
  };

  const moveTaskStatus = async (
    task: WorkspaceTask,
    nextStatus: WorkspaceTask["status"]
  ) => {
    const previous = task;
    const optimisticNowIso = new Date().toISOString();

    patchWorkspaceTask(workspaceId, task.id, (current) => ({
      ...buildOptimisticTaskStatusUpdate({
        nextStatus,
        nowIso: optimisticNowIso,
        task: current,
      }),
    }));

    try {
      const updatedTask = await updateWorkspaceTaskStatus({
        status: nextStatus,
        taskId: task.id,
      });
      upsertWorkspaceTask(workspaceId, updatedTask);
      if (
        previous.status !== "completed" &&
        updatedTask.status === "completed"
      ) {
        emitPetNotification({
          animation: "waving",
          message: "Nice work",
          tone: "success",
        });
      }
      void reloadWorkspaceTasks(workspaceId, { background: true });
    } catch (error) {
      upsertWorkspaceTask(workspaceId, previous);
      setWorkspaceTaskError(
        error instanceof Error ? error.message : "Unable to update task."
      );
    }
  };

  const handleSave = async () => {
    if (!draft || mode === "idle") {
      return;
    }

    setIsSaving(true);
    try {
      const savedTask = await saveWorkspaceTaskDraft({
        draft,
        mode,
        selectedTaskId,
      });

      upsertWorkspaceTask(workspaceId, savedTask);
      const nextState = resolveTasksWorkspaceSaveSuccess({
        currentUserId,
        mode,
        savedTask,
      });
      setSelectedTaskId(nextState.selectedTaskId);
      setMode(nextState.mode);
      setDraft(nextState.draft);
      setSheetOpen(nextState.sheetOpen);
      syncTaskParam(nextState.routeTaskId);
      void reloadWorkspaceTasks(workspaceId, { background: true });
    } catch (error) {
      setWorkspaceTaskError(
        error instanceof Error ? error.message : "Unable to save task."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!(selectedTask && selectedTaskId)) {
      return;
    }

    const deletedTask = selectedTask;
    removeWorkspaceTask(workspaceId, selectedTaskId);

    try {
      await deleteWorkspaceTaskRecord(selectedTaskId);
      const nextState = resolveTasksWorkspaceDeleteSuccess();
      setMode(nextState.mode);
      setDraft(nextState.draft);
      setSelectedTaskId(nextState.selectedTaskId);
      setSheetOpen(nextState.sheetOpen);
      syncTaskParam(nextState.routeTaskId);
      void reloadWorkspaceTasks(workspaceId, { background: true });
    } catch (error) {
      upsertWorkspaceTask(workspaceId, deletedTask);
      setWorkspaceTaskError(
        error instanceof Error ? error.message : "Unable to delete task."
      );
    }
  };

  const toggleTaskComplete = async (task: WorkspaceTask) => {
    await moveTaskStatus(
      task,
      task.status === "completed" ? "planned" : "completed"
    );
  };

  const handleDragStartTask = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragEndTask = () => {
    setDraggedTaskId(null);
    setDropStatus(null);
  };

  const handleDropStatus = async (
    taskId: string,
    nextStatus: WorkspaceTask["status"]
  ) => {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) {
      return;
    }

    setDropStatus(null);
    setDraggedTaskId(null);
    if (task.status === nextStatus) {
      return;
    }

    await moveTaskStatus(task, nextStatus);
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      if (!confirmDiscard()) {
        return;
      }
      const nextState = resolveTasksWorkspaceClosedSheetState({
        draft,
        mode,
      });
      setSheetOpen(nextState.sheetOpen);
      setDraft(nextState.draft);
      syncTaskParam(nextState.routeTaskId);
      return;
    }

    setSheetOpen(true);
  };

  return {
    assigneeFilter,
    dropStatus,
    draggedTaskId,
    draft,
    groupedTasks,
    grouping,
    handleCreateTask,
    handleDelete,
    handleDragEndTask,
    handleDragStartTask,
    handleDropStatus,
    handleReset,
    handleSave,
    handleSheetOpenChange,
    handleSelectTask,
    isDirty,
    isSaving,
    kanbanGroups,
    loadFailed,
    loading,
    members,
    mode,
    searchQuery,
    selectedTask,
    selectedTaskId,
    setAssigneeFilter,
    setDraft,
    setDropStatus,
    setGrouping,
    setSearchQuery,
    setStatusFilter,
    setViewMode,
    sheetOpen,
    statusFilter,
    tasks,
    toggleTaskComplete,
    viewMode,
    workspaceId,
  };
}

export type TasksWorkspaceRuntime = ReturnType<typeof useTasksWorkspace>;
