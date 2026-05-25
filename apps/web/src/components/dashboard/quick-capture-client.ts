"use client";

import type {
  CaptureKind,
  QuickCaptureMisconceptionState,
  QuickCaptureNoteState,
  QuickCaptureTaskState,
} from "@/components/dashboard/quick-capture-model";
import { toIsoFromDateTimeLocalValue } from "@/components/dashboard/quick-capture-model";

async function parseQuickCaptureError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  throw new Error(payload.error ?? fallback);
}

export async function submitQuickCaptureTask(input: {
  currentUserId?: string;
  task: QuickCaptureTaskState;
  taskId?: string;
  taskMode: "create" | "edit";
}) {
  const { currentUserId, task, taskId, taskMode } = input;
  const payload = {
    assigneeUserId: task.assigneeUserId || currentUserId || undefined,
    description: task.description.trim(),
    dueAt: toIsoFromDateTimeLocalValue(task.dueAt),
    priority: task.priority,
    resources: task.resources ?? [],
    title: task.title.trim(),
  };

  const response =
    taskMode === "edit" && taskId
      ? await fetch(`/api/tasks/${taskId}`, {
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        })
      : await fetch("/api/capture", {
          body: JSON.stringify({
            ...payload,
            kind: "task" satisfies CaptureKind,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

  if (!response.ok) {
    await parseQuickCaptureError(response, "Unable to capture item.");
  }
}

export async function submitQuickCaptureNote(note: QuickCaptureNoteState) {
  const response = await fetch("/api/capture", {
    body: JSON.stringify({
      content: note.content,
      kind: "note" satisfies CaptureKind,
      title: note.title,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    await parseQuickCaptureError(response, "Unable to capture item.");
  }
}

export async function submitQuickCaptureMisconception(
  misconception: QuickCaptureMisconceptionState
) {
  const response = await fetch("/api/capture", {
    body: JSON.stringify({
      confidence: misconception.confidence,
      concept: misconception.concept,
      kind: "misconception" satisfies CaptureKind,
      reason: misconception.reason,
      subject: misconception.subject,
      topic: misconception.topic,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    await parseQuickCaptureError(response, "Unable to capture item.");
  }
}
