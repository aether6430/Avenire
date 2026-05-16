"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  type Attachment,
  createWorkspaceAttachment,
} from "@/components/chat/attachment";
import {
  getMentionTrigger,
  getWorkspaceMentionSuggestions,
  loadWorkspaceMentionFiles,
  type MentionableWorkspaceFile,
} from "@/components/chat/multimodal-input-model";

export function useMultimodalInputMentions({
  effectiveWorkspaceUuid,
  input,
  maxFiles,
  setAttachments,
  setDraftValue,
  textareaRef,
  textareaSelection,
  updateTextareaSelection,
}: {
  effectiveWorkspaceUuid: string;
  input: string;
  maxFiles: number;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  setDraftValue: (nextValue: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  textareaSelection: { end: number; start: number };
  updateTextareaSelection: (start?: number, end?: number) => void;
}) {
  const mentionItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(
    null
  );

  const mentionTrigger = useMemo(
    () =>
      getMentionTrigger(input, textareaSelection.start, textareaSelection.end),
    [input, textareaSelection.end, textareaSelection.start]
  );
  const deferredMentionQuery = useDeferredValue(mentionTrigger?.query ?? "");

  const workspaceFilesQuery = useQuery({
    enabled: Boolean(effectiveWorkspaceUuid),
    queryFn: ({ signal }) =>
      effectiveWorkspaceUuid
        ? loadWorkspaceMentionFiles({
            signal,
            workspaceUuid: effectiveWorkspaceUuid,
          })
        : Promise.resolve([]),
    queryKey: ["workspace-mention-files", effectiveWorkspaceUuid],
    staleTime: 30_000,
  });

  const workspaceFiles = workspaceFilesQuery.data ?? [];
  const workspaceFilesLoaded =
    !effectiveWorkspaceUuid || workspaceFilesQuery.isFetched;

  const mentionSuggestions = useMemo(
    () =>
      getWorkspaceMentionSuggestions({
        files: workspaceFiles,
        query: deferredMentionQuery,
        trigger: mentionTrigger,
      }),
    [deferredMentionQuery, mentionTrigger, workspaceFiles]
  );

  const mentionTriggerKey = mentionTrigger
    ? `${mentionTrigger.rangeStart}:${mentionTrigger.rangeEnd}:${mentionTrigger.query}`
    : null;
  const isMentionMenuOpen =
    mentionTriggerKey !== null &&
    workspaceFilesLoaded &&
    dismissedMentionKey !== mentionTriggerKey;

  useEffect(() => {
    if (!mentionTriggerKey) {
      setDismissedMentionKey(null);
    }
  }, [mentionTriggerKey]);

  useEffect(() => {
    if (!isMentionMenuOpen) {
      setHighlightedMentionIndex(0);
      mentionItemRefs.current = [];
      return;
    }

    setHighlightedMentionIndex((previous) => {
      if (mentionSuggestions.length === 0) {
        return 0;
      }
      return Math.min(previous, mentionSuggestions.length - 1);
    });
  }, [isMentionMenuOpen, mentionSuggestions.length]);

  useEffect(() => {
    if (!isMentionMenuOpen || mentionSuggestions.length === 0) {
      return;
    }

    const activeItem = mentionItemRefs.current[highlightedMentionIndex];
    if (!activeItem) {
      return;
    }

    activeItem.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedMentionIndex, isMentionMenuOpen, mentionSuggestions.length]);

  const selectMention = useCallback(
    (file: MentionableWorkspaceFile) => {
      if (!mentionTrigger) {
        return;
      }
      if (!file.url || file.url.trim().length === 0) {
        toast.error("This file cannot be attached right now.");
        return;
      }

      const replacement = `@${file.workspacePath} `;
      const nextInput = `${input.slice(0, mentionTrigger.rangeStart)}${replacement}${input.slice(mentionTrigger.rangeEnd)}`;
      const nextCursor = mentionTrigger.rangeStart + replacement.length;

      setDraftValue(nextInput);
      setDismissedMentionKey(null);

      setAttachments((previous) => {
        if (
          previous.some((attachment) => attachment.workspaceFileId === file.id)
        ) {
          return previous;
        }
        if (previous.length >= maxFiles) {
          toast.error("File limit exceeded", {
            description: `You can only upload up to ${maxFiles} files per message.`,
            duration: 3000,
          });
          return previous;
        }
        return [
          ...previous,
          createWorkspaceAttachment({
            contentType: file.contentType,
            id: file.id,
            name: file.name,
            sizeBytes: file.sizeBytes,
            url: file.url,
            workspacePath: file.workspacePath,
          }),
        ];
      });

      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) {
          return;
        }
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
        updateTextareaSelection(nextCursor, nextCursor);
      });
    },
    [
      input,
      maxFiles,
      mentionTrigger,
      setAttachments,
      setDraftValue,
      textareaRef,
      updateTextareaSelection,
    ]
  );

  const handleMentionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!isMentionMenuOpen) {
        return false;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedMentionIndex((previous) =>
          mentionSuggestions.length === 0
            ? 0
            : (previous + 1) % mentionSuggestions.length
        );
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedMentionIndex((previous) =>
          mentionSuggestions.length === 0
            ? 0
            : (previous - 1 + mentionSuggestions.length) %
              mentionSuggestions.length
        );
        return true;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const selected = mentionSuggestions[highlightedMentionIndex];
        if (selected) {
          selectMention(selected);
        }
        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setDismissedMentionKey(mentionTriggerKey);
        return true;
      }

      return false;
    },
    [
      highlightedMentionIndex,
      isMentionMenuOpen,
      mentionSuggestions,
      mentionTriggerKey,
      selectMention,
    ]
  );

  return {
    handleMentionKeyDown,
    highlightedMentionIndex,
    isMentionMenuOpen,
    mentionItemRefs,
    mentionSuggestions,
    resetDismissedMentionKey: () => setDismissedMentionKey(null),
    selectMention,
    setHighlightedMentionIndex,
    workspaceFilesLoaded,
  };
}
