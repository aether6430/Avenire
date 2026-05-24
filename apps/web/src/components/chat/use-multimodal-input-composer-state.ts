"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import { useAudioTranscription } from "@/lib/use-audio-transcription";

const TEXTAREA_MAX_HEIGHT = 160;

function deserializeStoredStringLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith('"') ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return null;
    }
  }

  return value;
}

export function serializeChatInputDraft(value: string) {
  return value;
}

export function deserializeChatInputDraft(value: string) {
  return deserializeStoredStringLike(value) ?? "";
}

function syncTextareaHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const nextHeight = Math.min(textarea.scrollHeight + 2, TEXTAREA_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
}

export function useMultimodalInputComposerState({
  effectiveWorkspaceUuid,
  input,
  setInput,
}: {
  effectiveWorkspaceUuid: string;
  input: string;
  setInput: (input: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestInputRef = useRef(input);
  const hasHydratedInputRef = useRef(false);
  const [textareaSelection, setTextareaSelection] = useState({
    end: 0,
    start: 0,
  });
  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "chat-input",
    "",
    {
      deserializer: deserializeChatInputDraft,
      serializer: serializeChatInputDraft,
    }
  );

  const updateTextareaSelection = useCallback(
    (start?: number, end?: number) => {
      if (
        typeof start === "number" &&
        typeof end === "number" &&
        Number.isFinite(start) &&
        Number.isFinite(end)
      ) {
        setTextareaSelection({ end, start });
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      setTextareaSelection({
        end: textarea.selectionEnd ?? 0,
        start: textarea.selectionStart ?? 0,
      });
    },
    []
  );

  const setDraftValue = useCallback(
    (nextValue: string) => {
      latestInputRef.current = nextValue;
      setInput(nextValue);
      setLocalStorageInput(nextValue);
    },
    [setInput, setLocalStorageInput]
  );

  const resetHeight = useCallback(() => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.overflowY = "hidden";
  }, []);

  const clearDraftValue = useCallback(() => {
    latestInputRef.current = "";
    setInput("");
    setLocalStorageInput("");
    resetHeight();
  }, [resetHeight, setInput, setLocalStorageInput]);

  const discardStoredDraft = useCallback(() => {
    try {
      window.localStorage.removeItem("chat-input");
    } catch {
      // ignore localStorage errors in restricted contexts
    }
  }, []);

  const insertTranscript = useCallback(
    (text: string) => {
      const transcript = text.trim();
      if (!transcript) {
        return;
      }

      const textarea = textareaRef.current;
      const source = textarea?.value ?? latestInputRef.current ?? input;
      const selectionStart = textarea?.selectionStart ?? source.length;
      const selectionEnd = textarea?.selectionEnd ?? source.length;
      const prefix = source.slice(0, selectionStart);
      const suffix = source.slice(selectionEnd);
      const spacerBefore = prefix.length > 0 && !/\s$/.test(prefix) ? " " : "";
      const spacerAfter = suffix.length > 0 && !/^\s/.test(suffix) ? " " : "";
      const nextValue = `${prefix}${spacerBefore}${transcript}${spacerAfter}${suffix}`;
      const nextCursor = (prefix + spacerBefore + transcript).length;

      setDraftValue(nextValue);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        updateTextareaSelection(nextCursor, nextCursor);
      });
    },
    [input, setDraftValue, updateTextareaSelection]
  );

  const {
    error: transcriptionError,
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    supported: speechSupported,
  } = useAudioTranscription({
    onTranscript: insertTranscript,
    workspaceUuid: effectiveWorkspaceUuid,
  });

  useEffect(() => {
    latestInputRef.current = input;
    if (!textareaRef.current) {
      return;
    }
    syncTextareaHeight(textareaRef.current);
  }, [input]);

  useEffect(() => {
    if (hasHydratedInputRef.current) {
      return;
    }
    hasHydratedInputRef.current = true;
    if (!localStorageInput) {
      return;
    }
    setInput(localStorageInput);
  }, [localStorageInput, setInput]);

  useEffect(() => {
    if (transcriptionError) {
      toast.error(transcriptionError);
    }
  }, [transcriptionError]);

  const handleTextareaChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      setDraftValue(nextValue);
      updateTextareaSelection(
        event.target.selectionStart ?? 0,
        event.target.selectionEnd ?? 0
      );
    },
    [setDraftValue, updateTextareaSelection]
  );

  const startOrStopRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }

    void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return {
    clearDraftValue,
    discardStoredDraft,
    handleBlur: () => updateTextareaSelection(),
    handleFocus: () => updateTextareaSelection(),
    handleTextareaChange,
    handleTextareaClick: () => {
      updateTextareaSelection();
    },
    handleTextareaSelect: () => {
      updateTextareaSelection();
    },
    isRecording,
    isTranscribing,
    latestInputRef,
    placeholder: isRecording
      ? "Listening..."
      : isTranscribing
        ? "Transcribing..."
        : "What do you want to learn?",
    setDraftValue,
    speechSupported,
    startOrStopRecording,
    textareaRef,
    textareaSelection,
    updateTextareaSelection,
  };
}
