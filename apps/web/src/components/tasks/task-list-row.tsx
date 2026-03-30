"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@avenire/ui/components/avatar";
import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import {
  CalendarDots,
  CheckCircle,
  Circle,
  FlagBanner,
  LinkSimple,
} from "@phosphor-icons/react";
import type { WorkspaceTask } from "@/lib/tasks";
import {
  formatTaskDueDate,
  getTaskInitials,
  getTaskResourceTypeLabel,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from "@/lib/tasks";

function statusClass(status: WorkspaceTask["status"]) {
  switch (status) {
    case "completed":
      return "border-success/20 bg-success/10 text-success";
    case "drafting":
      return "border-info/20 bg-info/10 text-info";
    case "polishing":
      return "border-warning/20 bg-warning/10 text-warning";
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
  draggable = false,
  layout = "list",
  onSelect,
  onToggleComplete,
  selected,
  task,
  onDragStart,
  onDragEnd,
}: {
  draggable?: boolean;
  layout?: "list" | "kanban";
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
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
        layout === "kanban" && "px-3 py-3",
        selected
          ? "border-border/80 bg-secondary/70"
          : "hover:border-border/70 hover:bg-secondary/45"
      )}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        if (!draggable) {
          return;
        }
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/task-id", task.id);
        onDragStart?.(task.id);
      }}
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
      <button className="min-w-0 flex-1 text-left" onClick={onSelect} type="button">
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
          {task.resources.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <LinkSimple className="size-3" />
              {task.resources.length} resource{task.resources.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </button>
      <button className="shrink-0 rounded-full" onClick={onSelect} type="button">
        <Avatar className="size-7" size="sm">
          {task.assignee?.avatar ? <AvatarImage src={task.assignee.avatar} /> : null}
          <AvatarFallback>
            {getTaskInitials(task.assignee?.name ?? null, task.assignee?.email ?? null)}
          </AvatarFallback>
        </Avatar>
      </button>
    </div>
  );
}
