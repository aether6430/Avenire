"use client";

import { Button } from "@avenire/ui/components/button";
import { Card, CardContent, CardHeader } from "@avenire/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { Spinner } from "@avenire/ui/components/spinner";
import { CalendarDots as CalendarDays, CheckCircle as CheckCircle2, Circle, Pencil, Sparkle as Sparkles, Trash as Trash2 } from "@phosphor-icons/react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { QuickCaptureDialog } from "@/components/dashboard/quick-capture-dialog";
import { subscribeToTaskStore, getTaskStoreSnapshot, patchWorkspaceTask, primeWorkspaceTaskStore, reloadWorkspaceTasks, removeWorkspaceTask, setWorkspaceTaskError, upsertWorkspaceTask } from "@/lib/task-client-store";
import type { WorkspaceTask } from "@/lib/tasks";
import { TASKS_REFRESH_EVENT } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export function DashboardTaskManager({
  currentUserId,
  workspaceId,
}: {
  currentUserId: string;
  workspaceId: string;
}) {
  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null);
  const { errorMessage, loading, tasks } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );

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

  const sortedTasks = useMemo(
    () =>
      tasks.filter((task) => task.workspaceId === workspaceId).sort((left, right) => {
        if (left.status === "completed" && right.status !== "completed") {
          return -1;
        }
        if (left.status !== "completed" && right.status === "completed") {
          return 1;
        }
        if (left.dueAt && right.dueAt) {
          return (
            new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
          );
        }
        if (left.dueAt) {
          return -1;
        }
        if (right.dueAt) {
          return 1;
        }
        return 0;
      }),
    [tasks, workspaceId]
  );

  const pendingCount = sortedTasks.filter(
    (task) => task.status !== "completed"
  ).length;

  const handleToggleTask = async (task: WorkspaceTask) => {
    const previousTask = task;
    const previousStatus = task.status;
    const nextStatus = previousStatus === "completed" ? "pending" : "completed";

    patchWorkspaceTask(workspaceId, task.id, (current) => ({
      ...current,
      completedAt:
        nextStatus === "completed"
          ? new Date().toISOString()
          : null,
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
        throw new Error(payload.error ?? "Failed to update task.");
      }
      patchWorkspaceTask(workspaceId, task.id, () => payload.task as WorkspaceTask);
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

  const displayTasks = useMemo(() => {
    const completedTasks = sortedTasks.filter(
      (task) => task.status === "completed"
    );
    const nonCompletedTasks = sortedTasks.filter(
      (task) => task.status !== "completed"
    );

    if (sortedTasks.length > 10 && completedTasks.length > 0) {
      return nonCompletedTasks.slice(0, 10);
    }
    return sortedTasks.slice(0, 10);
  }, [sortedTasks]);

  return (
    <Card className="self-start" id="task-manager">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-foreground text-sm">
              Today&apos;s Tasks
            </p>
            <p className="text-muted-foreground text-xs">
              Tap to mark complete, edit, or delete below.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-muted-foreground text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            {pendingCount} active
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-[22rem] space-y-3 overflow-auto">
        {errorMessage && (
          <p className="text-destructive text-xs">{errorMessage}</p>
        )}
        <div className="space-y-1">
          {loading && sortedTasks.length === 0 && (
            <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
              <Spinner className="size-3.5" />
              Loading tasks...
            </div>
          )}
          {!loading && sortedTasks.length === 0 && (
            <Empty className="min-h-[11rem]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles className="size-4" />
                </EmptyMedia>
                <EmptyTitle>No tasks yet</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <EmptyDescription>
                  Capture a task and it will show up here with its due date,
                  completion state, and quick edit controls.
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          )}
          {displayTasks.length > 0 &&
            displayTasks.map((task) => {
              const isCompleted = task.status === "completed";
              return (
                <div className="space-y-1" key={task.id}>
                  <div className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60">
                    <button
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                      }}
                      type="button"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <LazyMotion features={domAnimation}>
                      <m.button
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 text-left",
                          isCompleted && "text-muted-foreground"
                        )}
                        layout
                        onClick={() => void handleToggleTask(task)}
                        type="button"
                      >
                        <m.span
                          animate={{
                            scale: isCompleted ? 1 : 0.88,
                            opacity: isCompleted ? 1 : 0.8,
                          }}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            isCompleted
                              ? "border-primary/40 bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground"
                          )}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                        </m.span>
                        <span className="relative min-w-0 flex-1 overflow-hidden">
                          <span className="block truncate">{task.title}</span>
                          <m.span
                            animate={{ scaleX: isCompleted ? 1 : 0 }}
                            className="absolute inset-x-0 top-1/2 h-px origin-left bg-current"
                            style={{ translateY: "-50%" }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                          />
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                          <CalendarDays className="h-3 w-3" />
                          {task.dueAt
                            ? new Date(task.dueAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "No date"}
                        </span>
                      </m.button>
                    </LazyMotion>
                    <button
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteTask(task);
                      }}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
        <QuickCaptureDialog
          currentUserId={currentUserId}
          initialKind="task"
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
            }
          }}
          open={editingTask !== null}
          taskId={editingTask?.id}
          taskMode="edit"
          taskValues={
            editingTask
              ? {
                  assigneeUserId: editingTask.assigneeUserId ?? currentUserId,
                  description: editingTask.description ?? "",
                  dueAt: editingTask.dueAt ?? "",
                  priority: editingTask.priority ?? "normal",
                  title: editingTask.title,
                }
              : undefined
          }
          trigger={
            <Button className="sr-only" type="button">
              Edit task
            </Button>
          }
          workspaceUuid={workspaceId}
        />
      </CardContent>
    </Card>
  );
}
