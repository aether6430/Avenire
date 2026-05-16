"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { Button } from "@avenire/ui/components/button";
import { CaretDown as ChevronDown } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { Attachment } from "@/components/chat/attachment";
import {
  ACTIVE_REPLY_MIN_HEIGHT,
  EMPTY_COMPOSER_SHELL_CLASSNAME,
  FLOATING_COMPOSER_SHELL_CLASSNAME,
} from "@/components/chat/chat-model";
import { Messages } from "@/components/chat/messages";
import { MultimodalInput } from "@/components/chat/multimodal-input";
import { Overview } from "@/components/chat/overview";

export function ChatSurface({
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
  isReadonly,
  layoutState,
  messagesContainerRef,
  messagesContentRef,
  reenableAutoScroll,
  regenerateFromMessage,
  sendMessage,
  setAttachments,
  setInput,
  status,
  title,
  userName,
  workspaceUuid,
}: {
  activeReplyMessageId: string | null;
  agentActivity: unknown;
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
  isReadonly: boolean;
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
  sendMessage: (message: any, options?: any) => Promise<any>;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  status: "submitted" | "streaming" | "ready" | "error";
  title: string;
  userName?: string;
  workspaceUuid: string;
}) {
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
        setAttachments={setAttachments}
        setInput={setInput}
        status={status}
        stop={handleStop}
        workspaceUuid={workspaceUuid}
      />
    </div>
  );

  return (
    <div
      {...getRootProps()}
      className="relative flex h-full min-h-0 flex-col bg-[#fdfdfd] px-4 dark:bg-[#141414]"
    >
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {layoutState.hasConversationSurface && (
          <Messages
            activeReplyMessageId={activeReplyMessageId}
            agentActivity={agentActivity as any}
            bottomSpacerHeight={bottomSpacerHeight}
            chatId={chatId}
            error={error}
            isReadonly={isReadonly}
            messages={displayedMessages}
            messagesContainerRef={messagesContainerRef}
            messagesContentRef={messagesContentRef}
            onRegenerate={regenerateFromMessage}
            replyMinHeight={ACTIVE_REPLY_MIN_HEIGHT}
            sendMessage={sendMessage as any}
            status={status}
            workspaceUuid={workspaceUuid}
          />
        )}

        {!isReadonly && (
          <AnimatePresence initial={false} mode="popLayout">
            {layoutState.shouldUseCenteredComposerLayout ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center"
                exit={{ opacity: 0, y: 16 }}
                initial={{ opacity: 0, y: 24 }}
                key="composer-center"
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <div className="relative flex w-full max-w-3xl flex-col items-center justify-center">
                  {layoutState.isEmptyState ? (
                    <div className="pointer-events-none absolute bottom-[calc(100%+2.25rem)] w-full sm:bottom-[calc(100%+3rem)]">
                      <Overview title={title} userName={userName} />
                    </div>
                  ) : null}
                  {inputCard(true)}
                </div>
              </motion.div>
            ) : (
              <motion.form
                animate={{ opacity: 1, y: 0 }}
                className="relative z-30 w-full"
                exit={{ opacity: 0, y: 12 }}
                initial={{ opacity: 0, y: 20 }}
                key="composer-bottom"
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <motion.div
                  animate={isAutoScrollEnabled ? "hidden" : "visible"}
                  className="pointer-events-none absolute right-0 bottom-[calc(100%+0.75rem)] z-20 flex justify-end"
                  initial="hidden"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <Button
                    className="pointer-events-auto h-9 min-w-9 rounded-full border border-[#e5e5e5] bg-[#f8f8f8] px-2.5 sm:h-10 sm:min-w-10 sm:px-3 dark:border-[#2a2a2a] dark:bg-[#212121]"
                    onClick={() => reenableAutoScroll("smooth")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </motion.div>
                {inputCard(false)}
              </motion.form>
            )}
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
                You can upload up to 3 files
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
