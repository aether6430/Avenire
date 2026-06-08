"use client";

import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import type { AgentActivityData, UIMessage } from "@avenire/ai/message-types";
import { Button } from "@avenire/ui/components/button";
import { CaretDown as ChevronDown } from "@phosphor-icons/react";
import {
  DefaultChatTransport,
  type FileUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { getChatErrorMessage } from "@/lib/chat-errors";
import {
  CHAT_NAME_UPDATED_EVENT,
  CHAT_STREAM_FINISHED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatNameUpdatedDetail,
  type ChatStreamStatusDetail,
  rememberChatStreamStatus,
} from "@/lib/chat-events";
import { normalizeMediaType } from "@/lib/media-type";
import { emitPetNotification } from "@/lib/pet-preferences";
import { type Attachment, createLocalAttachment } from "./attachment";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";
import { useChatScroll } from "./use-chat-scroll";

interface ChatProps {
  id: string;
  initialMessages: UIMessage[];
  initialPrompt?: string | null;
  isReadonly: boolean;
  selectedModel: string;
  userName?: string;
  workspaceUuid: string;
}

type SendMessageInput = Parameters<UseChatHelpers<UIMessage>["sendMessage"]>[0];
type SendMessageOptions = Parameters<
  UseChatHelpers<UIMessage>["sendMessage"]
>[1];
const ACTIVE_REPLY_MIN_HEIGHT = "calc(100dvh - 250px)";
const EMPTY_COMPOSER_SHELL_CLASSNAME = "mx-auto mb-3 w-full max-w-3xl md:mb-3";
const FLOATING_COMPOSER_SHELL_CLASSNAME =
  "mx-auto mb-[calc(0.6rem+env(safe-area-inset-bottom))] w-full max-w-3xl md:mb-3";
const MOBILE_CHAT_COMPOSER_OPEN_EVENT = "avenire:mobile-chat-composer-open";
const MOBILE_CHAT_COMPOSER_STATE_EVENT = "avenire:mobile-chat-composer-state";

export function Chat({
  id,
  initialMessages,
  initialPrompt,
  selectedModel,
  isReadonly,
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
  const activeSelectedModel = turboEnabled ? "apex-turbo" : selectedModel;
  const lastCompletedMessageIdRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const initialMessagesCountRef = useRef(initialMessages.length);
  const hasPushedNewChatUrlRef = useRef(id !== "new");
  const autoPromptSentRef = useRef<string | null>(null);
  const MAX_FILES = 3;

  const handleError = useCallback((error: Error) => {
    toast.error(getChatErrorMessage(error), {
      description: "If this issue persists, please contact support.",
      duration: 5000,
    });
    emitPetNotification({
      message: "Chat failed",
      tone: "failure",
      animation: "failed",
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
    messages,
    setMessages,
    sendMessage: append,
    stop,
    status,
    resumeStream,
    error,
  } = useChat<UIMessage>({
    id: chatId,
    transport,
    experimental_throttle: 100,
    messages: initialMessages,
    onError: handleError,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onData: (dataPart) => {
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
  });
  const displayedMessages = useMemo(() => {
    const lastMessage = messages.at(-1);
    if (!(status === "submitted" && lastMessage?.role === "user")) {
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
  }, [messages, status]);
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
    if (id === "new") {
      if (hasPushedNewChatUrlRef.current) {
        hasPushedNewChatUrlRef.current = false;
        setChatId(crypto.randomUUID());
        setMessages([]);
      }
      return;
    }

    hasPushedNewChatUrlRef.current = true;
    if (id !== chatId) {
      setChatId(id);
    }
  }, [chatId, id, setMessages]);

  const sendMessage = useCallback(
    async (message: SendMessageInput, options?: SendMessageOptions) => {
      return append(message, options);
    },
    [append]
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
    const canResumeExistingStream =
      id !== "new" &&
      initialMessagesCountRef.current > 0 &&
      messages.at(-1)?.role === "user" &&
      status === "ready";
    if (!canResumeExistingStream) {
      return;
    }
    resumeStream().catch(() => undefined);
  }, [id, messages, resumeStream, status]);

  useEffect(() => {
    if (id === "new" || initialMessagesCountRef.current === 0) {
      return;
    }

    const resumeExistingStream = () => {
      if (document.visibilityState === "hidden" || status !== "ready") {
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
  }, [id, resumeStream, status]);

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
    const detail = { chatId, status };
    rememberChatStreamStatus(detail);
    window.dispatchEvent(
      new CustomEvent<ChatStreamStatusDetail>(CHAT_STREAM_STATUS_EVENT, {
        detail,
      })
    );
    if (status === "submitted") {
      emitPetNotification({
        message: "Thinking",
        tone: "working",
        animation: "waiting",
        durationMs: 1800,
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
      message: "Chat complete",
      tone: "success",
      animation: "waving",
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
          type: "file",
          filename: part.filename,
          mediaType: part.mediaType,
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

  const handleSubmit = async (inputValue: string, files: Attachment[]) => {
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

    if (localFileParts.length > 0 || workspaceFileParts.length > 0) {
      await sendMessage({
        text: inputValue,
        files: [...localFileParts, ...workspaceFileParts],
      });
    } else {
      await sendMessage({ text: inputValue });
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
    !hasConversationSurface && status !== "submitted" && status !== "streaming";
  const isTransitioningFromNewChat =
    chatId === "new" &&
    !hasConversationSurface &&
    (status === "submitted" || status === "streaming");
  const shouldUseCenteredComposerLayout =
    isEmptyState || isTransitioningFromNewChat;
  const showBottomComposer = !isMobile || mobileComposerOpen;
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
        status={status}
        stop={handleStop}
        turboEnabled={turboEnabled}
        workspaceUuid={workspaceUuid}
      />
    </div>
  );

  useEffect(() => {
    const openComposer = () => {
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
      });
    };

    window.addEventListener(MOBILE_CHAT_COMPOSER_OPEN_EVENT, openComposer);
    return () => {
      window.removeEventListener(MOBILE_CHAT_COMPOSER_OPEN_EVENT, openComposer);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(MOBILE_CHAT_COMPOSER_STATE_EVENT, {
        detail: { open: mobileComposerOpen },
      })
    );
  }, [isMobile, mobileComposerOpen]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }
    setMobileComposerOpen((open) => (chatId && open ? false : open));
  }, [chatId, isMobile]);

  return (
    <div
      {...getRootProps()}
      className="relative flex h-full min-h-0 flex-col bg-[#fdfdfd] px-4 dark:bg-[#141414]"
    >
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {hasConversationSurface && (
          <Messages
            activeReplyMessageId={activeReplyMessageId}
            agentActivity={agentActivity}
            bottomSpacerHeight={bottomSpacerHeight}
            chatId={chatId}
            error={error}
            isReadonly={isReadonly}
            messages={displayedMessages}
            messagesContainerRef={messagesContainerRef}
            messagesContentRef={messagesContentRef}
            onRegenerate={regenerateFromMessage}
            replyMinHeight={ACTIVE_REPLY_MIN_HEIGHT}
            sendMessage={sendMessage}
            status={status}
            workspaceUuid={workspaceUuid}
          />
        )}

        {!isReadonly && (
          <AnimatePresence initial={false} mode="popLayout">
            {shouldUseCenteredComposerLayout ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center"
                exit={{ opacity: 0, y: 16 }}
                initial={{ opacity: 0, y: 24 }}
                key="composer-center"
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <div className="relative flex w-full max-w-3xl flex-col items-center justify-center">
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
                className="relative z-30 w-full"
                exit={{ opacity: 0, y: 12 }}
                initial={{ opacity: 0, y: 20 }}
                key="composer-bottom"
                onBlur={(event) => {
                  if (!isMobile) {
                    return;
                  }
                  const form = event.currentTarget;
                  window.setTimeout(() => {
                    if (form.contains(document.activeElement)) {
                      return;
                    }
                    setMobileComposerOpen(false);
                  }, 80);
                }}
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
