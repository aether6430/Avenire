"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import { Button } from "@avenire/ui/components/button";
import {
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@avenire/ui/components/command";
import { Textarea } from "@avenire/ui/components/textarea";
import { cn } from "@avenire/ui/lib/utils";
import {
  FileTextIcon,
  Microphone,
  PaperclipIcon,
  Square,
} from "@phosphor-icons/react";
import { ArrowUpIcon } from "@phosphor-icons/react/ArrowUp";
import { Command } from "@phosphor-icons/react/Command";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import type { MultimodalInputRuntime } from "@/components/chat/use-multimodal-input";
import { PreviewAttachment } from "./preview-attachment";

export function MultimodalInputSurface({
  runtime,
}: {
  runtime: MultimodalInputRuntime;
}) {
  const {
    attachments,
    canSend,
    className,
    effectiveWorkspaceUuid,
    fileInputRef,
    handleFileChange,
    handleMentionKeyDown,
    handleTextareaChange,
    handleTextareaClick,
    handleTextareaKeyDown,
    handleTextareaPaste,
    handleTextareaSelect,
    highlightedMentionIndex,
    input,
    isMentionMenuOpen,
    isMobile,
    isRecording,
    isRunning,
    isTranscribing,
    mentionItemRefs,
    mentionSuggestions,
    placeholder,
    removeAttachment,
    runSubmitForm,
    selectMention,
    speechSupported,
    startOrStopRecording,
    status,
    stop,
    textareaRef,
    workspaceFilesLoaded,
  } = runtime;

  return (
    <div
      className="group/composer w-full"
      data-empty={!canSend}
      data-running={isRunning}
    >
      <div className="relative flex w-full grow flex-col overflow-visible rounded-[28px] bg-[#f8f8f8] ring-1 ring-[#e5e5e5] ring-inset transition-colors duration-150 focus-within:ring-[#d7d7d7] dark:bg-[#212121] dark:ring-[#2f2f2f] dark:focus-within:ring-[#424242]">
        <input
          className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />

        <div className="relative px-3 py-2">
          <AnimatePresence initial={false}>
            {attachments.length > 0 ? (
              <motion.div
                animate={{ height: "auto", opacity: 1, y: 0 }}
                className="overflow-hidden px-0.5 pb-2.5"
                exit={{ height: 0, opacity: 0, y: -8 }}
                initial={{ height: 0, opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <motion.div
                  className="flex flex-wrap items-center gap-1 pt-1"
                  layout
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <AnimatePresence initial={false}>
                    {attachments.map((attachment) => (
                      <PreviewAttachment
                        attachment={attachment}
                        key={attachment.id}
                        onRemove={removeAttachment}
                        variant="composer"
                        workspaceUuid={effectiveWorkspaceUuid}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="relative">
            <AnimatePresence initial={false}>
              {isMentionMenuOpen ? (
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
                      <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#f8f8f8] dark:border-[#2a2a2a] dark:bg-[#212121]">
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

                    {workspaceFilesLoaded && mentionSuggestions.length === 0 ? (
                      <CommandEmpty className="px-3 py-2 text-muted-foreground/70 text-xs">
                        No matching workspace files.
                      </CommandEmpty>
                    ) : null}
                  </Command>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="relative z-10 flex items-center gap-2.5">
              <AttachmentsButton
                onClick={() => fileInputRef.current?.click()}
                status={status}
              />
              {speechSupported ? (
                <ComposerVoiceButton
                  isRecording={isRecording}
                  isRunning={isRunning}
                  isTranscribing={isTranscribing}
                  onToggle={startOrStopRecording}
                />
              ) : null}

              <div className="flex min-w-0 flex-1 items-center">
                <Textarea
                  autoFocus
                  className={cn(
                    "max-h-40 min-h-0 w-full flex-1 resize-none overflow-hidden border-none! bg-transparent! px-0 py-0.5 text-[#0d0d0d] text-[15px] leading-6 shadow-none! outline-none ring-0! placeholder:text-muted-foreground/65 focus-visible:border-transparent! focus-visible:ring-0! sm:text-[15px] sm:leading-6 dark:text-white [&::-webkit-scrollbar-thumb]:bg-background",
                    className
                  )}
                  data-testid="multimodal-input"
                  enterKeyHint={isMobile ? "enter" : "send"}
                  onChange={handleTextareaChange}
                  onClick={handleTextareaClick}
                  onKeyDown={handleTextareaKeyDown}
                  onKeyUp={handleTextareaSelect}
                  onPaste={handleTextareaPaste}
                  onSelect={handleTextareaSelect}
                  placeholder={placeholder}
                  ref={textareaRef}
                  rows={1}
                  value={input}
                />
              </div>

              <div className="flex shrink-0 items-center">
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

function PureAttachmentsButton({
  onClick,
  status,
}: {
  onClick: () => void;
  status: UseChatHelpers<UIMessage>["status"];
}) {
  return (
    <Button
      className="h-8 w-8 shrink-0 rounded-full px-0 text-muted-foreground/72 hover:text-foreground/88"
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
      <PaperclipIcon className="h-4 w-4" />
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
          "relative h-9 w-9 rounded-full border border-transparent bg-transparent px-0 text-muted-foreground/72 transition-colors duration-200 hover:bg-transparent hover:text-foreground/92",
          (isRecording || isTranscribing) && "text-foreground dark:text-white",
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
          <Microphone className="h-[17px] w-[17px]" weight="fill" />
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
        scale: isRunning ? 1.03 : canSend ? 1 : 0.96,
      }}
      className="relative h-9 w-9 shrink-0"
      transition={{ stiffness: 520, damping: 32, mass: 0.7, type: "spring" }}
    >
      <motion.span
        animate={{
          opacity: disabled ? 0.68 : 1,
        }}
        className="absolute inset-0 rounded-full bg-primary shadow-[0_10px_24px_-14px_hsl(var(--primary))]"
        transition={{ duration: 0.18, ease: "easeOut" }}
      />
      <Button
        aria-label={isRunning ? "Stop generating" : "Send message"}
        className={cn(
          "absolute inset-0 h-9 w-9 rounded-full bg-transparent text-white transition duration-200 ease-out hover:bg-transparent hover:text-white focus-visible:ring-0 dark:text-[#0d0d0d] dark:hover:bg-transparent dark:hover:text-[#0d0d0d]",
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
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Square
                className="h-[13px] w-[13px] fill-current"
                weight="fill"
              />
            </motion.span>
          ) : (
            <motion.span
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 16, scale: 0.72 }}
              initial={{ opacity: 0, rotate: -16, scale: 0.72 }}
              key="send"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <ArrowUpIcon className="h-[18px] w-[18px]" weight="bold" />
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
