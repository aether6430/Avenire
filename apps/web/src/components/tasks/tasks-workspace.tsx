"use client";

import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { ListChecks, Plus } from "@phosphor-icons/react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { HeaderActions, HeaderBreadcrumbs, HeaderLeadingIcon } from "@/components/dashboard/header-portal";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskListPane } from "@/components/tasks/task-list-pane";
import { TaskMobileSheet } from "@/components/tasks/task-mobile-sheet";
import {
  createTaskDraft,
  type TaskEditorDraft,
  type TaskGrouping,
  type TaskStatusFilter,
} from "@/components/tasks/types";
import {
  getTaskGroupLabel,
  TASKS_REFRESH_EVENT,
  type WorkspaceMemberOption,
  type WorkspaceTask,
} from "@/lib/tasks";
import {
  getTaskStoreSnapshot,
  patchWorkspaceTask,
  primeWorkspaceTaskStore,
  reloadWorkspaceTasks,
  removeWorkspaceTask,
  setWorkspaceTaskError,
  sortWorkspaceTasks,
  subscribeToTaskStore,
  upsertWorkspaceTask,
} from "@/lib/task-client-store";
import { useWorkspaceHistoryStore } from "@/stores/workspaceHistoryStore";

function buildTaskPayload(draft: TaskEditorDraft) {
  return {
    assigneeUserId: draft.assigneeUserId,
    description: draft.description.trim() || null,
    dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null,
    priority: draft.priority,
    status: draft.status,
    title: draft.title.trim(),
  };
}

function sameDraft(left: TaskEditorDraft | null, right: TaskEditorDraft | null) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildStatusGroups(tasks: WorkspaceTask[]) {
  const buckets = [
    { key: "in_progress", label: getTaskGroupLabel("in_progress"), tasks: [] as WorkspaceTask[] },
    { key: "pending", label: getTaskGroupLabel("pending"), tasks: [] as WorkspaceTask[] },
    { key: "completed", label: getTaskGroupLabel("completed"), tasks: [] as WorkspaceTask[] },
  ];

  for (const task of tasks) {
    const bucket = buckets.find((entry) => entry.key === task.status) ?? buckets[1];
    bucket.tasks.push(task);
  }

  return buckets;
}

function buildDueGroups(tasks: WorkspaceTask[]) {
  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const buckets = [
    { key: "overdue", label: getTaskGroupLabel("overdue"), tasks: [] as WorkspaceTask[] },
    { key: "today", label: getTaskGroupLabel("today"), tasks: [] as WorkspaceTask[] },
    { key: "upcoming", label: getTaskGroupLabel("upcoming"), tasks: [] as WorkspaceTask[] },
    { key: "no_date", label: getTaskGroupLabel("no_date"), tasks: [] as WorkspaceTask[] },
    { key: "completed", label: getTaskGroupLabel("completed"), tasks: [] as WorkspaceTask[] },
  ];

  for (const task of tasks) {
    if (task.status === "completed") {
      buckets[4]?.tasks.push(task);
      continue;
    }
    if (!task.dueAt) {
      buckets[3]?.tasks.push(task);
      continue;
    }

    const due = new Date(task.dueAt);
    if (due < startOfToday) {
      buckets[0]?.tasks.push(task);
    } else if (due <= endOfToday) {
      buckets[1]?.tasks.push(task);
    } else if (due > now) {
      buckets[2]?.tasks.push(task);
    } else {
      buckets[0]?.tasks.push(task);
    }
  }

  return buckets;
}

export function TasksWorkspace({
  currentUserId,
  workspaceId,
}: {
  currentUserId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const recordRoute = useWorkspaceHistoryStore((state) => state.recordRoute);
  const { errorMessage, loading, tasks: allTasks } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [grouping, setGrouping] = useState<TaskGrouping>("status");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | "idle">("idle");
  const [draft, setDraft] = useState<TaskEditorDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);
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
  const isDirty = !sameDraft(draft, baselineDraft);

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
    const taskId = searchParams.get("task");
    if (!taskId) {
      return;
    }
    setSelectedTaskId(taskId);
    setMode("edit");
    setSheetOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const response = await fetch(
          `/api/workspaces/${workspaceId}/share/members`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Could not load workspace members.");
        }
        const payload = (await response.json()) as {
          members?: WorkspaceMemberOption[];
        };
        setMembers(payload.members ?? []);
      } catch {
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };

    void loadMembers();
  }, [workspaceId]);

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

  const filteredTasks = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }
      if (assigneeFilter !== "all" && task.assigneeUserId !== assigneeFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [task.title, task.description ?? "", task.assignee?.name ?? "", task.assignee?.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [assigneeFilter, deferredSearchQuery, statusFilter, tasks]);

  const groupedTasks = useMemo(
    () => (grouping === "due" ? buildDueGroups(filteredTasks) : buildStatusGroups(filteredTasks)),
    [filteredTasks, grouping]
  );

  const syncTaskParam = (taskId: string | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (taskId) {
      nextParams.set("task", taskId);
    } else {
      nextParams.delete("task");
    }

    startTransition(() => {
      router.replace(
        (nextParams.size > 0
          ? `${pathname}?${nextParams.toString()}`
          : pathname) as Route,
        { scroll: false }
      );
    });
  };

  const confirmDiscard = () =>
    !isDirty || window.confirm("Discard your unsaved task changes?");

  const handleSelectTask = (taskId: string) => {
    if (!confirmDiscard()) {
      return;
    }

    const nextTask = tasks.find((task) => task.id === taskId);
    setSelectedTaskId(taskId);
    setMode("edit");
    setDraft(createTaskDraft(currentUserId, nextTask));
    setSheetOpen(true);
    syncTaskParam(taskId);
  };

  const handleCreateTask = () => {
    if (!confirmDiscard()) {
      return;
    }

    setSelectedTaskId(null);
    setMode("create");
    setDraft(createTaskDraft(currentUserId));
    setSheetOpen(true);
    syncTaskParam(null);
  };

  const handleReset = () => {
    setDraft(baselineDraft);
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/tasks" : `/api/tasks/${selectedTaskId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildTaskPayload(draft)),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        task?: WorkspaceTask;
      };
      if (!response.ok || !payload.task) {
        throw new Error(payload.error ?? "Unable to save task.");
      }

      const savedTask = payload.task;
      upsertWorkspaceTask(workspaceId, savedTask);
      setSelectedTaskId(savedTask.id);
      setMode("edit");
      setDraft(createTaskDraft(currentUserId, savedTask));
      syncTaskParam(savedTask.id);
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
      const response = await fetch(`/api/tasks/${selectedTaskId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Unable to delete task.");
      }
      setMode("idle");
      setDraft(null);
      setSelectedTaskId(null);
      setSheetOpen(false);
      syncTaskParam(null);
      void reloadWorkspaceTasks(workspaceId, { background: true });
    } catch (error) {
      upsertWorkspaceTask(workspaceId, deletedTask);
      setWorkspaceTaskError(
        error instanceof Error ? error.message : "Unable to delete task."
      );
    }
  };

  const toggleTaskComplete = async (task: WorkspaceTask) => {
    const previous = task;
    const nextStatus = task.status === "completed" ? "pending" : "completed";

    patchWorkspaceTask(workspaceId, task.id, (current) => ({
      ...current,
      completedAt:
        nextStatus === "completed" ? new Date().toISOString() : null,
      status: nextStatus,
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
      if (!response.ok || !payload.task) {
        throw new Error(payload.error ?? "Unable to update task.");
      }
      upsertWorkspaceTask(workspaceId, payload.task);
      void reloadWorkspaceTasks(workspaceId, { background: true });
    } catch (error) {
      upsertWorkspaceTask(workspaceId, previous);
      setWorkspaceTaskError(
        error instanceof Error ? error.message : "Unable to update task."
      );
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button onClick={handleCreateTask} type="button">
        <Plus className="size-3.5" />
        New task
      </Button>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-background">
      <HeaderLeadingIcon>
        <ListChecks className="size-3.5" />
      </HeaderLeadingIcon>
      <HeaderBreadcrumbs>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-sm">Tasks</p>
        </div>
      </HeaderBreadcrumbs>
      <HeaderActions>{headerActions}</HeaderActions>

      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Tasks
          </h1>
          <p className="text-muted-foreground text-sm">
            Assigned, scheduled, and in progress across the current workspace.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive text-xs">
            {errorMessage}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden border-t border-border/70">
          <TaskFilters
            assigneeFilter={assigneeFilter}
            grouping={grouping}
            members={members}
            onAssigneeFilterChange={setAssigneeFilter}
            onGroupingChange={setGrouping}
            onSearchQueryChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
          />
          {loading && tasks.length === 0 ? (
            <div className="flex min-h-[18rem] items-center justify-center text-muted-foreground text-sm">
              <Spinner className="mr-2 size-4" />
              Loading tasks...
            </div>
          ) : (
            <TaskListPane
              groups={groupedTasks}
              onSelectTask={handleSelectTask}
              onToggleComplete={toggleTaskComplete}
              selectedTaskId={selectedTaskId}
            />
          )}
        </div>
      </div>

      <TaskMobileSheet
        draft={draft}
        isDirty={isDirty}
        isOpen={sheetOpen && mode !== "idle"}
        isSaving={isSaving || loadingMembers}
        members={members}
        mode={mode}
        onDelete={handleDelete}
        onDraftChange={(updates) =>
          setDraft((current) => (current ? { ...current, ...updates } : current))
        }
        onOpenChange={(open) => {
          if (!open) {
            if (!confirmDiscard()) {
              return;
            }
            setSheetOpen(false);
            if (mode === "create") {
              setMode("idle");
              setDraft(null);
            }
            syncTaskParam(null);
            return;
          }
          setSheetOpen(true);
        }}
        onReset={handleReset}
        onSave={handleSave}
        onToggleComplete={() => {
          if (selectedTask) {
            void toggleTaskComplete(selectedTask);
          }
        }}
        task={selectedTask}
      />
    </div>
  );
}
