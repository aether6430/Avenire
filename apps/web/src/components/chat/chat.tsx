"use client";

import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { Button } from "@avenire/ui/components/button";
import { createDurableChatTransport } from "@durable-streams/aisdk-transport";
import { CaretDown as ChevronDown } from "@phosphor-icons/react";
import {
  type ChatTransport,
  type FileUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import type { WorkspaceInvalidationDetail } from "@/components/dashboard/workspace-realtime-bridge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getChatErrorMessage,
  getChatErrorSignature,
  isRecoverableChatDisconnect,
} from "@/lib/chat-errors";
import {
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_FINISHED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatNameUpdatedDetail,
  type ChatStreamFinishedDetail,
  type ChatStreamStatus,
  type ChatStreamStatusDetail,
  isActiveChatStreamStatus,
  isChatStreamActive,
  rememberChatStreamStatus,
} from "@/lib/chat-events";
import {
  readCachedChatMessages,
  reconcileChatMessages,
  writeCachedChatMessages,
} from "@/lib/chat-message-cache";
import { normalizeMediaType } from "@/lib/media-type";
import { emitPetNotification } from "@/lib/pet-preferences";
import { usePaneRouter } from "@/lib/workspace-panes";
import { type Attachment, createLocalAttachment } from "./attachment";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { MobileEmptyChatOverview, Overview } from "./overview";
import { useChatScroll } from "./use-chat-scroll";

interface ChatProps {
  id: string;
  initialMessages: UIMessage[];
  initialPrompt?: string | null;
  isReadonly: boolean;
  newChatKey?: string;
  selectedModel: string;
  userName?: string;
  workspaceUuid: string;
}

type SendMessageInput = Parameters<UseChatHelpers<UIMessage>["sendMessage"]>[0];
type SendMessageOptions = Parameters<
  UseChatHelpers<UIMessage>["sendMessage"]
>[1];
type ChatStatus = UseChatHelpers<UIMessage>["status"];
type NoteMutationReason = "file.created" | "file.updated";

interface NoteMutationEvent {
  cacheKey: string;
  fileId: string;
  reason: NoteMutationReason;
}

const ACTIVE_REPLY_MIN_HEIGHT = "calc(100dvh - 250px)";
const EMPTY_COMPOSER_SHELL_CLASSNAME =
  "mx-auto mb-3 w-full max-w-4xl px-4 md:mb-3 md:px-0";
const FLOATING_COMPOSER_SHELL_CLASSNAME =
  "mx-auto w-full px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] md:max-w-4xl md:px-0 md:pb-3";
const MOBILE_CHAT_COMPOSER_CLOSE_EVENT = "avenire:mobile-chat-composer-close";
const MOBILE_CHAT_COMPOSER_OPEN_EVENT = "avenire:mobile-chat-composer-open";
const MOBILE_CHAT_COMPOSER_STATE_EVENT = "avenire:mobile-chat-composer-state";
const MOBILE_CHAT_VOICE_START_EVENT = "avenire:mobile-chat-voice-start";
const NEW_CHAT_REQUESTED_EVENT = "avenire:new-chat-requested";
const CHAT_MESSAGE_SENT_EVENT = "avenire:chat-message-sent";

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function outputRecordFromToolPart(part: UIMessage["parts"][number]) {
  const record = recordValue(part);
  if (
    !record ||
    typeof record.type !== "string" ||
    !record.type.startsWith("tool-") ||
    record.state !== "output-available"
  ) {
    return null;
  }

  const output = recordValue(record.output);
  return output ? { output, type: record.type } : null;
}

function buildNoteMutationCacheKey(input: {
  fileId: string;
  messageId: string;
  output: Record<string, unknown>;
  partIndex: number;
  reason: NoteMutationReason;
  type: string;
}) {
  return [
    input.messageId,
    input.partIndex,
    input.type,
    input.fileId,
    input.reason,
    stringValue(input.output, "updatedAt"),
    stringValue(input.output, "workspacePath"),
    stringValue(input.output, "content")?.length ?? 0,
  ].join(":");
}

function collectNoteMutationEvents(messages: UIMessage[]): NoteMutationEvent[] {
  const events: NoteMutationEvent[] = [];

  for (const message of messages) {
    for (const [partIndex, part] of message.parts.entries()) {
      const toolPart = outputRecordFromToolPart(part);
      if (!toolPart) {
        continue;
      }

      if (
        toolPart.type === "tool-create_note" ||
        toolPart.type === "tool-update_note"
      ) {
        const fileId = stringValue(toolPart.output, "fileId");
        if (!fileId) {
          continue;
        }
        const reason =
          toolPart.type === "tool-create_note"
            ? "file.created"
            : "file.updated";
        events.push({
          cacheKey: buildNoteMutationCacheKey({
            fileId,
            messageId: message.id,
            output: toolPart.output,
            partIndex,
            reason,
            type: toolPart.type,
          }),
          fileId,
          reason,
        });
        continue;
      }

      if (toolPart.type !== "tool-note_agent") {
        continue;
      }

      const operation = stringValue(toolPart.output, "operation");
      if (operation !== "created" && operation !== "updated") {
        continue;
      }

      const notes = Array.isArray(toolPart.output.notes)
        ? toolPart.output.notes
        : [];
      const reason = operation === "created" ? "file.created" : "file.updated";
      for (const [noteIndex, note] of notes.entries()) {
        const noteRecord = recordValue(note);
        const fileId = stringValue(noteRecord, "fileId");
        if (!fileId) {
          continue;
        }
        events.push({
          cacheKey: [
            message.id,
            partIndex,
            noteIndex,
            toolPart.type,
            fileId,
            reason,
            stringValue(noteRecord, "workspacePath"),
            stringValue(noteRecord, "content")?.length ?? 0,
          ].join(":"),
          fileId,
          reason,
        });
      }
    }
  }

  return events;
}

export function Chat({
  id,
  initialMessages,
  initialPrompt,
  selectedModel,
  isReadonly,
  newChatKey,
  workspaceUuid,
  userName,
}: ChatProps) {
  const [chatId, setChatId] = useState(() =>
    id === "new" ? crypto.randomUUID() : id
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [input, setInput] = useState("");
  const [agentActivity, setAgentActivity] = useState<AgentActivityData | null>(
    null
  );
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [turboEnabled, setTurboEnabled] = useState(false);
  const isMobile = useIsMobile();
  const paneRouter = usePaneRouter();
  const activeSelectedModel = turboEnabled ? "apex-turbo" : selectedModel;
  const lastCompletedMessageIdRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const publishedStreamStatusRef = useRef<ChatStreamStatus | null>(null);
  const lastFinishedStreamEventRef = useRef<string | null>(null);
  const hasPushedNewChatUrlRef = useRef(id !== "new");
  const autoPromptSentRef = useRef<string | null>(null);
  const previousNewChatKeyRef = useRef(newChatKey);
  const previousRouteIdRef = useRef(id);
  const latestChatStatusRef = useRef<ChatStatus>("ready");
  const pendingStreamRequestRef = useRef(false);
  const recoverableStreamErrorSignatureRef = useRef<string | null>(null);
  const publishedNoteMutationKeysRef = useRef<Set<string>>(new Set());
  const MAX_FILES = 3;

  const publishChatStreamStatus = useCallback(
    (nextStatus: ChatStreamStatus) => {
      const detail = { chatId, status: nextStatus };
      rememberChatStreamStatus(detail);
      window.dispatchEvent(
        new CustomEvent<ChatStreamStatusDetail>(CHAT_STREAM_STATUS_EVENT, {
          detail,
        })
      );
      publishedStreamStatusRef.current = nextStatus;
    },
    [chatId]
  );

  const canRecoverChatDisconnect = useCallback(
    (error: Error) =>
      isRecoverableChatDisconnect(error) &&
      (pendingStreamRequestRef.current ||
        isActiveChatStreamStatus(publishedStreamStatusRef.current) ||
        isChatStreamActive(chatId) ||
        latestChatStatusRef.current === "submitted" ||
        latestChatStatusRef.current === "streaming"),
    [chatId]
  );

  const rememberRecoverableChatDisconnect = useCallback(
    (error: Error) => {
      recoverableStreamErrorSignatureRef.current = getChatErrorSignature(error);
      pendingStreamRequestRef.current = true;
      publishChatStreamStatus("submitted");
    },
    [publishChatStreamStatus]
  );

  const handleError = useCallback(
    (error: Error) => {
      if (canRecoverChatDisconnect(error)) {
        rememberRecoverableChatDisconnect(error);
        return;
      }

      recoverableStreamErrorSignatureRef.current = null;
      pendingStreamRequestRef.current = false;
      toast.error(getChatErrorMessage(error), {
        description: "If this issue persists, please contact support.",
        duration: 5000,
      });
      emitPetNotification({
        message: "Chat failed",
        tone: "failure",
        animation: "failed",
      });
    },
    [canRecoverChatDisconnect, rememberRecoverableChatDisconnect]
  );

  const publishChatStreamFinished = useCallback(() => {
    if (lastFinishedStreamEventRef.current === chatId) {
      return;
    }
    lastFinishedStreamEventRef.current = chatId;
    window.dispatchEvent(
      new CustomEvent<ChatStreamFinishedDetail>(CHAT_STREAM_FINISHED_EVENT, {
        detail: { chatId },
      })
    );
  }, [chatId]);

  const transport = useMemo<ChatTransport<UIMessage>>(() => {
    const durableTransport = createDurableChatTransport<UIMessage>({
      api: "/api/chat",
    });

    return {
      reconnectToStream: durableTransport.reconnectToStream,
      sendMessages: (options) => {
        const lastMessage = options.messages.at(-1);
        const headers = new Headers(options.headers);
        if (lastMessage?.role === "user") {
          headers.set("Idempotency-Key", lastMessage.id);
        }

        return durableTransport.sendMessages({
          ...options,
          body: {
            ...options.body,
            chatId: options.chatId,
            selectedModel: activeSelectedModel,
          },
          headers,
        });
      },
    };
  }, [activeSelectedModel]);

  const {
    messages,
    setMessages,
    sendMessage: append,
    addToolApprovalResponse,
    stop,
    status,
    resumeStream,
    error,
  } = useChat<UIMessage>({
    id: chatId,
    transport,
    resume: true,
    experimental_throttle: 100,
    messages: initialMessages,
    onError: handleError,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ isAbort, isError }) => {
      if (isError) {
        if (recoverableStreamErrorSignatureRef.current) {
          publishChatStreamStatus("submitted");
          return;
        }
        pendingStreamRequestRef.current = false;
        publishChatStreamStatus("error");
        return;
      }

      pendingStreamRequestRef.current = false;
      recoverableStreamErrorSignatureRef.current = null;
      setAgentActivity(null);
      publishChatStreamStatus("ready");
      if (!isAbort) {
        publishChatStreamFinished();
      }
    },
    onData: (dataPart) => {
      if (dataPart.type === "data-chatName") {
        const detail = dataPart.data as ChatNameUpdatedDetail;
        if (!(detail?.id && detail?.name)) {
          return;
        }
        window.dispatchEvent(
          new CustomEvent<ChatNameUpdatedDetail>(CHAT_NAME_UPDATED_EVENT, {
            detail: { ...detail, workspaceUuid },
          })
        );
        return;
      }

      if (dataPart.type === "data-agent_activity") {
        setAgentActivity(dataPart.data as AgentActivityData);
      }
    },
  });
  const isRecoveringFromStreamDisconnect = Boolean(
    error &&
      getChatErrorSignature(error) ===
        recoverableStreamErrorSignatureRef.current &&
      canRecoverChatDisconnect(error)
  );
  const effectiveStatus: ChatStatus = isRecoveringFromStreamDisconnect
    ? "submitted"
    : status;

  const displayedMessages = useMemo(() => {
    const lastMessage = messages.at(-1);
    if (!(effectiveStatus === "submitted" && lastMessage?.role === "user")) {
      return messages;
    }

    return [
      ...messages,
      {
        id: `assistant-draft-${lastMessage.id}`,
        role: "assistant",
        parts: [{ type: "text", text: "" }],
      } as UIMessage,
    ];
  }, [effectiveStatus, messages]);

  useEffect(() => {
    latestChatStatusRef.current = status;

    if (status === "submitted" || status === "streaming") {
      pendingStreamRequestRef.current = true;
      return;
    }

    if (status === "ready" && !recoverableStreamErrorSignatureRef.current) {
      pendingStreamRequestRef.current = false;
    }
  }, [status]);

  const visibleError =
    error &&
    getChatErrorSignature(error) !==
      recoverableStreamErrorSignatureRef.current &&
    !isRecoveringFromStreamDisconnect &&
    !canRecoverChatDisconnect(error)
      ? error
      : undefined;

  useEffect(() => {
    const mutationEvents = collectNoteMutationEvents(messages);
    if (mutationEvents.length === 0) {
      return;
    }

    for (const mutationEvent of mutationEvents) {
      if (publishedNoteMutationKeysRef.current.has(mutationEvent.cacheKey)) {
        continue;
      }

      publishedNoteMutationKeysRef.current.add(mutationEvent.cacheKey);
      window.dispatchEvent(
        new CustomEvent<WorkspaceInvalidationDetail>(
          "avenire:workspace-data-invalidated",
          {
            detail: {
              kind: "files",
              payload: {
                at: Date.now(),
                fileId: mutationEvent.fileId,
                reason: mutationEvent.reason,
                workspaceUuid,
              },
              workspaceUuid,
            },
          }
        )
      );
    }
  }, [messages, workspaceUuid]);

  const shouldFollowStreamingTail =
    effectiveStatus === "streaming" || effectiveStatus === "submitted";
  const {
    bottomSpacerHeight,
    containerRef: messagesContainerRef,
    contentRef: messagesContentRef,
    followIfNeeded,
    isAutoScrollEnabled,
    reenableAutoScroll,
  } = useChatScroll({
    isStreaming: shouldFollowStreamingTail,
    latestUserMessageId:
      [...messages].reverse().find((message) => message.role === "user")?.id ??
      null,
    messageCount: displayedMessages.length,
  });
  const activeReplyMessageId = useMemo(() => {
    for (let index = displayedMessages.length - 1; index >= 0; index -= 1) {
      const message = displayedMessages[index];
      if (message?.role === "assistant") {
        return message.id;
      }
      if (message?.role === "user") {
        break;
      }
    }

    return null;
  }, [displayedMessages]);

  useEffect(() => {
    const previousRouteId = previousRouteIdRef.current;
    previousRouteIdRef.current = id;

    if (id === "new") {
      const shouldResetNewChat =
        previousRouteId !== "new" ||
        previousNewChatKeyRef.current !== newChatKey;
      previousNewChatKeyRef.current = newChatKey;
      if (shouldResetNewChat) {
        publishedNoteMutationKeysRef.current.clear();
        hasPushedNewChatUrlRef.current = false;
        autoPromptSentRef.current = null;
        publishedStreamStatusRef.current = null;
        pendingStreamRequestRef.current = false;
        recoverableStreamErrorSignatureRef.current = null;
        setAgentActivity(null);
        setAttachments([]);
        setInput("");
        setChatId(crypto.randomUUID());
        setMessages([]);
      }
      return;
    }

    hasPushedNewChatUrlRef.current = true;
    if (id !== chatId) {
      publishedNoteMutationKeysRef.current.clear();
      publishedStreamStatusRef.current = null;
      setChatId(id);
    }
  }, [chatId, id, newChatKey, setMessages]);

  useEffect(() => {
    if (id !== "new") {
      return;
    }

    const resetNewChat = () => {
      publishedNoteMutationKeysRef.current.clear();
      hasPushedNewChatUrlRef.current = false;
      autoPromptSentRef.current = null;
      publishedStreamStatusRef.current = null;
      pendingStreamRequestRef.current = false;
      recoverableStreamErrorSignatureRef.current = null;
      setAgentActivity(null);
      setAttachments([]);
      setInput("");
      setChatId(crypto.randomUUID());
      setMessages([]);
    };

    window.addEventListener(NEW_CHAT_REQUESTED_EVENT, resetNewChat);
    return () => {
      window.removeEventListener(NEW_CHAT_REQUESTED_EVENT, resetNewChat);
    };
  }, [id, setMessages]);

  const promoteNewChatRoute = useCallback(() => {
    if (id !== "new" || hasPushedNewChatUrlRef.current) {
      return;
    }

    hasPushedNewChatUrlRef.current = true;
    publishChatStreamStatus("submitted");
    paneRouter.replace(`/workspace/chats/${chatId}` as Route, {
      scroll: false,
    });
  }, [chatId, id, paneRouter, publishChatStreamStatus]);

  const sendMessage = useCallback(
    async (message: SendMessageInput, options?: SendMessageOptions) => {
      return append(message, options);
    },
    [append]
  );

  const handleResumeStreamError = useCallback(
    (error: Error) => {
      if (canRecoverChatDisconnect(error)) {
        rememberRecoverableChatDisconnect(error);
        return;
      }

      pendingStreamRequestRef.current = false;
      recoverableStreamErrorSignatureRef.current = null;
      publishChatStreamStatus("error");
      handleError(error);
    },
    [
      canRecoverChatDisconnect,
      handleError,
      publishChatStreamStatus,
      rememberRecoverableChatDisconnect,
    ]
  );

  const handleStop = useCallback(() => {
    latestChatStatusRef.current = "ready";
    pendingStreamRequestRef.current = false;
    recoverableStreamErrorSignatureRef.current = null;
    setAgentActivity(null);
    publishChatStreamStatus("ready");
    stop();
  }, [publishChatStreamStatus, stop]);

  useEffect(() => {
    let cancelled = false;

    void readCachedChatMessages(chatId).then((cachedMessages) => {
      if (cancelled) {
        return;
      }
      const reconciledMessages = reconcileChatMessages(
        initialMessages,
        cachedMessages
      );
      if (reconciledMessages.length > 0) {
        setMessages(reconciledMessages);
      } else if (initialMessages.length > 0) {
        setMessages(initialMessages);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chatId, initialMessages, setMessages]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    void writeCachedChatMessages(chatId, messages);
  }, [chatId, messages]);

  const latestMessage = messages.at(-1);
  const latestMessageRole = latestMessage?.role ?? null;
  const latestUserMessageId =
    latestMessageRole === "user" ? (latestMessage?.id ?? null) : null;
  const canResumeStream =
    status === "ready" || isRecoveringFromStreamDisconnect;
  const shouldResumeKnownStream =
    id !== "new" && canResumeStream && isChatStreamActive(chatId);

  useEffect(() => {
    if (id === "new" || !canResumeStream) {
      return;
    }
    if (!(latestUserMessageId || shouldResumeKnownStream)) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const retryDelaysMs = [0, 500, 1500, 3000, 5000];
    let attemptIndex = 0;

    const attemptResume = () => {
      if (cancelled) {
        return;
      }

      void resumeStream().then(() => {
        if (cancelled) {
          return;
        }
        attemptIndex += 1;
        if (attemptIndex >= retryDelaysMs.length) {
          return;
        }
        timer = setTimeout(attemptResume, retryDelaysMs[attemptIndex]);
      }, handleResumeStreamError);
    };

    timer = setTimeout(attemptResume, retryDelaysMs[attemptIndex] ?? 0);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    handleResumeStreamError,
    id,
    canResumeStream,
    latestUserMessageId,
    resumeStream,
    shouldResumeKnownStream,
  ]);

  useEffect(() => {
    if (id === "new") {
      return;
    }

    const resumeExistingStream = () => {
      if (
        document.visibilityState === "hidden" ||
        !canResumeStream ||
        !(latestMessageRole === "user" || isChatStreamActive(chatId))
      ) {
        return;
      }
      void resumeStream().catch(handleResumeStreamError);
    };

    window.addEventListener("focus", resumeExistingStream);
    document.addEventListener("visibilitychange", resumeExistingStream);

    return () => {
      window.removeEventListener("focus", resumeExistingStream);
      document.removeEventListener("visibilitychange", resumeExistingStream);
    };
  }, [
    chatId,
    id,
    canResumeStream,
    handleResumeStreamError,
    latestMessageRole,
    resumeStream,
  ]);

  useEffect(() => {
    if (id !== "new") {
      autoPromptSentRef.current = null;
      return;
    }
    const prompt = initialPrompt?.trim();
    if (!prompt || autoPromptSentRef.current === prompt) {
      return;
    }
    if (status !== "ready" || messages.length > 0) {
      return;
    }

    autoPromptSentRef.current = prompt;
    pendingStreamRequestRef.current = true;
    promoteNewChatRoute();
    void sendMessage({ text: prompt }).catch((error) => {
      const normalizedError =
        error instanceof Error ? error : new Error("Failed to send message");
      if (canRecoverChatDisconnect(normalizedError)) {
        rememberRecoverableChatDisconnect(normalizedError);
        return;
      }

      autoPromptSentRef.current = null;
      pendingStreamRequestRef.current = false;
      recoverableStreamErrorSignatureRef.current = null;
      publishChatStreamStatus("error");
      handleError(normalizedError);
    });
  }, [
    id,
    initialPrompt,
    messages.length,
    promoteNewChatRoute,
    publishChatStreamStatus,
    sendMessage,
    status,
    handleError,
    canRecoverChatDisconnect,
    rememberRecoverableChatDisconnect,
  ]);

  useEffect(() => {
    const previousPublishedStatus = publishedStreamStatusRef.current;

    const shouldClearRememberedStream =
      isChatStreamActive(chatId) && latestMessageRole !== "user";
    const shouldPublish =
      isActiveChatStreamStatus(effectiveStatus) ||
      isActiveChatStreamStatus(previousPublishedStatus) ||
      shouldClearRememberedStream;

    if (!shouldPublish) {
      publishedStreamStatusRef.current = effectiveStatus;
      return;
    }

    publishChatStreamStatus(effectiveStatus);

    if (isActiveChatStreamStatus(effectiveStatus)) {
      lastFinishedStreamEventRef.current = null;
    }

    if (
      effectiveStatus === "ready" &&
      isActiveChatStreamStatus(previousPublishedStatus)
    ) {
      publishChatStreamFinished();
    }

    if (effectiveStatus === "submitted") {
      emitPetNotification({
        message: "Thinking",
        tone: "working",
        animation: "waiting",
        durationMs: 1800,
      });
    }
  }, [
    chatId,
    effectiveStatus,
    latestMessageRole,
    publishChatStreamFinished,
    publishChatStreamStatus,
  ]);

  useEffect(() => {
    if (effectiveStatus !== "ready") {
      previousStatusRef.current = effectiveStatus;
      return;
    }
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = effectiveStatus;
    if (previousStatus !== "submitted" && previousStatus !== "streaming") {
      return;
    }
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") {
      return;
    }
    if (lastCompletedMessageIdRef.current === lastMessage.id) {
      return;
    }

    lastCompletedMessageIdRef.current = lastMessage.id;
    emitPetNotification({
      message: "Chat complete",
      tone: "success",
      animation: "waving",
    });
  }, [effectiveStatus, messages]);

  useEffect(() => {
    if (effectiveStatus === "submitted") {
      setAgentActivity(null);
    }
  }, [effectiveStatus]);

  useEffect(() => {
    if (displayedMessages.length === 0) {
      return;
    }

    followIfNeeded(effectiveStatus === "submitted" ? "smooth" : "auto");
  }, [displayedMessages.length, effectiveStatus, followIfNeeded]);

  const regenerateFromMessage = useCallback(
    async (assistantMessageId: string) => {
      if (effectiveStatus === "submitted" || effectiveStatus === "streaming") {
        return;
      }

      const targetIndex = messages.findIndex(
        (message) => message.id === assistantMessageId
      );
      if (targetIndex <= 0 || messages[targetIndex]?.role !== "assistant") {
        return;
      }

      let userIndex = targetIndex - 1;
      while (userIndex >= 0 && messages[userIndex]?.role !== "user") {
        userIndex -= 1;
      }
      if (userIndex < 0) {
        return;
      }

      const userMessage = messages[userIndex];
      const userText = userMessage.parts
        .filter(
          (
            part
          ): part is Extract<
            (typeof userMessage.parts)[number],
            { type: "text"; text: string }
          > => part.type === "text"
        )
        .map((part) => part.text)
        .join("\n")
        .trim();
      const userFiles: FileUIPart[] = userMessage.parts
        .filter(
          (
            part
          ): part is Extract<
            (typeof userMessage.parts)[number],
            { type: "file"; url: string }
          > => part.type === "file" && typeof part.url === "string"
        )
        .map((part) => ({
          type: "file",
          filename: part.filename,
          mediaType: part.mediaType,
          url: part.url,
        }));

      const preservedMessages = messages.slice(0, userIndex);
      setMessages(preservedMessages);
      pendingStreamRequestRef.current = true;
      publishChatStreamStatus("submitted");

      try {
        await sendMessage({
          text: userText,
          ...(userFiles.length > 0 ? { files: userFiles } : {}),
        });
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error("Failed to regenerate");
        if (canRecoverChatDisconnect(normalizedError)) {
          rememberRecoverableChatDisconnect(normalizedError);
          return;
        }

        pendingStreamRequestRef.current = false;
        recoverableStreamErrorSignatureRef.current = null;
        setMessages(messages);
        publishChatStreamStatus("error");
        handleError(normalizedError);
      }
    },
    [
      canRecoverChatDisconnect,
      handleError,
      messages,
      publishChatStreamStatus,
      rememberRecoverableChatDisconnect,
      sendMessage,
      setMessages,
      effectiveStatus,
    ]
  );

  const handleSubmit = async (inputValue: string, files: Attachment[]) => {
    promoteNewChatRoute();
    pendingStreamRequestRef.current = true;
    publishChatStreamStatus("submitted");
    window.dispatchEvent(
      new CustomEvent(CHAT_MESSAGE_SENT_EVENT, {
        detail: { chatId, text: inputValue, workspaceUuid },
      })
    );

    const localFileParts: FileUIPart[] = files
      .filter((attachment) => attachment.source === "local")
      .flatMap((attachment) => {
        if (!attachment.url || attachment.url.trim().length === 0) {
          return [];
        }

        const url = attachment.url.trim();
        if (!(url.startsWith("http://") || url.startsWith("https://"))) {
          return [];
        }

        return [
          {
            type: "file",
            mediaType: normalizeMediaType(attachment.contentType),
            filename: attachment.name,
            url,
          } satisfies FileUIPart,
        ];
      });

    const workspaceFileParts: FileUIPart[] = files
      .filter((attachment) => attachment.source === "workspace")
      .flatMap((attachment) => {
        if (!attachment.url || attachment.url.trim().length === 0) {
          return [];
        }
        return [
          {
            type: "file",
            mediaType: normalizeMediaType(attachment.contentType),
            filename: attachment.name,
            url: attachment.url,
          } satisfies FileUIPart,
        ];
      });

    try {
      if (localFileParts.length > 0 || workspaceFileParts.length > 0) {
        await sendMessage({
          text: inputValue,
          files: [...localFileParts, ...workspaceFileParts],
        });
      } else {
        await sendMessage({ text: inputValue });
      }
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Failed to send message");
      if (canRecoverChatDisconnect(normalizedError)) {
        rememberRecoverableChatDisconnect(normalizedError);
        return;
      }

      pendingStreamRequestRef.current = false;
      recoverableStreamErrorSignatureRef.current = null;
      publishChatStreamStatus("error");
      throw normalizedError;
    }
  };

  const addDroppedFiles = useCallback((incomingFiles: File[]) => {
    if (incomingFiles.length === 0) {
      return;
    }
    setAttachments((prev) => {
      if (prev.length + incomingFiles.length > MAX_FILES) {
        toast.error("File limit exceeded", {
          description: `You can only upload up to ${MAX_FILES} files per message.`,
          duration: 3000,
        });
        return prev;
      }

      const next = incomingFiles.map(createLocalAttachment);

      return [...prev, ...next];
    });
  }, []);

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: addDroppedFiles,
    noClick: true,
    noKeyboard: true,
  });

  const hasConversationSurface = displayedMessages.length > 0;
  const isEmptyState =
    !hasConversationSurface &&
    effectiveStatus !== "submitted" &&
    effectiveStatus !== "streaming";
  const isTransitioningFromNewChat =
    id === "new" &&
    !hasConversationSurface &&
    (effectiveStatus === "submitted" || effectiveStatus === "streaming");
  const shouldUseCenteredComposerLayout =
    (!isMobile && isEmptyState) || isTransitioningFromNewChat;
  const showBottomComposer = !isMobile || mobileComposerOpen;
  const isMobileComposerVisible = isMobile && mobileComposerOpen;
  const inputCard = (centered = false) => (
    <div
      className={
        centered
          ? EMPTY_COMPOSER_SHELL_CLASSNAME
          : FLOATING_COMPOSER_SHELL_CLASSNAME
      }
    >
      <MultimodalInput
        attachments={attachments}
        centered={centered}
        handleSubmit={handleSubmit}
        input={input}
        onTurboChange={setTurboEnabled}
        setAttachments={setAttachments}
        setInput={setInput}
        status={effectiveStatus}
        stop={handleStop}
        turboEnabled={turboEnabled}
        workspaceUuid={workspaceUuid}
      />
    </div>
  );

  useEffect(() => {
    const openComposer = (event: Event) => {
      const detail = (event as CustomEvent<{ voice?: boolean }>).detail;
      setMobileComposerOpen(true);
      window.dispatchEvent(
        new CustomEvent(MOBILE_CHAT_COMPOSER_STATE_EVENT, {
          detail: { open: true },
        })
      );
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLTextAreaElement>(
            "[data-testid='multimodal-input']"
          )
          ?.focus();
        if (detail?.voice) {
          window.dispatchEvent(new CustomEvent(MOBILE_CHAT_VOICE_START_EVENT));
        }
      });
    };
    const closeComposer = () => {
      setMobileComposerOpen(false);
      window.dispatchEvent(
        new CustomEvent(MOBILE_CHAT_COMPOSER_STATE_EVENT, {
          detail: { open: false },
        })
      );
    };

    window.addEventListener(MOBILE_CHAT_COMPOSER_OPEN_EVENT, openComposer);
    window.addEventListener(MOBILE_CHAT_COMPOSER_CLOSE_EVENT, closeComposer);
    return () => {
      window.removeEventListener(MOBILE_CHAT_COMPOSER_OPEN_EVENT, openComposer);
      window.removeEventListener(
        MOBILE_CHAT_COMPOSER_CLOSE_EVENT,
        closeComposer
      );
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(MOBILE_CHAT_COMPOSER_STATE_EVENT, {
        detail: { open: isMobileComposerVisible },
      })
    );
  }, [isMobile, isMobileComposerVisible]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }
    setMobileComposerOpen((open) => (chatId && open ? false : open));
  }, [chatId, isMobile]);

  return (
    <div
      {...getRootProps()}
      className="relative flex h-full min-h-0 flex-col bg-[#fdfdfd] px-0 md:px-4 dark:bg-[#141414]"
    >
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {hasConversationSurface && (
          <Messages
            activeReplyMessageId={activeReplyMessageId}
            addToolApprovalResponse={addToolApprovalResponse}
            agentActivity={agentActivity}
            bottomSpacerHeight={bottomSpacerHeight}
            chatId={chatId}
            error={visibleError}
            isReadonly={isReadonly}
            messages={displayedMessages}
            messagesContainerRef={messagesContainerRef}
            messagesContentRef={messagesContentRef}
            onRegenerate={regenerateFromMessage}
            replyMinHeight={ACTIVE_REPLY_MIN_HEIGHT}
            sendMessage={sendMessage}
            status={effectiveStatus}
            workspaceUuid={workspaceUuid}
          />
        )}

        {!isReadonly && (
          <AnimatePresence initial={false} mode="popLayout">
            {isMobile && isEmptyState ? (
              <MobileEmptyChatOverview userName={userName} />
            ) : null}
            {shouldUseCenteredComposerLayout ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center"
                exit={{ opacity: 0, y: 16 }}
                initial={{ opacity: 0, y: 24 }}
                key="composer-center"
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <div className="relative flex w-full flex-col items-center justify-center md:max-w-4xl">
                  {isEmptyState ? (
                    <div className="pointer-events-none absolute bottom-[calc(100%+2.25rem)] w-full sm:bottom-[calc(100%+3rem)]">
                      <Overview userName={userName} />
                    </div>
                  ) : null}
                  {inputCard(true)}
                </div>
              </motion.div>
            ) : showBottomComposer ? (
              <motion.form
                animate={{ opacity: 1, y: 0 }}
                className="fixed inset-x-0 bottom-0 z-30 w-full md:relative md:inset-auto"
                exit={{ opacity: 0, y: 12 }}
                initial={{ opacity: 0, y: 20 }}
                key="composer-bottom"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {isMobile ? null : (
                  <motion.div
                    animate={isAutoScrollEnabled ? "hidden" : "visible"}
                    className="pointer-events-none absolute right-0 bottom-[calc(100%+0.75rem)] z-20 flex justify-end"
                    initial="hidden"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    variants={{
                      visible: { opacity: 1, y: 0 },
                      hidden: { opacity: 0, y: 8 },
                    }}
                  >
                    <Button
                      className="pointer-events-auto h-9 min-w-9 rounded-md border border-border/70 bg-background px-2.5 sm:h-10 sm:min-w-10 sm:px-3"
                      onClick={() => reenableAutoScroll("smooth")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
                {inputCard(false)}
              </motion.form>
            ) : null}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {isDragActive && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ scale: 1 }}
              className="rounded-2xl border-2 border-primary border-dashed bg-background p-8 text-center"
              exit={{ scale: 0.95 }}
              initial={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-medium text-lg">Drop your files here</p>
              <p className="mt-2 text-muted-foreground text-sm">
                You can upload up to {MAX_FILES} files
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
