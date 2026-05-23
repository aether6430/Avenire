"use client";

import { useChat } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  type Attachment,
  createLocalAttachment,
} from "@/components/chat/attachment";
import {
  buildChatSubmissionFileParts,
  createOptimisticUserMessage,
  getActiveReplyMessageId,
  getChatLayoutState,
  getDisplayedChatMessages,
  getLatestUserMessageId,
  type SendMessageInput,
  type SendMessageOptions,
} from "@/components/chat/chat-model";
import {
  buildRegenerationRequest,
  type ChatRuntime,
  getAutoPromptToSend,
  getChatAttachmentLimitDescription,
  getChatHandoffMessages,
  getChatStatusPetNotification,
  getCompletedAssistantMessageId,
  shouldHydrateInitialChatMessages,
  shouldResumeChatStream,
  shouldResumeChatStreamOnWindowActivation,
  type UseChatRuntimeProps,
  willExceedChatAttachmentLimit,
} from "@/components/chat/use-chat-runtime-model";
import {
  appendDroppedChatAttachments,
  buildChatRuntimeSubmission,
  flushChatRuntimeAutoPrompt,
  flushPendingChatRuntimeRoute,
  handleChatRuntimeDataPart,
  primeChatRuntimeHandoff,
  publishChatRuntimeStatus,
  publishCompletedChatRuntimeReply,
  reactToChatRuntimeError,
  regenerateChatRuntimeMessage,
  resolveChatRuntimeFollowBehavior,
  resolveChatRuntimeHydration,
  sendChatRuntimeMessage,
  shouldClearChatRuntimeAgentActivity,
} from "@/components/chat/use-chat-runtime-runtime";
import { useChatScroll } from "@/components/chat/use-chat-scroll";
import {
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_FINISHED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatNameUpdatedDetail,
  type ChatStreamStatusDetail,
  rememberChatStreamStatus,
} from "@/lib/chat-events";
import { emitPetNotification } from "@/lib/pet-preferences";
import { chatMessageHandoffActions } from "@/stores/chat-message-handoff-store";

export function useChatRuntime({
  id,
  initialMessages,
  initialPrompt,
  selectedModel,
  workspaceUuid,
}: UseChatRuntimeProps): ChatRuntime {
  const [chatId, setChatId] = useState(id);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [input, setInput] = useState("");
  const [turboEnabled, setTurboEnabled] = useState(false);
  const [agentActivity, setAgentActivity] = useState<AgentActivityData | null>(
    null
  );
  const router = useRouter();
  const lastCompletedMessageIdRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const messagesRef = useRef<UIMessage[]>(initialMessages);
  const pendingNewChatMessagesRef = useRef<UIMessage[] | null>(null);
  const pendingChatRouteRef = useRef<string | null>(null);
  const autoPromptSentRef = useRef<string | null>(null);

  const activeSelectedModel = turboEnabled ? "apex-turbo" : selectedModel;

  const handleError = useCallback((error: Error) => {
    reactToChatRuntimeError({
      emitPetNotification,
      error,
      toastError: (message, options) => {
        toast.error(message, options);
      },
    });
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          chatId,
          selectedModel: activeSelectedModel,
        },
      }),
    [activeSelectedModel, chatId]
  );

  const {
    error,
    messages,
    resumeStream,
    sendMessage: append,
    setMessages,
    status,
    stop,
  } = useChat<UIMessage>({
    experimental_throttle: 100,
    id: chatId,
    messages: initialMessages,
    onData: (dataPart) => {
      handleChatRuntimeDataPart({
        dataPart,
        onAgentActivity: setAgentActivity,
        onChatCreated: (detail) => {
          primeNewChatHandoff(detail.id);
          setChatId(detail.id);
          pendingChatRouteRef.current = detail.id;
        },
        onChatName: (detail) => {
          window.dispatchEvent(
            new CustomEvent<ChatNameUpdatedDetail>(CHAT_NAME_UPDATED_EVENT, {
              detail,
            })
          );
        },
      });
    },
    onError: handleError,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport,
  });

  const displayedMessages = useMemo(
    () => getDisplayedChatMessages(messages, status),
    [messages, status]
  );
  const shouldFollowStreamingTail =
    status === "streaming" || status === "submitted";
  const {
    bottomSpacerHeight,
    containerRef: messagesContainerRef,
    contentRef: messagesContentRef,
    followIfNeeded,
    isAutoScrollEnabled,
    reenableAutoScroll,
  } = useChatScroll({
    isStreaming: shouldFollowStreamingTail,
    latestUserMessageId: getLatestUserMessageId(messages),
    messageCount: displayedMessages.length,
  });
  const activeReplyMessageId = useMemo(
    () => getActiveReplyMessageId(displayedMessages),
    [displayedMessages]
  );
  const layoutState = useMemo(
    () =>
      getChatLayoutState({
        displayedMessages,
        pendingChatRoute: pendingChatRouteRef.current,
        status,
      }),
    [displayedMessages, status]
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const primeNewChatHandoff = useCallback((nextChatId: string) => {
    primeChatRuntimeHandoff({
      chatId: nextChatId,
      currentMessages: messagesRef.current,
      getChatHandoffMessages,
      pendingMessages: pendingNewChatMessagesRef.current,
      primeMessages: chatMessageHandoffActions.prime,
    });
  }, []);

  const sendMessage = useCallback(
    async (message: SendMessageInput, options?: SendMessageOptions) => {
      return sendChatRuntimeMessage({
        append,
        chatId,
        createOptimisticUserMessage,
        currentMessages: messagesRef.current,
        message,
        options,
        pendingChatRouteId: pendingChatRouteRef.current,
        setPendingNewChatMessages: (messages) => {
          pendingNewChatMessagesRef.current = messages;
        },
      });
    },
    [append, chatId]
  );

  const handleStop = useCallback(() => {
    setAgentActivity(null);
    stop();
  }, [stop]);

  useEffect(() => {
    const hydratedMessages = resolveChatRuntimeHydration({
      initialMessages,
      messageCount: messages.length,
      shouldHydrateInitialChatMessages,
    });
    if (hydratedMessages) {
      setMessages(hydratedMessages);
    }
  }, [initialMessages, messages.length, setMessages]);

  useEffect(() => {
    if (!shouldResumeChatStream(id)) {
      return;
    }
    resumeStream().catch(() => undefined);
  }, [id, resumeStream]);

  useEffect(() => {
    if (!shouldResumeChatStream(id)) {
      return;
    }

    const resumeExistingStream = () => {
      if (
        !shouldResumeChatStreamOnWindowActivation({
          chatId: id,
          visibilityState: document.visibilityState,
        })
      ) {
        return;
      }

      resumeStream().catch(() => undefined);
    };

    window.addEventListener("focus", resumeExistingStream);
    document.addEventListener("visibilitychange", resumeExistingStream);

    return () => {
      window.removeEventListener("focus", resumeExistingStream);
      document.removeEventListener("visibilitychange", resumeExistingStream);
    };
  }, [id, resumeStream]);

  useEffect(() => {
    void flushChatRuntimeAutoPrompt({
      chatId: id,
      getAutoPromptToSend,
      initialPrompt,
      lastAutoPrompt: autoPromptSentRef.current,
      messageCount: messages.length,
      sendMessage,
      setLastAutoPrompt: (prompt) => {
        autoPromptSentRef.current = prompt;
      },
      status,
    });
  }, [id, initialPrompt, messages.length, sendMessage, status]);

  useEffect(() => {
    flushPendingChatRuntimeRoute({
      clearPendingChatRoute: () => {
        pendingChatRouteRef.current = null;
      },
      clearPendingNewChatMessages: () => {
        pendingNewChatMessagesRef.current = null;
      },
      pendingChatRouteId: pendingChatRouteRef.current,
      primeNewChatHandoff,
      replaceRoute: (href) => {
        router.replace(href as Route);
      },
    });
  }, [primeNewChatHandoff, router]);

  useEffect(() => {
    publishChatRuntimeStatus({
      chatId,
      emitPetNotification,
      getChatStatusPetNotification,
      onFinished: (detail) => {
        window.dispatchEvent(
          new CustomEvent(CHAT_STREAM_FINISHED_EVENT, {
            detail,
          })
        );
      },
      onStatus: (detail) => {
        rememberChatStreamStatus(detail);
        window.dispatchEvent(
          new CustomEvent<ChatStreamStatusDetail>(CHAT_STREAM_STATUS_EVENT, {
            detail,
          })
        );
      },
      status,
    });
  }, [chatId, status]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;
    lastCompletedMessageIdRef.current = publishCompletedChatRuntimeReply({
      getCompletedAssistantMessageId,
      lastCompletedMessageId: lastCompletedMessageIdRef.current,
      messages,
      onCompleted: () =>
        emitPetNotification({
          animation: "waving",
          message: "Response ready",
          tone: "success",
        }),
      previousStatus,
      status,
    });
  }, [messages, status]);

  useEffect(() => {
    if (shouldClearChatRuntimeAgentActivity(status)) {
      setAgentActivity(null);
    }
  }, [status]);

  useEffect(() => {
    const behavior = resolveChatRuntimeFollowBehavior({
      displayedMessageCount: displayedMessages.length,
      status,
    });
    if (behavior) {
      followIfNeeded(behavior);
    }
  }, [displayedMessages.length, followIfNeeded, status]);

  const regenerateFromMessage = useCallback(
    async (assistantMessageId: string) => {
      await regenerateChatRuntimeMessage({
        assistantMessageId,
        buildRegenerationRequest,
        handleError,
        messages,
        sendMessage,
        setMessages,
        status,
      });
    },
    [handleError, messages, sendMessage, setMessages, status]
  );

  const handleSubmit = useCallback(
    async (inputValue: string, files: Attachment[]) => {
      await sendMessage(
        buildChatRuntimeSubmission({
          buildChatSubmissionFileParts,
          files,
          inputValue,
        })
      );
    },
    [sendMessage]
  );

  const addDroppedFiles = useCallback((incomingFiles: File[]) => {
    setAttachments((prev) => {
      const next = appendDroppedChatAttachments({
        createLocalAttachment,
        currentAttachments: prev,
        files: incomingFiles,
        getChatAttachmentLimitDescription: () =>
          getChatAttachmentLimitDescription(),
        willExceedChatAttachmentLimit,
      });
      if (next.errorDescription) {
        toast.error("File limit exceeded", {
          description: next.errorDescription,
          duration: 3000,
        });
        return prev;
      }

      return next.attachments;
    });
  }, []);

  const { getRootProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: addDroppedFiles,
  });

  return {
    activeReplyMessageId,
    agentActivity,
    attachments,
    bottomSpacerHeight,
    chatId,
    displayedMessages,
    error,
    getRootProps,
    handleStop,
    handleSubmit,
    input,
    isAutoScrollEnabled,
    isDragActive,
    layoutState,
    messagesContainerRef,
    messagesContentRef,
    reenableAutoScroll,
    regenerateFromMessage,
    sendMessage,
    setAttachments,
    setInput,
    setTurboEnabled,
    status,
    turboEnabled,
    workspaceUuid,
  };
}
