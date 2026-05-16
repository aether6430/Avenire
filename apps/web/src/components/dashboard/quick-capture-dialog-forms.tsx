"use client";

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
import type { QuickCaptureDialogProps } from "@/components/dashboard/quick-capture-model";
import type { QuickCaptureDialogRuntime } from "@/components/dashboard/use-quick-capture-dialog";
import { TaskAssigneePicker } from "@/components/tasks/task-assignee-picker";
import { TaskDueDatePicker } from "@/components/tasks/task-due-date-picker";
import { TaskResourcePicker } from "@/components/tasks/task-resource-picker";

function QuickCaptureTaskFields({
  runtime,
  workspaceUuid,
}: {
  runtime: QuickCaptureDialogRuntime;
  workspaceUuid?: string;
}) {
  const { members, setTask, task } = runtime;

  return (
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
            onChange={(dueAt) => setTask((prev) => ({ ...prev, dueAt }))}
            value={task.dueAt}
          />
          <p className="text-muted-foreground text-xs">
            Optional. Pick a date and it will be logged for 11:59 PM by default.
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
  );
}

function QuickCaptureNoteFields({
  runtime,
}: {
  runtime: QuickCaptureDialogRuntime;
}) {
  const { note, setNote } = runtime;

  return (
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
  );
}

function QuickCaptureMisconceptionFields({
  runtime,
}: {
  runtime: QuickCaptureDialogRuntime;
}) {
  const { misconception, setMisconception } = runtime;

  return (
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
          <Label htmlFor="quick-misconception-confidence">Confidence</Label>
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
  );
}

export function QuickCaptureDialogFields({
  runtime,
  workspaceUuid,
}: {
  runtime: QuickCaptureDialogRuntime;
  workspaceUuid?: QuickCaptureDialogProps["workspaceUuid"];
}) {
  if (runtime.kind === "task") {
    return (
      <QuickCaptureTaskFields runtime={runtime} workspaceUuid={workspaceUuid} />
    );
  }

  if (runtime.kind === "note") {
    return <QuickCaptureNoteFields runtime={runtime} />;
  }

  return <QuickCaptureMisconceptionFields runtime={runtime} />;
}
