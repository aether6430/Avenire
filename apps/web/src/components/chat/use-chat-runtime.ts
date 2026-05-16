"use client";

import { useChat } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import {
  DefaultChatTransport,
  type FileUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
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
import { useChatScroll } from "@/components/chat/use-chat-scroll";
import { getChatErrorMessage } from "@/lib/chat-errors";
import {
  CHAT_CREATED_EVENT,
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_FINISHED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatCreatedDetail,
  type ChatNameUpdatedDetail,
  type ChatStreamStatusDetail,
} from "@/lib/chat-events";
import { emitPetNotification } from "@/lib/pet-preferences";
import { chatMessageHandoffActions } from "@/stores/chat-message-handoff-store";

interface ChatProps {
  id: string;
  initialMessages: UIMessage[];
  initialPrompt?: string | null;
  isReadonly: boolean;
  selectedModel: string;
  userName?: string;
  workspaceUuid: string;
}

const MAX_FILES = 3;

export interface ChatRuntime {
  activeReplyMessageId: string | null;
  agentActivity: AgentActivityData | null;
  attachments: Attachment[];
  bottomSpacerHeight: number;
  chatId: string;
  displayedMessages: UIMessage[];
  error: Error | undefined;
  getRootProps: () => Record<string, unknown>;
  handleStop: () => void;
  handleSubmit: (inputValue: string, files: Attachment[]) => Promise<void>;
  input: string;
  isAutoScrollEnabled: boolean;
  isDragActive: boolean;
  layoutState: {
    hasConversationSurface: boolean;
    isEmptyState: boolean;
    isTransitioningFromNewChat: boolean;
    shouldUseCenteredComposerLayout: boolean;
  };
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesContentRef: React.RefObject<HTMLDivElement | null>;
  reenableAutoScroll: (behavior?: ScrollBehavior) => void;
  regenerateFromMessage: (assistantMessageId: string) => Promise<void>;
  sendMessage: (
    message: SendMessageInput,
    options?: SendMessageOptions
  ) => Promise<void>;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  status: "submitted" | "streaming" | "ready" | "error";
  workspaceUuid: string;
}

export function useChatRuntime({
  id,
  initialMessages,
  initialPrompt,
  selectedModel,
  workspaceUuid,
}: Omit<ChatProps, "isReadonly" | "userName">): ChatRuntime {
  const [chatId, setChatId] = useState(id);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [input, setInput] = useState("");
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

  const handleError = useCallback((error: Error) => {
    toast.error(getChatErrorMessage(error), {
      description: "If this issue persists, please contact support.",
      duration: 5000,
    });
    emitPetNotification({
      animation: "failed",
      message: "Response failed",
      tone: "failure",
    });
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          chatId,
          selectedModel,
        },
      }),
    [chatId, selectedModel]
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
      if (dataPart.type === "data-chatCreated") {
        const detail = dataPart.data as ChatCreatedDetail;
        if (!(detail?.id && detail?.fromId)) {
          return;
        }
        primeNewChatHandoff(detail.id);
        setChatId(detail.id);
        pendingChatRouteRef.current = detail.id;
        window.dispatchEvent(
          new CustomEvent<ChatCreatedDetail>(CHAT_CREATED_EVENT, {
            detail,
          })
        );
        return;
      }

      if (dataPart.type === "data-chatName") {
        const detail = dataPart.data as ChatNameUpdatedDetail;
        if (!(detail?.id && detail?.name)) {
          return;
        }
        window.dispatchEvent(
          new CustomEvent<ChatNameUpdatedDetail>(CHAT_NAME_UPDATED_EVENT, {
            detail,
          })
        );
        return;
      }

      if (dataPart.type === "data-agent_activity") {
        setAgentActivity(dataPart.data as AgentActivityData);
      }
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
    if (!nextChatId) {
      return;
    }

    const currentMessages = messagesRef.current;
    const pendingMessages = pendingNewChatMessagesRef.current;
    const handoffMessages =
      pendingMessages && pendingMessages.length > currentMessages.length
        ? pendingMessages
        : currentMessages.length > 0
          ? currentMessages
          : pendingMessages;

    if (!handoffMessages || handoffMessages.length === 0) {
      return;
    }

    chatMessageHandoffActions.prime(nextChatId, handoffMessages);
  }, []);

  const sendMessage = useCallback(
    async (message: SendMessageInput, options?: SendMessageOptions) => {
      if (chatId === "new") {
        const optimisticMessage = createOptimisticUserMessage(message);
        if (optimisticMessage) {
          pendingNewChatMessagesRef.current = [
            ...messagesRef.current,
            optimisticMessage,
          ];
        }
      }

      try {
        return await append(message, options);
      } catch (error) {
        if (chatId === "new" && !pendingChatRouteRef.current) {
          pendingNewChatMessagesRef.current = null;
        }
        throw error;
      }
    },
    [append, chatId]
  );

  const handleStop = useCallback(() => {
    setAgentActivity(null);
    stop();
  }, [stop]);

  useEffect(() => {
    if (initialMessages.length === 0 || messages.length > 0) {
      return;
    }

    setMessages(initialMessages);
  }, [initialMessages, messages.length, setMessages]);

  useEffect(() => {
    if (id === "new") {
      return;
    }
    resumeStream().catch(() => undefined);
  }, [id, resumeStream]);

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
    sendMessage({ text: prompt }).catch(() => {
      autoPromptSentRef.current = null;
    });
  }, [id, initialPrompt, messages.length, sendMessage, status]);

  useEffect(() => {
    if (!pendingChatRouteRef.current) {
      return;
    }

    const nextChatId = pendingChatRouteRef.current;
    primeNewChatHandoff(nextChatId);
    router.replace(`/workspace/chats/${nextChatId}`);
    pendingChatRouteRef.current = null;
    pendingNewChatMessagesRef.current = null;
  }, [primeNewChatHandoff, router]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(CHAT_STREAM_FINISHED_EVENT, {
        detail: { chatId },
      })
    );
  }, [chatId, status]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<ChatStreamStatusDetail>(CHAT_STREAM_STATUS_EVENT, {
        detail: { chatId, status },
      })
    );
    if (status === "submitted") {
      emitPetNotification({
        animation: "waiting",
        durationMs: 1800,
        message: "Thinking",
        tone: "working",
      });
    }
  }, [chatId, status]);

  useEffect(() => {
    if (status !== "ready") {
      previousStatusRef.current = status;
      return;
    }

    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;
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
      animation: "waving",
      message: "Response ready",
      tone: "success",
    });
  }, [messages, status]);

  useEffect(() => {
    if (status === "submitted") {
      setAgentActivity(null);
    }
  }, [status]);

  useEffect(() => {
    if (displayedMessages.length === 0) {
      return;
    }

    followIfNeeded(status === "submitted" ? "smooth" : "auto");
  }, [displayedMessages.length, followIfNeeded, status]);

  const regenerateFromMessage = useCallback(
    async (assistantMessageId: string) => {
      if (status === "submitted" || status === "streaming") {
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
          filename: part.filename,
          mediaType: part.mediaType,
          type: "file",
          url: part.url,
        }));

      const preservedMessages = messages.slice(0, userIndex);
      setMessages(preservedMessages);

      try {
        await sendMessage({
          text: userText,
          ...(userFiles.length > 0 ? { files: userFiles } : {}),
        });
      } catch (error) {
        setMessages(messages);
        handleError(
          error instanceof Error ? error : new Error("Failed to regenerate")
        );
      }
    },
    [handleError, messages, sendMessage, setMessages, status]
  );

  const handleSubmit = useCallback(
    async (inputValue: string, files: Attachment[]) => {
      const fileParts = buildChatSubmissionFileParts(files);

      if (fileParts.length > 0) {
        await sendMessage({
          files: fileParts,
          text: inputValue,
        });
      } else {
        await sendMessage({ text: inputValue });
      }
    },
    [sendMessage]
  );

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
    status,
    workspaceUuid,
  };
}
