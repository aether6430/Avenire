"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import type React from "react";
import { type Dispatch, type SetStateAction, useCallback } from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import type { Attachment } from "@/components/chat/attachment";
import type { MentionableWorkspaceFile } from "@/components/chat/multimodal-input-model";
import { useMultimodalInputAttachments } from "@/components/chat/use-multimodal-input-attachments";
import { useMultimodalInputComposerState } from "@/components/chat/use-multimodal-input-composer-state";
import { useMultimodalInputMentions } from "@/components/chat/use-multimodal-input-mentions";
import { useMultimodalInputSubmission } from "@/components/chat/use-multimodal-input-submission";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import {
  CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
  type ChatComposerSendMode,
  DEFAULT_CHAT_COMPOSER_SEND_MODE,
  normalizeChatComposerSendMode,
} from "@/lib/chat-composer-preferences";
import { usePreferredWorkspaceId } from "@/lib/preferred-workspace-storage";
import { useCurrentWorkspacePaneCompact } from "@/lib/workspace-panes";

export interface MultimodalInputRuntime {
  attachments: Attachment[];
  autoFocusEnabled: boolean;
  canSend: boolean;
  centered: boolean;
  className?: string;
  effectiveWorkspaceUuid: string;
  enqueueFiles: (incomingFiles: File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleBlur: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFocus: () => void;
  handleHoverEnd: () => void;
  handleHoverStart: () => void;
  handleMentionKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => boolean;
  handleTextareaChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleTextareaClick: () => void;
  handleTextareaKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
  handleTextareaPaste: (
    event: React.ClipboardEvent<HTMLTextAreaElement>
  ) => void;
  handleTextareaSelect: () => void;
  highlightedMentionIndex: number;
  input: string;
  isMentionMenuOpen: boolean;
  isMobile: boolean;
  isRecording: boolean;
  isRunning: boolean;
  isTranscribing: boolean;
  mentionItemRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  mentionSuggestions: MentionableWorkspaceFile[];
  onTurboChange: (enabled: boolean) => void;
  placeholder: string;
  removeAttachment: (attachmentId: string) => void;
  runSubmitForm: () => void;
  selectMention: (file: MentionableWorkspaceFile) => void;
  setHighlightedMentionIndex: Dispatch<SetStateAction<number>>;
  speechSupported: boolean;
  startOrStopRecording: () => void;
  status: UseChatHelpers<UIMessage>["status"];
  stop: () => void;
  submittableAttachments: Attachment[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  turboAvailable: boolean;
  turboEnabled: boolean;
  workspaceFilesLoaded: boolean;
}

export function useMultimodalInput({
  attachments,
  centered = false,
  className,
  handleSubmit,
  input,
  onTurboChange,
  setAttachments,
  setInput,
  status,
  stop,
  turboEnabled,
  workspaceUuid,
}: {
  attachments: Attachment[];
  centered?: boolean;
  className?: string;
  handleSubmit: (
    inputValue: string,
    files: Attachment[]
  ) => void | Promise<void>;
  input: string;
  onTurboChange: (enabled: boolean) => void;
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  setInput: (input: string) => void;
  status: UseChatHelpers<UIMessage>["status"];
  stop: () => void;
  turboEnabled: boolean;
  workspaceUuid: string;
}): MultimodalInputRuntime {
  const { width } = useWindowSize();
  const isMobile = useCurrentWorkspacePaneCompact();
  const autoFocusEnabled = !(isMobile || width < 768);
  const { ai } = useWorkspaceBootstrap();
  const MAX_FILES = 3;
  const [sendMode] = useLocalStorage<ChatComposerSendMode>(
    CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
    DEFAULT_CHAT_COMPOSER_SEND_MODE
  );
  const preferredWorkspaceId = usePreferredWorkspaceId();
  const effectiveWorkspaceUuid = preferredWorkspaceId?.trim() || workspaceUuid;

  const composerState = useMultimodalInputComposerState({
    effectiveWorkspaceUuid,
    input,
    setInput,
  });

  const attachmentRuntime = useMultimodalInputAttachments({
    attachments,
    maxFiles: MAX_FILES,
    setAttachments,
  });

  const mentionRuntime = useMultimodalInputMentions({
    effectiveWorkspaceUuid,
    input,
    maxFiles: MAX_FILES,
    setAttachments,
    setDraftValue: composerState.setDraftValue,
    textareaRef: composerState.textareaRef,
    textareaSelection: composerState.textareaSelection,
    updateTextareaSelection: composerState.updateTextareaSelection,
  });

  const submissionRuntime = useMultimodalInputSubmission({
    attachments,
    clearDraftValue: composerState.clearDraftValue,
    discardStoredDraft: composerState.discardStoredDraft,
    handleSubmit,
    input,
    latestInputRef: composerState.latestInputRef,
    restoreDraftValue: composerState.setDraftValue,
    setAttachments,
    status,
    submittableAttachments: attachmentRuntime.submittableAttachments,
    textareaRef: composerState.textareaRef,
    width,
  });

  const isRunning = status === "submitted" || status === "streaming";
  const handleTextareaChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      mentionRuntime.resetDismissedMentionKey();
      composerState.handleTextareaChange(event);
    },
    [composerState, mentionRuntime]
  );

  const handleMentionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      return mentionRuntime.handleMentionKeyDown(event);
    },
    [mentionRuntime]
  );

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (handleMentionKeyDown(event)) {
        return;
      }

      if (isMobile || event.key !== "Enter" || event.nativeEvent.isComposing) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      const normalizedSendMode = normalizeChatComposerSendMode(sendMode);
      const hasModifier = event.metaKey || event.ctrlKey;

      if (normalizedSendMode === "mod-enter" && !hasModifier) {
        return;
      }

      if (normalizedSendMode === "enter" || hasModifier) {
        event.preventDefault();
        if (submissionRuntime.canSend) {
          submissionRuntime.runSubmitForm();
        }
      }
    },
    [handleMentionKeyDown, isMobile, sendMode, submissionRuntime]
  );

  const handleTextareaPaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedFiles: File[] = [];
      for (const item of Array.from(event.clipboardData.items)) {
        if (item.kind !== "file" || !item.type.startsWith("image/")) {
          continue;
        }
        const file = item.getAsFile();
        if (file) {
          pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        attachmentRuntime.enqueueFiles(pastedFiles);
        toast.success(
          `Added ${pastedFiles.length} pasted image${pastedFiles.length > 1 ? "s" : ""}.`
        );
      }
    },
    [attachmentRuntime]
  );

  return {
    attachments,
    autoFocusEnabled,
    canSend: submissionRuntime.canSend,
    className,
    centered,
    effectiveWorkspaceUuid,
    enqueueFiles: attachmentRuntime.enqueueFiles,
    fileInputRef: attachmentRuntime.fileInputRef,
    handleBlur: composerState.handleBlur,
    handleFileChange: attachmentRuntime.handleFileChange,
    handleFocus: composerState.handleFocus,
    handleHoverEnd: () => undefined,
    handleHoverStart: () => undefined,
    handleMentionKeyDown,
    handleTextareaChange,
    handleTextareaClick: composerState.handleTextareaClick,
    handleTextareaKeyDown,
    handleTextareaPaste,
    handleTextareaSelect: composerState.handleTextareaSelect,
    highlightedMentionIndex: mentionRuntime.highlightedMentionIndex,
    input,
    isMentionMenuOpen: mentionRuntime.isMentionMenuOpen,
    isMobile,
    isRecording: composerState.isRecording,
    isRunning,
    isTranscribing: composerState.isTranscribing,
    mentionItemRefs: mentionRuntime.mentionItemRefs,
    mentionSuggestions: mentionRuntime.mentionSuggestions,
    placeholder: composerState.placeholder,
    removeAttachment: attachmentRuntime.removeAttachment,
    runSubmitForm: submissionRuntime.runSubmitForm,
    selectMention: mentionRuntime.selectMention,
    setHighlightedMentionIndex: mentionRuntime.setHighlightedMentionIndex,
    speechSupported: composerState.speechSupported,
    startOrStopRecording: composerState.startOrStopRecording,
    status,
    stop,
    submittableAttachments: attachmentRuntime.submittableAttachments,
    textareaRef: composerState.textareaRef,
    turboAvailable: ai.apexTurboAvailable,
    onTurboChange,
    turboEnabled,
    workspaceFilesLoaded: mentionRuntime.workspaceFilesLoaded,
  };
}
