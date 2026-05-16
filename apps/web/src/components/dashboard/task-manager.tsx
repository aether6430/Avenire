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
import {
  CalendarDots as CalendarDays,
  CheckCircle as CheckCircle2,
  Circle,
  Pencil,
  Sparkle as Sparkles,
  Trash as Trash2,
} from "@phosphor-icons/react";
import { QuickCaptureDialog } from "@/components/dashboard/quick-capture-dialog";
import { cn } from "@/lib/utils";
import { useDashboardTaskManager } from "./use-dashboard-task-manager";

export function DashboardTaskManager({
  currentUserId,
  workspaceId,
}: {
  currentUserId: string;
  workspaceId: string;
}) {
  const runtime = useDashboardTaskManager({ workspaceId });
  const {
    displayTasks,
    editingTask,
    handleDeleteTask,
    handleToggleTask,
    pendingCount,
    setEditingTask,
    taskManagerState,
  } = runtime;

  return (
    <Card className="self-start" id="task-manager">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-foreground text-sm">
              Today&apos;s Tasks
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-muted-foreground text-xs">
            {pendingCount} pending
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-[22rem] space-y-3 overflow-auto">
        <div className="space-y-1">
          {taskManagerState?.showSpinner ? (
            <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
              <Spinner className="size-3.5" />
              {taskManagerState.title}
            </div>
          ) : null}
          {taskManagerState && !taskManagerState.showSpinner ? (
            <Empty className="min-h-[11rem]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles className="size-4" />
                </EmptyMedia>
                <EmptyTitle>{taskManagerState.title}</EmptyTitle>
              </EmptyHeader>
              {taskManagerState.description ? (
                <EmptyContent>
                  <EmptyDescription>
                    {taskManagerState.description}
                  </EmptyDescription>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : null}
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
                    <button
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 text-left transition-colors",
                        isCompleted && "text-muted-foreground"
                      )}
                      onClick={() => void handleToggleTask(task)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isCompleted
                            ? "border-primary/40 bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "block min-w-0 flex-1 truncate",
                          isCompleted && "line-through decoration-current/70"
                        )}
                      >
                        {task.title}
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
                    </button>
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
        {editingTask ? (
          <QuickCaptureDialog
            currentUserId={currentUserId}
            initialKind="task"
            onOpenChange={(open) => {
              if (!open) {
                setEditingTask(null);
              }
            }}
            open
            taskId={editingTask.id}
            taskMode="edit"
            taskValues={{
              assigneeUserId: editingTask.assigneeUserId ?? currentUserId,
              selectedAssignee: editingTask.assignee ?? null,
              description: editingTask.description ?? "",
              dueAt: editingTask.dueAt ?? "",
              priority: editingTask.priority ?? "normal",
              title: editingTask.title,
            }}
            trigger={
              <Button className="sr-only" type="button">
                Edit task
              </Button>
            }
            workspaceUuid={workspaceId}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
