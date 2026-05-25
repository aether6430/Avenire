"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  submitQuickCaptureMisconception,
  submitQuickCaptureNote,
  submitQuickCaptureTask,
} from "@/components/dashboard/quick-capture-client";
import type { CaptureKind } from "@/components/dashboard/quick-capture-model";
import {
  createQuickCaptureMisconceptionState,
  createQuickCaptureNoteState,
  createQuickCaptureTaskState,
  createQuickCaptureTaskStateFromValues,
  getQuickCaptureDialogCopy,
  getQuickCaptureSubmitLabel,
  isQuickCaptureSubmitDisabled,
  type QuickCaptureDialogProps,
} from "@/components/dashboard/quick-capture-model";
import type { WorkspaceMemberOption } from "@/lib/tasks";
import { dispatchTasksRefresh } from "@/lib/tasks";

export function useQuickCaptureDialog({
  currentUserAvatar,
  currentUserEmail,
  currentUserId,
  currentUserName,
  initialKind = "task",
  onOpenChange,
  open,
  taskId,
  taskMode = "create",
  taskValues,
}: Omit<QuickCaptureDialogProps, "trigger" | "workspaceUuid">) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [busyKind, setBusyKind] = useState<CaptureKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState(() =>
    createQuickCaptureTaskState(currentUserId)
  );
  const [note, setNote] = useState(createQuickCaptureNoteState);
  const [misconception, setMisconception] = useState(
    createQuickCaptureMisconceptionState
  );
  const kind = initialKind;
  const isTaskEdit = kind === "task" && taskMode === "edit";
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;

  const members = useMemo<WorkspaceMemberOption[]>(
    () =>
      currentUserId
        ? [
            {
              avatar: currentUserAvatar ?? null,
              email: currentUserEmail ?? null,
              name: currentUserName ?? null,
              userId: currentUserId,
            },
          ]
        : [],
    [currentUserAvatar, currentUserEmail, currentUserId, currentUserName]
  );

  useEffect(() => {
    if (resolvedOpen) {
      if (kind === "task") {
        setTask(
          createQuickCaptureTaskStateFromValues({
            currentUserId,
            taskValues,
          })
        );
      }
      return;
    }

    setBusyKind(null);
    setError(null);
    setTask(createQuickCaptureTaskState(currentUserId));
    setNote(createQuickCaptureNoteState());
    setMisconception(createQuickCaptureMisconceptionState());
  }, [currentUserId, kind, resolvedOpen, taskValues]);

  const { title: dialogTitle, description: dialogDescription } =
    getQuickCaptureDialogCopy({
      isTaskEdit,
      kind,
    });

  const submitLabel = getQuickCaptureSubmitLabel({
    busyKind,
    isTaskEdit,
    kind,
  });

  const isSubmitDisabled = isQuickCaptureSubmitDisabled({
    busyKind,
    kind,
    misconception,
    note,
    task,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(nextOpen);
      return;
    }

    setInternalOpen(nextOpen);
  };

  const submit = async () => {
    setBusyKind(kind);
    setError(null);

    try {
      if (kind === "task") {
        await submitQuickCaptureTask({
          currentUserId,
          task,
          taskId,
          taskMode,
        });
      } else if (kind === "note") {
        await submitQuickCaptureNote(note);
      } else {
        await submitQuickCaptureMisconception(misconception);
      }

      if (kind === "task") {
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

  return {
    busyKind,
    dialogDescription,
    dialogTitle,
    error,
    handleOpenChange,
    isSubmitDisabled,
    kind,
    members,
    misconception,
    note,
    resolvedOpen,
    setMisconception,
    setNote,
    setTask,
    submit,
    submitLabel,
    task,
  };
}

export type QuickCaptureDialogRuntime = ReturnType<
  typeof useQuickCaptureDialog
>;
