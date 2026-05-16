"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type Attachment,
  revokeAttachmentUrl,
} from "@/components/chat/attachment";

type InputErrorType = "UPLOAD_ERROR" | "MODEL_BUSY" | "UNKNOWN_ERROR";

const ERROR_MESSAGES: Record<InputErrorType, string> = {
  MODEL_BUSY:
    "Please wait for the current response to complete before sending a new message.",
  UNKNOWN_ERROR:
    "Something went wrong. Please try again or contact support if the issue persists.",
  UPLOAD_ERROR:
    "Unable to upload your file. Please try again or choose a different file.",
};

export function useMultimodalInputSubmission({
  attachments,
  clearDraftValue,
  discardStoredDraft,
  handleSubmit,
  input,
  latestInputRef,
  restoreDraftValue,
  setAttachments,
  status,
  submittableAttachments,
  textareaRef,
  width,
}: {
  attachments: Attachment[];
  clearDraftValue: () => void;
  discardStoredDraft: () => void;
  handleSubmit: (
    inputValue: string,
    files: Attachment[]
  ) => void | Promise<void>;
  input: string;
  latestInputRef: React.MutableRefObject<string>;
  restoreDraftValue: (nextValue: string) => void;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  status: UseChatHelpers<UIMessage>["status"];
  submittableAttachments: Attachment[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  width: number | undefined;
}) {
  const [queuedSubmission, setQueuedSubmission] = useState<{
    attachmentIds: string[];
    inputValue: string;
  } | null>(null);

  const canSend =
    queuedSubmission === null &&
    (input.trim().length > 0 || submittableAttachments.length > 0);

  useEffect(() => {
    if (!queuedSubmission) {
      return;
    }

    const submittedIds = new Set(queuedSubmission.attachmentIds);
    const queuedAttachments = attachments.filter((attachment) =>
      submittedIds.has(attachment.id)
    );

    if (
      queuedAttachments.some((attachment) => attachment.status === "failed")
    ) {
      setQueuedSubmission(null);
      restoreDraftValue(queuedSubmission.inputValue);
      toast.error(ERROR_MESSAGES.UPLOAD_ERROR);
      return;
    }

    if (
      queuedAttachments.some(
        (attachment) =>
          attachment.status === "pending" || attachment.status === "uploading"
      )
    ) {
      return;
    }

    const readyAttachments = queuedAttachments.filter(
      (attachment) => attachment.status === "completed"
    );
    const inputValue = queuedSubmission.inputValue;

    setQueuedSubmission(null);

    const submitQueued = async () => {
      try {
        await handleSubmit(inputValue, readyAttachments);
      } catch {
        restoreDraftValue(inputValue);
        toast.error(ERROR_MESSAGES.UNKNOWN_ERROR);
        return;
      }

      setAttachments((previous) =>
        previous.filter((attachment) => !submittedIds.has(attachment.id))
      );

      for (const attachment of readyAttachments) {
        revokeAttachmentUrl(attachment.url);
      }

      discardStoredDraft();
    };

    submitQueued().catch(() => undefined);
  }, [
    attachments,
    discardStoredDraft,
    handleSubmit,
    queuedSubmission,
    restoreDraftValue,
    setAttachments,
  ]);

  const submitForm = useCallback(async () => {
    if (status === "submitted" || status === "streaming") {
      toast.error(ERROR_MESSAGES.MODEL_BUSY, {
        description: "The AI is currently processing your previous message.",
        duration: 3000,
      });
      return;
    }

    const hasText = input.trim().length > 0;
    if (!hasText && submittableAttachments.length === 0) {
      return;
    }

    const inputValue =
      textareaRef.current?.value ?? latestInputRef.current ?? input;
    const attachmentsToSubmit = submittableAttachments;
    const pendingAttachments = attachmentsToSubmit.filter(
      (attachment) =>
        attachment.status === "pending" || attachment.status === "uploading"
    );

    clearDraftValue();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }

    if (pendingAttachments.length > 0) {
      setQueuedSubmission({
        attachmentIds: attachmentsToSubmit.map((attachment) => attachment.id),
        inputValue,
      });
      return;
    }

    try {
      await handleSubmit(inputValue, attachmentsToSubmit);
    } catch {
      restoreDraftValue(inputValue);
      setAttachments(attachmentsToSubmit);
      toast.error(ERROR_MESSAGES.UNKNOWN_ERROR);
      return;
    }

    setAttachments((previous) =>
      previous.filter(
        (attachment) =>
          !attachmentsToSubmit.some(
            (submitted) => submitted.id === attachment.id
          )
      )
    );

    discardStoredDraft();

    for (const attachment of attachmentsToSubmit) {
      revokeAttachmentUrl(attachment.url);
    }
  }, [
    clearDraftValue,
    discardStoredDraft,
    handleSubmit,
    input,
    latestInputRef,
    restoreDraftValue,
    setAttachments,
    status,
    submittableAttachments,
    textareaRef,
    width,
  ]);

  const runSubmitForm = useCallback(() => {
    submitForm().catch(() => undefined);
  }, [submitForm]);

  return {
    canSend,
    runSubmitForm,
  };
}
