"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@avenire/ui/components/alert-dialog";
import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@avenire/ui/components/select";
import { Textarea } from "@avenire/ui/components/textarea";
import { Spinner } from "@avenire/ui/components/spinner";
import { CalendarDots, FlagBanner, Trash } from "@phosphor-icons/react";
import { TaskAssigneePicker } from "@/components/tasks/task-assignee-picker";
import { TaskEmptyState } from "@/components/tasks/task-empty-state";
import { TaskResourcePicker } from "@/components/tasks/task-resource-picker";
import type { TaskEditorDraft } from "@/components/tasks/types";
import type { WorkspaceMemberOption, WorkspaceTask } from "@/lib/tasks";
import {
  formatTaskDueDate,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from "@/lib/tasks";

export function TaskDetailPane({
  draft,
  isDirty,
  isSaving,
  members,
  mode,
  onDelete,
  onDraftChange,
  onReset,
  onSave,
  onToggleComplete,
  workspaceUuid,
  task,
}: {
  draft: TaskEditorDraft | null;
  isDirty: boolean;
  isSaving: boolean;
  members: WorkspaceMemberOption[];
  mode: "create" | "edit" | "idle";
  onDelete: () => void;
  onDraftChange: (updates: Partial<TaskEditorDraft>) => void;
  onReset: () => void;
  onSave: () => void;
  onToggleComplete: () => void;
  workspaceUuid: string;
  task: WorkspaceTask | null;
}) {
  if (mode === "idle" || !draft) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <TaskEmptyState
          description="Choose a task from the list to inspect details, or start a new one from the header."
          title="Select a task"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden">
      <div className="border-border/70 border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-medium text-foreground text-sm">
              {mode === "create" ? "New task" : "Task details"}
            </h2>
            <p className="text-muted-foreground text-xs/relaxed">
              {mode === "create"
                ? "Draft a task and assign the next owner before you save."
                : "Keep the task metadata tight and the next step obvious."}
            </p>
          </div>
          {task ? (
            <Badge className="rounded-sm" variant="outline">
              {getTaskStatusLabel(task.status)}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
        <div className="space-y-1.5">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            onChange={(event) => onDraftChange({ title: event.target.value })}
            placeholder="Review onboarding notes"
            value={draft.title}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Assignee</Label>
          <TaskAssigneePicker
            members={members}
            onChange={(assigneeUserId, selectedAssignee) =>
              onDraftChange({ assigneeUserId, selectedAssignee: selectedAssignee ?? null })
            }
            selectedAssignee={draft.selectedAssignee ?? task?.assignee ?? null}
            value={draft.assigneeUserId}
            workspaceUuid={workspaceUuid}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Resources</Label>
          <TaskResourcePicker
            onChange={(resources) => onDraftChange({ resources })}
            value={draft.resources}
            workspaceUuid={workspaceUuid}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Due</Label>
            <Input
              id="task-due"
              onChange={(event) => onDraftChange({ dueAt: event.target.value })}
              type="datetime-local"
              value={draft.dueAt}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              onValueChange={(value) =>
                onDraftChange({ status: value as TaskEditorDraft["status"] })
              }
              value={draft.status}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="drafting">Drafting</SelectItem>
                <SelectItem value="polishing">Polishing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              onValueChange={(value) =>
                onDraftChange({ priority: value as TaskEditorDraft["priority"] })
              }
              value={draft.priority}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-notes">Notes</Label>
          <Textarea
            className="min-h-40"
            id="task-notes"
            onChange={(event) =>
              onDraftChange({ description: event.target.value })
            }
            placeholder="Outline what has to happen, what is blocked, or the next handoff."
            value={draft.description}
          />
        </div>
        {task ? (
          <div className="grid gap-2 rounded-xl border border-border/60 bg-secondary/35 p-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDots className="size-3" />
              Due{" "}
              {formatTaskDueDate(task.dueAt, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-2">
              <FlagBanner className="size-3" />
              {getTaskPriorityLabel(task.priority)}
            </div>
            <div>Created {new Date(task.createdAt).toLocaleDateString("en-US")}</div>
            <div>Updated {new Date(task.updatedAt).toLocaleDateString("en-US")}</div>
          </div>
        ) : null}
        {task ? (
          <div className="flex flex-wrap items-center gap-2 border-border/60 border-t pt-4">
            <Button onClick={onToggleComplete} type="button" variant="outline">
              {task.status === "completed" ? "Reopen task" : "Mark complete"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
                <Trash className="size-3.5" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <Trash className="size-4 text-destructive" />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Delete task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the task from the workspace and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} variant="destructive">
                    Delete task
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </div>
      <div className="border-border/70 sticky bottom-0 flex min-w-0 flex-col gap-2 border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        <Button
          className="sm:order-1"
          disabled={!isDirty || isSaving}
          onClick={onReset}
          type="button"
          variant="ghost"
        >
          Reset
        </Button>
        <Button
          className="w-full sm:order-2 sm:w-auto"
          disabled={!draft.title.trim() || isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <>
              <Spinner className="size-3.5" />
              Saving
            </>
          ) : mode === "create" ? (
            "Create task"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}
