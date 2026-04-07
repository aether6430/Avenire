"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { Textarea } from "@avenire/ui/components/textarea";
import { SpinnerGap as Loader2, Plus, Warning as TriangleAlert } from "@phosphor-icons/react"
import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { TaskAssigneePicker } from "@/components/tasks/task-assignee-picker";
import { TaskDueDatePicker } from "@/components/tasks/task-due-date-picker";
import { TaskResourcePicker } from "@/components/tasks/task-resource-picker";
import type { WorkspaceMemberOption } from "@/lib/tasks";
import { dispatchTasksRefresh } from "@/lib/tasks";

export type CaptureKind = "task" | "note" | "misconception";

export interface QuickCaptureTaskValues {
  assigneeUserId?: string;
  selectedAssignee?: WorkspaceMemberOption | null;
  description: string;
  dueAt: string;
  priority?: "low" | "normal" | "high";
  resources?: Array<{
    href: string;
    resourceId: string;
    resourceType: "file" | "folder" | "chat";
    subtitle: string | null;
    title: string;
  }>;
  title: string;
}

interface QuickCaptureDialogProps {
  currentUserAvatar?: string;
  currentUserEmail?: string;
  currentUserId?: string;
  currentUserName?: string;
  initialKind?: CaptureKind;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  taskId?: string;
  taskMode?: "create" | "edit";
  taskValues?: QuickCaptureTaskValues;
  trigger: ReactElement;
  workspaceUuid?: string;
}

const defaultConfidence = "0.85";

function resetTaskState() {
  return {
    assigneeUserId: "",
    selectedAssignee: null as WorkspaceMemberOption | null,
    description: "",
    dueAt: "",
    priority: "normal" as "low" | "normal" | "high",
    resources: [] as QuickCaptureTaskValues["resources"],
    title: "",
  };
}

function resetNoteState() {
  return {
    content: "",
    title: "",
  };
}

function resetMisconceptionState() {
  return {
    concept: "",
    confidence: defaultConfidence,
    reason: "",
    subject: "",
    topic: "",
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalValue(isoValue: string | null | undefined) {
  if (!isoValue?.trim()) {
    return "";
  }

  const trimmedValue = isoValue.trim();
  const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 23, 59);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const date = new Date(trimmedValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromDateTimeLocalValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function QuickCaptureDialog({
  currentUserAvatar,
  currentUserEmail,
  currentUserId,
  currentUserName,
  initialKind = "task",
  taskId,
  taskMode = "create",
  taskValues,
  onOpenChange,
  open,
  trigger,
  workspaceUuid,
}: QuickCaptureDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [busyKind, setBusyKind] = useState<CaptureKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members] = useState<WorkspaceMemberOption[]>(() =>
    currentUserId
      ? [
          {
            avatar: currentUserAvatar ?? null,
            email: currentUserEmail ?? null,
            name: currentUserName ?? null,
            userId: currentUserId,
          },
        ]
      : []
  );
  const [task, setTask] = useState(resetTaskState);
  const [note, setNote] = useState(resetNoteState);
  const [misconception, setMisconception] = useState(resetMisconceptionState);
  const kind = initialKind;
  const isTaskEdit = kind === "task" && taskMode === "edit";
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;
  let dialogTitle: string;
  let dialogDescription: string;

  if (kind === "task") {
    dialogTitle = isTaskEdit ? "Edit task" : "Capture task";
    dialogDescription = isTaskEdit
      ? "Update the task details and save the changes."
      : "Add the task now and set a due date so it shows up in the student calendar.";
  } else if (kind === "note") {
    dialogTitle = "Capture note";
    dialogDescription = "Capture a note without losing the thread.";
  } else {
    dialogTitle = "Capture misconception";
    dialogDescription =
      "Capture a misconception and feed it back into mastery.";
  }

  const isBusy = busyKind !== null;

  useEffect(() => {
    if (resolvedOpen) {
      if (kind === "task") {
        setTask(
          taskValues
              ? {
                assigneeUserId: taskValues.assigneeUserId ?? currentUserId ?? "",
                ...taskValues,
                dueAt: toDateTimeLocalValue(taskValues.dueAt),
                priority: taskValues.priority ?? "normal",
                resources: taskValues.resources ?? [],
                selectedAssignee: taskValues.selectedAssignee ?? null,
              }
            : {
                ...resetTaskState(),
                assigneeUserId: currentUserId ?? "",
                resources: [],
              }
        );
      }
      return;
    }

    setBusyKind(null);
    setError(null);
    setTask(resetTaskState());
    setNote(resetNoteState());
    setMisconception(resetMisconceptionState());
  }, [currentUserId, kind, resolvedOpen, taskMode, taskValues]);

  const submitLabel = useMemo(() => {
    if (busyKind === kind) {
      return "Saving";
    }

    switch (kind) {
      case "note":
        return "Capture note";
      case "misconception":
        return "Capture misconception";
      default:
        return isTaskEdit ? "Save task" : "Capture task";
    }
  }, [busyKind, isTaskEdit, kind]);

  const submit = async (nextKind: CaptureKind) => {
    setBusyKind(nextKind);
    setError(null);

    try {
      let response: Response;
      if (nextKind === "task") {
        const payload = {
          assigneeUserId: task.assigneeUserId || currentUserId || undefined,
          description: task.description.trim(),
          dueAt: toIsoFromDateTimeLocalValue(task.dueAt),
          priority: task.priority,
          resources: task.resources ?? [],
          title: task.title.trim(),
        };

        response =
          isTaskEdit && taskId
            ? await fetch(`/api/tasks/${taskId}`, {
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" },
                method: "PATCH",
              })
            : await fetch("/api/capture", {
                body: JSON.stringify({
                  ...payload,
                  kind: nextKind,
                }),
                headers: { "Content-Type": "application/json" },
                method: "POST",
              });
      } else if (nextKind === "note") {
        response = await fetch("/api/capture", {
          body: JSON.stringify({
            content: note.content,
            kind: nextKind,
            title: note.title,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
      } else {
        response = await fetch("/api/capture", {
          body: JSON.stringify({
            confidence: misconception.confidence,
            concept: misconception.concept,
            kind: nextKind,
            reason: misconception.reason,
            subject: misconception.subject,
            topic: misconception.topic,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Unable to capture item.");
      }

      if (nextKind === "task") {
        dispatchTasksRefresh();
      } else {
        router.refresh();
      }

      handleOpenChange(false);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to capture item."
      );
    } finally {
      setBusyKind(null);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(nextOpen);
      return;
    }

    setInternalOpen(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={resolvedOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-4xl" largeWidth>
        <DialogHeader className="space-y-2">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {kind === "task" ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(15rem,0.8fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="quick-task-title">Title</Label>
                <Input
                  id="quick-task-title"
                  onChange={(event) =>
                    setTask((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Review Lagrangian mechanics notes"
                  value={task.title}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quick-task-description">Details</Label>
                <Textarea
                  id="quick-task-description"
                  onChange={(event) =>
                    setTask((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add context, a link, or the next step."
                  value={task.description}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <TaskAssigneePicker
                  disabled={members.length === 0}
                  members={members}
                  onChange={(assigneeUserId, selectedAssignee) =>
                    setTask((prev) => ({
                      ...prev,
                      assigneeUserId,
                      selectedAssignee: selectedAssignee ?? null,
                    }))
                  }
                  selectedAssignee={task.selectedAssignee ?? null}
                  value={task.assigneeUserId}
                  workspaceUuid={workspaceUuid}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  onValueChange={(value) =>
                    setTask((prev) => ({
                      ...prev,
                      priority: value as "low" | "normal" | "high",
                    }))
                  }
                  value={task.priority}
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
              <div className="space-y-1.5">
                <Label htmlFor="quick-task-due">Due</Label>
                <TaskDueDatePicker
                  id="quick-task-due"
                  onChange={(dueAt) =>
                    setTask((prev) => ({ ...prev, dueAt }))
                  }
                  value={task.dueAt}
                />
                <p className="text-muted-foreground text-xs">
                  Optional. Pick a date and it will be logged for 11:59 PM by
                  default.
                </p>
              </div>
              {workspaceUuid ? (
                <div className="space-y-1.5">
                  <Label>Resources</Label>
                  <TaskResourcePicker
                    onChange={(resources) =>
                      setTask((prev) => ({ ...prev, resources }))
                    }
                    value={task.resources ?? []}
                    workspaceUuid={workspaceUuid}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {kind === "note" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quick-note-title">Title</Label>
              <Input
                id="quick-note-title"
                onChange={(event) =>
                  setNote((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Lecture notes"
                value={note.title}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-note-content">Content</Label>
              <Textarea
                className="min-h-56"
                id="quick-note-content"
                onChange={(event) =>
                  setNote((prev) => ({ ...prev, content: event.target.value }))
                }
                placeholder="Write the idea, quote, or sketch here."
                value={note.content}
              />
            </div>
          </div>
        ) : null}

        {kind === "misconception" ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="quick-misconception-subject">Subject</Label>
                <Input
                  id="quick-misconception-subject"
                  onChange={(event) =>
                    setMisconception((prev) => ({
                      ...prev,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Physics"
                  value={misconception.subject}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quick-misconception-topic">Topic</Label>
                <Input
                  id="quick-misconception-topic"
                  onChange={(event) =>
                    setMisconception((prev) => ({
                      ...prev,
                      topic: event.target.value,
                    }))
                  }
                  placeholder="Lagrangian mechanics"
                  value={misconception.topic}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-misconception-concept">Concept</Label>
              <Input
                id="quick-misconception-concept"
                onChange={(event) =>
                  setMisconception((prev) => ({
                    ...prev,
                    concept: event.target.value,
                  }))
                }
                placeholder="Euler-Lagrange equation"
                value={misconception.concept}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quick-misconception-reason">Reason</Label>
              <Textarea
                id="quick-misconception-reason"
                onChange={(event) =>
                  setMisconception((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                placeholder="What is wrong and what the user keeps getting wrong."
                value={misconception.reason}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
              <div className="space-y-1.5">
                <Label htmlFor="quick-misconception-confidence">
                  Confidence
                </Label>
                <Input
                  id="quick-misconception-confidence"
                  inputMode="decimal"
                  onChange={(event) =>
                    setMisconception((prev) => ({
                      ...prev,
                      confidence: event.target.value,
                    }))
                  }
                  placeholder="0.85"
                  value={misconception.confidence}
                />
              </div>
              <div className="flex items-end">
                <div className="rounded-md border border-border/70 bg-muted/15 px-3 py-2 text-muted-foreground text-xs">
                  Records a misconception directly into the mastery model.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-destructive text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={
              isBusy ||
              (kind === "task" && !task.title.trim()) ||
              (kind === "note" && !note.title.trim()) ||
              (kind === "misconception" &&
                !(
                  misconception.subject.trim() &&
                  misconception.topic.trim() &&
                  misconception.concept.trim() &&
                  misconception.reason.trim()
                ))
            }
            onClick={() => submit(kind)}
            type="button"
          >
            {busyKind === kind ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {submitLabel}
              </>
            ) : (
              <>
                <Plus className="size-4" />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
