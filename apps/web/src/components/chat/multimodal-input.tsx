"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import { Button } from "@avenire/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@avenire/ui/components/command";
import { Textarea } from "@avenire/ui/components/textarea";
import { springs } from "@avenire/ui/lib/springs";
import { surfaceClasses } from "@avenire/ui/lib/surface-classes";
import {
  ArrowUpIcon,
  FileText as FileTextIcon,
  Lightning,
  Microphone,
  Plus,
  Square,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import {
  type Attachment,
  createLocalAttachment,
  createWorkspaceAttachment,
  revokeAttachmentUrl,
} from "@/components/chat/attachment";
import { PreviewAttachment } from "@/components/chat/preview-attachment";
import {
  CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
  type ChatComposerSendMode,
  DEFAULT_CHAT_COMPOSER_SEND_MODE,
  normalizeChatComposerSendMode,
} from "@/lib/chat-composer-preferences";
import { getUploadErrorMessage } from "@/lib/upload";
import { useUploadThing } from "@/lib/uploadthing";
import { useAudioTranscription } from "@/lib/use-audio-transcription";
import { cn } from "@/lib/utils";
import { useCurrentWorkspacePaneCompact } from "@/lib/workspace-panes";

type InputErrorType = "UPLOAD_ERROR" | "MODEL_BUSY" | "UNKNOWN_ERROR";

const ERROR_MESSAGES: Record<InputErrorType, string> = {
  UPLOAD_ERROR:
    "Unable to upload your file. Please try again or choose a different file.",
  MODEL_BUSY:
    "Please wait for the current response to complete before sending a new message.",
  UNKNOWN_ERROR:
    "Something went wrong. Please try again or contact support if the issue persists.",
};

const MAX_MENTION_RESULTS = 20;
const TEXTAREA_MAX_HEIGHT = 160;
const WHITESPACE_REGEX = /\s/;
const MOBILE_CHAT_VOICE_START_EVENT = "avenire:mobile-chat-voice-start";

interface ChatInputDraft {
  message: string;
  files_uploaded: string[];
}

function readPreferredWorkspaceId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("preferredWorkspaceId");
}

function syncTextareaHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const nextHeight = Math.min(textarea.scrollHeight + 2, TEXTAREA_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
}

interface WorkspaceTreeFolder {
  id: string;
  name: string;
  parentId: string | null;
}

interface WorkspaceTreeFile {
  folderId: string;
  id: string;
  mimeType?: string | null;
  name: string;
  sizeBytes?: number;
  storageUrl: string;
}

interface MentionableWorkspaceFile {
  contentType: string;
  id: string;
  name: string;
  nameLower: string;
  parentPath: string;
  pathLower: string;
  sizeBytes?: number;
  url: string;
  workspacePath: string;
}

interface MentionTrigger {
  query: string;
  rangeEnd: number;
  rangeStart: number;
}

function buildWorkspaceFileIndex(input: {
  files: WorkspaceTreeFile[];
  folders: WorkspaceTreeFolder[];
}): MentionableWorkspaceFile[] {
  const folderById = new Map(
    input.folders.map((folder) => [folder.id, folder])
  );
  const folderPathCache = new Map<string, string>();

  const resolveFolderPath = (folderId: string | null): string => {
    if (!folderId) {
      return "";
    }
    const cached = folderPathCache.get(folderId);
    if (cached !== undefined) {
      return cached;
    }

    const segments: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = folderId;
    while (cursor) {
      if (seen.has(cursor)) {
        break;
      }
      seen.add(cursor);
      const folder = folderById.get(cursor);
      if (!folder) {
        break;
      }
      if (folder.parentId === null) {
        break;
      }
      segments.push(folder.name);
      cursor = folder.parentId;
    }

    const resolved = segments.reverse().join("/");
    folderPathCache.set(folderId, resolved);
    return resolved;
  };

  const indexedFiles: MentionableWorkspaceFile[] = [];
  for (const file of input.files) {
    if (!(file.id && file.name && file.storageUrl)) {
      continue;
    }
    const parentPath = resolveFolderPath(file.folderId);
    const workspacePath = parentPath ? `${parentPath}/${file.name}` : file.name;
    indexedFiles.push({
      id: file.id,
      name: file.name,
      contentType: file.mimeType || "application/octet-stream",
      parentPath,
      pathLower: workspacePath.toLowerCase(),
      nameLower: file.name.toLowerCase(),
      sizeBytes: file.sizeBytes,
      url: file.storageUrl,
      workspacePath,
    });
  }

  return indexedFiles.sort((a, b) =>
    a.workspacePath.localeCompare(b.workspacePath, undefined, {
      sensitivity: "base",
    })
  );
}

async function loadWorkspaceMentionFiles(input: {
  signal: AbortSignal;
  workspaceUuid: string;
}): Promise<MentionableWorkspaceFile[]> {
  const response = await fetch(`/api/workspaces/${input.workspaceUuid}/tree`, {
    cache: "no-store",
    signal: input.signal,
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    files?: WorkspaceTreeFile[];
    folders?: WorkspaceTreeFolder[];
  };
  return buildWorkspaceFileIndex({
    files: payload.files ?? [],
    folders: payload.folders ?? [],
  });
}

function getMentionTrigger(
  text: string,
  selectionStart: number,
  selectionEnd: number
): MentionTrigger | null {
  if (selectionStart !== selectionEnd) {
    return null;
  }

  let rangeStart = selectionStart;
  while (rangeStart > 0 && !WHITESPACE_REGEX.test(text[rangeStart - 1] ?? "")) {
    rangeStart -= 1;
  }

  if (text[rangeStart] !== "@") {
    return null;
  }

  let rangeEnd = selectionStart;
  while (
    rangeEnd < text.length &&
    !WHITESPACE_REGEX.test(text[rangeEnd] ?? "")
  ) {
    rangeEnd += 1;
  }

  return {
    rangeStart,
    rangeEnd,
    query: text.slice(rangeStart + 1, selectionStart),
  };
}

function PureMultimodalInput({
  input,
  setInput,
  status,
  attachments,
  setAttachments,
  handleSubmit,
  stop,
  turboEnabled,
  onTurboChange,
  workspaceUuid,
  className,
  centered = false,
}: {
  input: string;
  setInput: (input: string) => void;
  status: UseChatHelpers<UIMessage>["status"];
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  handleSubmit: (
    inputValue: string,
    files: Attachment[]
  ) => void | Promise<void>;
  stop: () => void;
  turboEnabled: boolean;
  onTurboChange: (enabled: boolean) => void;
  workspaceUuid: string;
  className?: string;
  centered?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const latestInputRef = useRef(input);
  const hasHydratedInputRef = useRef(false);
  const uploadingIdsRef = useRef(new Set<string>());
  const [textareaSelection, setTextareaSelection] = useState({
    start: 0,
    end: 0,
  });
  const [queuedSubmission, setQueuedSubmission] = useState<{
    attachmentIds: string[];
    inputValue: string;
  } | null>(null);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const [dismissedMentionKey, setDismissedMentionKey] = useState<string | null>(
    null
  );
  const [isMultiLine, setIsMultiLine] = useState(false);
  const { width } = useWindowSize();
  const isMobile = useCurrentWorkspacePaneCompact();
  const MAX_FILES = 3;

  const [localStorageInput, setLocalStorageInput] =
    useLocalStorage<ChatInputDraft>(
      "chat-input",
      { message: "", files_uploaded: [] },
      {
        deserializer: (value: string) => {
          try {
            return JSON.parse(value) as ChatInputDraft;
          } catch {
            try {
              window.localStorage.removeItem("chat-input");
            } catch {
              // Ignore errors in restricted contexts
            }
            return { message: "", files_uploaded: [] };
          }
        },
      }
    );
  const [sendMode] = useLocalStorage<ChatComposerSendMode>(
    CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
    DEFAULT_CHAT_COMPOSER_SEND_MODE
  );
  const [preferredWorkspaceId] = useLocalStorage<string | null>(
    "preferredWorkspaceId",
    null
  );
  const effectiveWorkspaceUuid =
    preferredWorkspaceId?.trim() ||
    readPreferredWorkspaceId()?.trim() ||
    workspaceUuid;

  const { startUpload } = useUploadThing("chatAttachmentUploader", {
    onUploadError: (error) => {
      toast.error(getUploadErrorMessage(error));
    },
  });

  const _uploadQueue = useMemo(
    () =>
      attachments.filter(
        (attachment) =>
          attachment.status === "pending" || attachment.status === "uploading"
      ),
    [attachments]
  );

  const _completedAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.status === "completed"),
    [attachments]
  );
  const submittableAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.status !== "failed"),
    [attachments]
  );

  const canSend = useMemo(
    () =>
      queuedSubmission === null &&
      (input.trim().length > 0 || submittableAttachments.length > 0),
    [input, queuedSubmission, submittableAttachments.length]
  );
  const isRunning = status === "submitted" || status === "streaming";

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

  const mentionSuggestions = useMemo(() => {
    if (!mentionTrigger) {
      return [];
    }

    const query = deferredMentionQuery.trim().toLowerCase();
    const ranked = workspaceFiles
      .flatMap((file) => {
        if (!query) {
          return [{ file, rank: 4 }];
        }

        const nameStartsWith = file.nameLower.startsWith(query);
        const pathStartsWith = file.pathLower.startsWith(query);
        const nameIncludes = file.nameLower.includes(query);
        const pathIncludes = file.pathLower.includes(query);

        if (
          !(nameStartsWith || pathStartsWith || nameIncludes || pathIncludes)
        ) {
          return [];
        }

        let rank = 3;
        if (nameStartsWith) {
          rank = 0;
        } else if (pathStartsWith) {
          rank = 1;
        } else if (nameIncludes) {
          rank = 2;
        }

        return [{ file, rank }];
      })
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          a.file.workspacePath.localeCompare(b.file.workspacePath, undefined, {
            sensitivity: "base",
          })
      );

    return ranked.slice(0, MAX_MENTION_RESULTS).map((entry) => entry.file);
  }, [deferredMentionQuery, mentionTrigger, workspaceFiles]);

  const mentionTriggerKey = mentionTrigger
    ? `${mentionTrigger.rangeStart}:${mentionTrigger.rangeEnd}:${mentionTrigger.query}`
    : null;
  const isMentionMenuOpen =
    mentionTriggerKey !== null &&
    workspaceFilesLoaded &&
    dismissedMentionKey !== mentionTriggerKey;

  const updateTextareaSelection = useCallback(
    (start?: number, end?: number) => {
      if (
        typeof start === "number" &&
        typeof end === "number" &&
        Number.isFinite(start) &&
        Number.isFinite(end)
      ) {
        setTextareaSelection({ start, end });
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      setTextareaSelection({
        start: textarea.selectionStart ?? 0,
        end: textarea.selectionEnd ?? 0,
      });
    },
    []
  );
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

      latestInputRef.current = nextValue;
      setInput(nextValue);
      setLocalStorageInput({
        message: nextValue,
        files_uploaded: [],
      });

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        updateTextareaSelection(nextCursor, nextCursor);
      });
    },
    [input, setInput, setLocalStorageInput, updateTextareaSelection]
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
  const composerPlaceholder = isRecording
    ? "Listening..."
    : isTranscribing
      ? "Transcribing..."
      : isMobile
        ? "What to learn?"
        : "What do you want to learn?";

  useEffect(() => {
    latestInputRef.current = input;
    if (!textareaRef.current) {
      return;
    }
    syncTextareaHeight(textareaRef.current);
    setIsMultiLine(textareaRef.current.scrollHeight > 40);
  }, [input]);

  useEffect(() => {
    if (hasHydratedInputRef.current) {
      return;
    }
    hasHydratedInputRef.current = true;
    if (!localStorageInput.message) {
      return;
    }
    setInput(localStorageInput.message);
  }, [localStorageInput, setInput]);

  useEffect(() => {
    if (!mentionTriggerKey) {
      setDismissedMentionKey(null);
    }
  }, [mentionTriggerKey]);

  useEffect(() => {
    if (transcriptionError) {
      toast.error(transcriptionError);
    }
  }, [transcriptionError]);

  useEffect(() => {
    const startVoiceInput = () => {
      if (!(speechSupported && !isRecording && !isTranscribing && !isRunning)) {
        return;
      }
      void startRecording();
    };

    window.addEventListener(MOBILE_CHAT_VOICE_START_EVENT, startVoiceInput);
    return () => {
      window.removeEventListener(
        MOBILE_CHAT_VOICE_START_EVENT,
        startVoiceInput
      );
    };
  }, [isRecording, isRunning, isTranscribing, speechSupported, startRecording]);

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

  const updateAttachment = useCallback(
    (id: string, update: Partial<Attachment>) => {
      setAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === id ? { ...attachment, ...update } : attachment
        )
      );
    },
    [setAttachments]
  );

  const uploadAttachment = useCallback(
    async (attachment: Attachment) => {
      if (!attachment.file) {
        return;
      }

      try {
        updateAttachment(attachment.id, {
          status: "uploading",
          errorMessage: undefined,
        });

        const uploadedFiles = await startUpload([attachment.file]);
        const uploaded = uploadedFiles?.[0];

        if (!uploaded) {
          throw new Error("Missing uploaded file metadata");
        }

        const uploadedUrl =
          ("ufsUrl" in uploaded &&
          typeof uploaded.ufsUrl === "string" &&
          uploaded.ufsUrl
            ? uploaded.ufsUrl
            : null) ||
          ("url" in uploaded && typeof uploaded.url === "string"
            ? uploaded.url
            : undefined);

        if (!uploadedUrl) {
          throw new Error("Upload returned no URL");
        }

        revokeAttachmentUrl(attachment.url);

        updateAttachment(attachment.id, {
          status: "completed",
          url: uploadedUrl,
          storageKey: "key" in uploaded ? uploaded.key : undefined,
        });
      } catch (error) {
        const errorMessage = getUploadErrorMessage(error);
        updateAttachment(attachment.id, {
          status: "failed",
          errorMessage,
        });
      }
    },
    [startUpload, updateAttachment]
  );

  useEffect(() => {
    const pending = attachments.filter(
      (attachment) =>
        attachment.status === "pending" &&
        Boolean(attachment.file) &&
        !uploadingIdsRef.current.has(attachment.id)
    );

    if (pending.length === 0) {
      return;
    }

    for (const attachment of pending) {
      uploadingIdsRef.current.add(attachment.id);
    }

    const processPendingUploads = async () => {
      for (const attachment of pending) {
        await uploadAttachment(attachment);
        uploadingIdsRef.current.delete(attachment.id);
      }
    };
    processPendingUploads().catch(() => undefined);
  }, [attachments, uploadAttachment]);

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
      setInput(queuedSubmission.inputValue);
      latestInputRef.current = queuedSubmission.inputValue;
      setLocalStorageInput({
        message: queuedSubmission.inputValue,
        files_uploaded: [],
      });
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
        setInput(inputValue);
        latestInputRef.current = inputValue;
        setLocalStorageInput({
          message: inputValue,
          files_uploaded: [],
        });
        toast.error(ERROR_MESSAGES.UNKNOWN_ERROR);
        return;
      }

      setAttachments((previous) =>
        previous.filter((attachment) => !submittedIds.has(attachment.id))
      );

      for (const attachment of readyAttachments) {
        revokeAttachmentUrl(attachment.url);
      }

      try {
        window.localStorage.removeItem("chat-input");
      } catch {
        // ignore localStorage errors in restricted contexts
      }
    };

    submitQueued().catch(() => undefined);
  }, [
    attachments,
    handleSubmit,
    queuedSubmission,
    setAttachments,
    setInput,
    setLocalStorageInput,
  ]);

  const enqueueFiles = useCallback(
    (incomingFiles: File[]) => {
      if (incomingFiles.length === 0) {
        return;
      }

      if (attachments.length + incomingFiles.length > MAX_FILES) {
        toast.error("File limit exceeded", {
          description: `You can only upload up to ${MAX_FILES} files per message.`,
          duration: 3000,
        });
        return;
      }

      const nextAttachments = incomingFiles.map(createLocalAttachment);
      setAttachments((prev) => [...prev, ...nextAttachments]);
    },
    [attachments.length, setAttachments]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    enqueueFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      setAttachments((prev) => {
        const selected = prev.find(
          (attachment) => attachment.id === attachmentId
        );
        if (!selected) {
          return prev;
        }
        revokeAttachmentUrl(selected.url);
        return prev.filter((attachment) => attachment.id !== attachmentId);
      });
    },
    [setAttachments]
  );

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

      latestInputRef.current = nextInput;
      setInput(nextInput);
      setDismissedMentionKey(null);

      setAttachments((previous) => {
        if (
          previous.some((attachment) => attachment.workspaceFileId === file.id)
        ) {
          return previous;
        }
        if (previous.length >= MAX_FILES) {
          toast.error("File limit exceeded", {
            description: `You can only upload up to ${MAX_FILES} files per message.`,
            duration: 3000,
          });
          return previous;
        }
        return [
          ...previous,
          createWorkspaceAttachment({
            id: file.id,
            name: file.name,
            url: file.url,
            contentType: file.contentType,
            sizeBytes: file.sizeBytes,
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
    [input, mentionTrigger, setAttachments, setInput, updateTextareaSelection]
  );

  const resetHeight = useCallback(() => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.overflowY = "hidden";
  }, []);

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

    latestInputRef.current = "";
    setInput("");
    setLocalStorageInput({
      message: "",
      files_uploaded: [],
    });
    resetHeight();

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
      setInput(inputValue);
      setLocalStorageInput({
        message: inputValue,
        files_uploaded: [],
      });
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

    try {
      window.localStorage.removeItem("chat-input");
    } catch {
      // ignore localStorage errors in restricted contexts
    }

    for (const attachment of attachmentsToSubmit) {
      revokeAttachmentUrl(attachment.url);
    }
  }, [
    handleSubmit,
    input,
    resetHeight,
    setAttachments,
    setInput,
    setLocalStorageInput,
    status,
    submittableAttachments,
    width,
  ]);

  const runSubmitForm = useCallback(() => {
    submitForm().catch(() => undefined);
  }, [submitForm]);

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
        if (canSend) {
          runSubmitForm();
        }
      }
    },
    [canSend, handleMentionKeyDown, isMobile, runSubmitForm, sendMode]
  );

  return (
    <div
      className="group/composer w-full"
      data-empty={!canSend}
      data-running={isRunning}
    >
      <div
        className={cn(
          "relative flex w-full grow flex-col overflow-visible p-2 transition-colors duration-100 focus-within:ring-1 focus-within:ring-ring",
          isMultiLine || attachments.length > 0 ? "rounded-2xl" : "rounded-full",
          surfaceClasses(2, 2)
        )}
      >
        <input
          className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />

        <div className="relative">
          <AnimatePresence initial={false}>
            {attachments.length > 0 ? (
              <motion.div
                animate={{ height: "auto", opacity: 1, y: 0 }}
                className="overflow-hidden pb-1"
                exit={{ height: 0, opacity: 0, y: -8 }}
                initial={{ height: 0, opacity: 0, y: -8 }}
                transition={{ ...springs.moderate, bounce: 0 }}
              >
                <motion.div
                  className="flex flex-wrap items-center gap-2"
                  layout
                  transition={{ ...springs.fast, bounce: 0 }}
                >
                  <AnimatePresence initial={false}>
                    {attachments.map((attachment) => (
                      <PreviewAttachment
                        attachment={attachment}
                        key={attachment.id}
                        onRemove={removeAttachment}
                        variant="composer"
                        workspaceUuid={workspaceUuid}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="relative">
            <AnimatePresence initial={false}>
              {isMentionMenuOpen && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="pointer-events-none absolute inset-x-1 bottom-full z-20 mb-3"
                  exit={{ opacity: 0, y: 6 }}
                  initial={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <Command>
                    <div
                      className="scroll-fade-frame scroll-fade-top scroll-fade-bottom relative"
                      style={
                        {
                          "--scroll-fade-color": "var(--popover)",
                        } as React.CSSProperties
                      }
                    >
                      <div className="pointer-events-auto relative overflow-hidden rounded-xl border border-border bg-popover">
                        <CommandList className="max-h-64">
                          {mentionSuggestions.map((file, index) => (
                            <CommandItem
                              aria-label={`Attach ${file.workspacePath}`}
                              className={cn(
                                "cursor-pointer select-none gap-2 rounded-none px-4 py-3",
                                index === highlightedMentionIndex &&
                                  "bg-accent text-accent-foreground"
                              )}
                              key={file.id}
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onSelect={() => {
                                selectMention(file);
                              }}
                              ref={(node) => {
                                mentionItemRefs.current[index] = node;
                              }}
                              value={file.workspacePath}
                            >
                              <FileTextIcon className="size-4 text-muted-foreground/80" />
                              <span className="flex min-w-0 items-center gap-1.5 truncate">
                                <span className="truncate">{file.name}</span>
                              </span>
                              <span className="truncate text-muted-foreground/70 text-xs">
                                {file.parentPath || "Workspace root"}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </div>
                    </div>

                    {mentionSuggestions.length === 0 && (
                      <CommandEmpty className="px-3 py-2 text-muted-foreground/70 text-xs">
                        No matching workspace files.
                      </CommandEmpty>
                    )}
                  </Command>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 flex min-h-9 items-end gap-1.5">
              <AttachmentsButton
                onClick={() => fileInputRef.current?.click()}
                status={status}
              />

              <div
                className={cn(
                  "flex min-w-0 flex-1 overflow-hidden",
                  centered ? "items-center" : "items-end"
                )}
              >
                <Textarea
                  autoFocus
                  className={cn(
                    "max-h-40 min-h-9 w-full flex-1 resize-none overflow-y-hidden border-none! bg-transparent! px-2 py-2 text-[14px] text-foreground leading-5 shadow-none! outline-none ring-0! placeholder:text-muted-foreground focus-visible:border-transparent! focus-visible:ring-0!",
                    className
                  )}
                  data-testid="multimodal-input"
                  enterKeyHint={isMobile ? "enter" : "send"}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setDismissedMentionKey(null);
                    latestInputRef.current = nextValue;
                    setInput(nextValue);
                    setLocalStorageInput({
                      message: nextValue,
                      files_uploaded: [],
                    });
                    updateTextareaSelection(
                      event.target.selectionStart ?? 0,
                      event.target.selectionEnd ?? 0
                    );
                  }}
                  onClick={() => {
                    updateTextareaSelection();
                  }}
                  onKeyDown={handleTextareaKeyDown}
                  onKeyUp={() => {
                    updateTextareaSelection();
                  }}
                  onPaste={(event) => {
                    const pastedFiles: File[] = [];
                    for (const item of Array.from(event.clipboardData.items)) {
                      if (
                        item.kind !== "file" ||
                        !item.type.startsWith("image/")
                      ) {
                        continue;
                      }
                      const file = item.getAsFile();
                      if (file) {
                        pastedFiles.push(file);
                      }
                    }

                    if (pastedFiles.length > 0) {
                      enqueueFiles(pastedFiles);
                      toast.success(
                        `Added ${pastedFiles.length} pasted image${pastedFiles.length > 1 ? "s" : ""}.`
                      );
                    }
                  }}
                  onSelect={() => {
                    updateTextareaSelection();
                  }}
                  placeholder={composerPlaceholder}
                  ref={textareaRef}
                  rows={1}
                  value={input}
                />
              </div>

              <div className="flex h-9 shrink-0 items-end gap-1.5">
                {isMobile ? null : (
                  <ComposerTurboButton
                    disabled={isRunning}
                    enabled={turboEnabled}
                    onToggle={() => onTurboChange(!turboEnabled)}
                  />
                )}
                {speechSupported ? (
                  <ComposerVoiceButton
                    isRecording={isRecording}
                    isRunning={isRunning}
                    isTranscribing={isTranscribing}
                    onToggle={() => {
                      if (isRecording) {
                        stopRecording();
                        return;
                      }

                      void startRecording();
                    }}
                  />
                ) : null}
                <ComposerActionButton
                  canSend={canSend}
                  isRunning={isRunning}
                  onSend={runSubmitForm}
                  onStop={stop}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) =>
    prevProps.input === nextProps.input &&
    prevProps.status === nextProps.status &&
    prevProps.turboEnabled === nextProps.turboEnabled &&
    prevProps.attachments === nextProps.attachments &&
    prevProps.workspaceUuid === nextProps.workspaceUuid
);

function PureAttachmentsButton({
  onClick,
  status,
}: {
  onClick: () => void;
  status: UseChatHelpers<UIMessage>["status"];
}) {
  return (
    <Button
      aria-label="Add attachment"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      data-testid="attachments-button"
      disabled={status === "submitted" || status === "streaming"}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Plus className="size-[18px]" weight="regular" />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureComposerVoiceButton({
  isRecording,
  isRunning,
  isTranscribing,
  onToggle,
}: {
  isRecording: boolean;
  isRunning: boolean;
  isTranscribing: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative h-9 w-9 shrink-0">
      <motion.span
        animate={
          isRecording
            ? {
                opacity: [0.22, 0.08, 0.22],
                scale: [1, 1.18, 1],
              }
            : {
                opacity: isTranscribing ? 0.12 : 0,
                scale: 1,
              }
        }
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full",
          isRecording ? "bg-red-500/30" : "bg-foreground/10"
        )}
        transition={
          isRecording
            ? {
                duration: 1.3,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
              }
            : { duration: 0.18, ease: "easeOut" }
        }
      />
      <Button
        aria-label={isRecording ? "Stop recording" : "Start voice input"}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground",
          (isRecording || isTranscribing) && "text-foreground",
          isRecording &&
            "border-red-500/30 text-red-600 dark:border-red-400/35 dark:text-red-300"
        )}
        disabled={isTranscribing || isRunning}
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <motion.span
          animate={
            isRecording
              ? { scale: [1, 0.88, 1] }
              : { scale: isTranscribing ? 0.94 : 1 }
          }
          transition={
            isRecording
              ? {
                  duration: 1.1,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }
              : { duration: 0.18, ease: "easeOut" }
          }
        >
          {isRecording ? (
            <Square className="size-[13px] fill-current" weight="fill" />
          ) : (
            <Microphone className="size-4" weight="regular" />
          )}
        </motion.span>
      </Button>
    </div>
  );
}

const ComposerVoiceButton = memo(
  PureComposerVoiceButton,
  (prevProps, nextProps) =>
    prevProps.isRecording === nextProps.isRecording &&
    prevProps.isRunning === nextProps.isRunning &&
    prevProps.isTranscribing === nextProps.isTranscribing
);

function PureComposerTurboButton({
  disabled,
  enabled,
  onToggle,
}: {
  disabled: boolean;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      aria-label={enabled ? "Disable Apex Turbo" : "Enable Apex Turbo"}
      aria-pressed={enabled}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
        enabled && "text-yellow-700 dark:text-yellow-300",
        disabled && "opacity-60"
      )}
      data-testid="turbo-toggle-button"
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        onToggle();
      }}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Lightning
        className="size-[17px]"
        weight={enabled ? "fill" : "regular"}
      />
    </Button>
  );
}

const ComposerTurboButton = memo(
  PureComposerTurboButton,
  (prevProps, nextProps) =>
    prevProps.disabled === nextProps.disabled &&
    prevProps.enabled === nextProps.enabled
);

function PureComposerActionButton({
  canSend,
  isRunning,
  onSend,
  onStop,
}: {
  canSend: boolean;
  isRunning: boolean;
  onSend: () => void;
  onStop: () => void;
}) {
  const disabled = !(isRunning || canSend);

  return (
    <motion.div
      animate={{
        scale: 1,
      }}
      className="relative h-9 w-9 shrink-0"
      transition={springs.fast}
    >
      <motion.span
        animate={{
          opacity: disabled ? 0.68 : 1,
        }}
        className="absolute inset-0 rounded-full bg-primary"
        transition={springs.fast}
      />
      <Button
        aria-label={isRunning ? "Stop generating" : "Send message"}
        className={cn(
          "absolute inset-0 flex h-9 w-9 items-center justify-center rounded-full bg-transparent p-0 text-primary-foreground transition duration-150 ease-out hover:bg-transparent hover:text-primary-foreground focus-visible:ring-0",
          disabled && "opacity-55"
        )}
        data-testid={isRunning ? "stop-button" : "send-button"}
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          if (isRunning) {
            onStop();
            return;
          }
          if (canSend) {
            onSend();
          }
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <AnimatePresence initial={false} mode="wait">
          {isRunning ? (
            <motion.span
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -16, scale: 0.72 }}
              initial={{ opacity: 0, rotate: 16, scale: 0.72 }}
              key="stop"
              transition={springs.fast}
            >
              <Square className="size-[13px] fill-current" weight="fill" />
            </motion.span>
          ) : (
            <motion.span
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 16, scale: 0.72 }}
              initial={{ opacity: 0, rotate: -16, scale: 0.72 }}
              key="send"
              transition={springs.fast}
            >
              <ArrowUpIcon className="size-[18px]" weight="bold" />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}

const ComposerActionButton = memo(
  PureComposerActionButton,
  (prevProps, nextProps) =>
    prevProps.canSend === nextProps.canSend &&
    prevProps.isRunning === nextProps.isRunning
);
