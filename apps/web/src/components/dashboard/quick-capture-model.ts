import type { ReactElement } from "react";
import type {
  WorkspaceMemberOption,
  WorkspaceTaskResourceLink,
} from "@/lib/tasks";

export type CaptureKind = "task" | "note" | "misconception";

export interface QuickCaptureTaskValues {
  assigneeUserId?: string;
  description: string;
  dueAt: string;
  priority?: "low" | "normal" | "high";
  resources?: WorkspaceTaskResourceLink[];
  selectedAssignee?: WorkspaceMemberOption | null;
  title: string;
}

export interface QuickCaptureDialogProps {
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

export interface QuickCaptureTaskState {
  assigneeUserId: string;
  description: string;
  dueAt: string;
  priority: "low" | "normal" | "high";
  resources: WorkspaceTaskResourceLink[];
  selectedAssignee: WorkspaceMemberOption | null;
  title: string;
}

export interface QuickCaptureNoteState {
  content: string;
  title: string;
}

export interface QuickCaptureMisconceptionState {
  concept: string;
  confidence: string;
  reason: string;
  subject: string;
  topic: string;
}

export const DEFAULT_MISCONCEPTION_CONFIDENCE = "0.85";

export function createQuickCaptureTaskState(
  currentUserId?: string
): QuickCaptureTaskState {
  return {
    assigneeUserId: currentUserId ?? "",
    description: "",
    dueAt: "",
    priority: "normal",
    resources: [],
    selectedAssignee: null,
    title: "",
  };
}

export function createQuickCaptureTaskStateFromValues(input: {
  currentUserId?: string;
  taskValues?: QuickCaptureTaskValues;
}): QuickCaptureTaskState {
  const { currentUserId, taskValues } = input;
  if (!taskValues) {
    return createQuickCaptureTaskState(currentUserId);
  }

  return {
    assigneeUserId: taskValues.assigneeUserId ?? currentUserId ?? "",
    description: taskValues.description,
    dueAt: toDateTimeLocalValue(taskValues.dueAt),
    priority: taskValues.priority ?? "normal",
    resources: taskValues.resources ?? [],
    selectedAssignee: taskValues.selectedAssignee ?? null,
    title: taskValues.title,
  };
}

export function createQuickCaptureNoteState(): QuickCaptureNoteState {
  return {
    content: "",
    title: "",
  };
}

export function createQuickCaptureMisconceptionState(): QuickCaptureMisconceptionState {
  return {
    concept: "",
    confidence: DEFAULT_MISCONCEPTION_CONFIDENCE,
    reason: "",
    subject: "",
    topic: "",
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateTimeLocalValue(isoValue: string | null | undefined) {
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

export function toIsoFromDateTimeLocalValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function getQuickCaptureDialogCopy(input: {
  isTaskEdit: boolean;
  kind: CaptureKind;
}) {
  const { isTaskEdit, kind } = input;
  if (kind === "task") {
    return {
      description: isTaskEdit
        ? "Update the task details and save the changes."
        : "Add the task now and set a due date so it shows up in the student calendar.",
      title: isTaskEdit ? "Edit task" : "Capture task",
    };
  }

  if (kind === "note") {
    return {
      description: "Capture a note without losing the thread.",
      title: "Capture note",
    };
  }

  return {
    description: "Capture a misconception and feed it back into mastery.",
    title: "Capture misconception",
  };
}

export function getQuickCaptureSubmitLabel(input: {
  busyKind: CaptureKind | null;
  isTaskEdit: boolean;
  kind: CaptureKind;
}) {
  const { busyKind, isTaskEdit, kind } = input;
  if (busyKind === kind) {
    return "Saving";
  }

  if (kind === "note") {
    return "Capture note";
  }

  if (kind === "misconception") {
    return "Capture misconception";
  }

  return isTaskEdit ? "Save task" : "Capture task";
}

export function isQuickCaptureSubmitDisabled(input: {
  busyKind: CaptureKind | null;
  kind: CaptureKind;
  misconception: QuickCaptureMisconceptionState;
  note: QuickCaptureNoteState;
  task: QuickCaptureTaskState;
}) {
  const { busyKind, kind, misconception, note, task } = input;
  if (busyKind !== null) {
    return true;
  }

  if (kind === "task") {
    return !task.title.trim();
  }

  if (kind === "note") {
    return !note.title.trim();
  }

  return !(
    misconception.subject.trim() &&
    misconception.topic.trim() &&
    misconception.concept.trim() &&
    misconception.reason.trim()
  );
}
