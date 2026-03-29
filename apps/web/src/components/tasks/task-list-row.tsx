"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@avenire/ui/components/avatar";
import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import { CalendarDots, CheckCircle, Circle, FlagBanner } from "@phosphor-icons/react";
import type { WorkspaceTask } from "@/lib/tasks";
import {
  formatTaskDueDate,
  getTaskInitials,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from "@/lib/tasks";

function statusClass(status: WorkspaceTask["status"]) {
  switch (status) {
    case "completed":
      return "border-success/20 bg-success/10 text-success";
    case "in_progress":
      return "border-info/20 bg-info/10 text-info";
    default:
      return "border-border bg-secondary text-muted-foreground";
  }
}

function priorityClass(priority: WorkspaceTask["priority"]) {
  switch (priority) {
    case "high":
      return "text-destructive";
    case "low":
      return "text-muted-foreground";
    default:
      return "text-warning";
  }
}

export function TaskListRow({
  onSelect,
  onToggleComplete,
  selected,
  task,
}: {
  onSelect: () => void;
  onToggleComplete: () => void;
  selected: boolean;
  task: WorkspaceTask;
}) {
  const isCompleted = task.status === "completed";

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-xl border border-transparent px-2 py-2 transition-colors",
        selected
          ? "border-border/80 bg-secondary/70"
          : "hover:border-border/70 hover:bg-secondary/45"
      )}
    >
      <Button
        className="mt-0.5 text-muted-foreground"
        onClick={onToggleComplete}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {isCompleted ? (
          <CheckCircle className="size-3.5 text-success" />
        ) : (
          <Circle className="size-3.5" />
        )}
      </Button>
      <button
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
        type="button"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate font-medium text-sm text-foreground",
              isCompleted && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </p>
          <Badge className={cn("rounded-sm border", statusClass(task.status))} variant="outline">
            {getTaskStatusLabel(task.status)}
          </Badge>
        </div>
        {task.description ? (
          <p className="mt-1 line-clamp-1 text-muted-foreground text-xs">
            {task.description}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDots className="size-3" />
            {formatTaskDueDate(task.dueAt)}
          </span>
          <span className={cn("inline-flex items-center gap-1", priorityClass(task.priority))}>
            <FlagBanner className="size-3" />
            {getTaskPriorityLabel(task.priority)}
          </span>
        </div>
      </button>
      <button
        className="shrink-0 rounded-full"
        onClick={onSelect}
        type="button"
      >
        <Avatar className="size-7" size="sm">
          {task.assignee?.avatar ? (
            <AvatarImage src={task.assignee.avatar} />
          ) : null}
          <AvatarFallback>
            {getTaskInitials(task.assignee?.name ?? null, task.assignee?.email ?? null)}
          </AvatarFallback>
        </Avatar>
      </button>
    </div>
  );
}
