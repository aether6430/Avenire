"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "@avenire/ai/message-types";
import { Button } from "@avenire/ui/components/button";
import { Textarea } from "@avenire/ui/components/textarea";
import { cn } from "@avenire/ui/lib/utils";
import { Microphone, Plus, Square } from "@phosphor-icons/react";
import { ArrowUpIcon } from "@phosphor-icons/react/ArrowUp";
import { Lightning } from "@phosphor-icons/react/Lightning";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import type { MultimodalInputRuntime } from "@/components/chat/use-multimodal-input";

export function MultimodalInputComposerControls({
  runtime,
}: {
  runtime: Pick<
    MultimodalInputRuntime,
    | "canSend"
    | "className"
    | "fileInputRef"
    | "handleTextareaChange"
    | "handleTextareaClick"
    | "handleTextareaKeyDown"
    | "handleTextareaPaste"
    | "handleTextareaSelect"
    | "input"
    | "isMobile"
    | "isRecording"
    | "isRunning"
    | "isTranscribing"
    | "placeholder"
    | "runSubmitForm"
    | "speechSupported"
    | "startOrStopRecording"
    | "status"
    | "stop"
    | "textareaRef"
    | "onTurboChange"
    | "turboEnabled"
  >;
}) {
  const {
    canSend,
    className,
    fileInputRef,
    handleTextareaChange,
    handleTextareaClick,
    handleTextareaKeyDown,
    handleTextareaPaste,
    handleTextareaSelect,
    input,
    isMobile,
    isRecording,
    isRunning,
    isTranscribing,
    placeholder,
    runSubmitForm,
    speechSupported,
    startOrStopRecording,
    status,
    stop,
    textareaRef,
    onTurboChange,
    turboEnabled,
  } = runtime;

  return (
    <div className="relative z-10 flex items-center gap-2.5">
      <AttachmentsButton
        onClick={() => fileInputRef.current?.click()}
        status={status}
      />

      <div className="flex min-w-0 flex-1 items-center">
        <Textarea
          autoFocus
          className={cn(
            "max-h-40 min-h-9 w-full flex-1 resize-none overflow-y-hidden border-none! bg-transparent! px-0 py-1.5 text-[#0d0d0d] text-[15px] leading-6 shadow-none! outline-none ring-0! placeholder:text-muted-foreground/65 focus-visible:border-transparent! focus-visible:ring-0! sm:text-[15px] sm:leading-6 dark:text-white [&::-webkit-scrollbar-thumb]:bg-background",
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
        <ComposerTurboButton
          disabled={isRunning}
          enabled={turboEnabled}
          onToggle={() => onTurboChange(!turboEnabled)}
        />
        {speechSupported ? (
          <ComposerVoiceButton
            isRecording={isRecording}
            isRunning={isRunning}
            isTranscribing={isTranscribing}
            onToggle={startOrStopRecording}
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
      aria-label="Add attachment"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
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
        "mr-1.5 h-9 w-9 rounded-full border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
        enabled &&
          "border-yellow-300/70 bg-yellow-100 text-yellow-900 hover:bg-yellow-100 hover:text-yellow-950 dark:border-yellow-700/70 dark:bg-yellow-500/20 dark:text-yellow-200 dark:hover:bg-yellow-500/25",
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
        className="h-[17px] w-[17px]"
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
