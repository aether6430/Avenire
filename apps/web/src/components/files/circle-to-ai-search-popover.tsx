"use client";

import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { cn } from "@avenire/ui/lib/utils";
import {
  SpinnerGap as Loader2,
  PaperPlaneRight as SendHorizontal,
  MagicWand as WandSparkles,
  X,
} from "@phosphor-icons/react";
import { DotsSixVertical as GripVertical } from "@phosphor-icons/react/DotsSixVertical";
import type { UIMessage } from "ai";
import { motion } from "motion/react";
import type { PointerEventHandler, RefObject } from "react";
import { Markdown } from "@/components/chat/markdown";
import { getMessageTextContent } from "./circle-to-ai-search-model";

interface CircleToAiSearchPopoverProps {
  clearSelection: () => void;
  draft: string;
  error: string | null;
  expandedHeight: number;
  fileName: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isExpanded: boolean;
  isLoading: boolean;
  loadingText: string;
  messages: UIMessage[];
  onDraftChange: (value: string) => void;
  onDraftSubmit: () => void;
  onDragEnd: PointerEventHandler<HTMLDivElement>;
  onDragMove: PointerEventHandler<HTMLDivElement>;
  onDragStart: PointerEventHandler<HTMLDivElement>;
  showTranscript: boolean;
  viewportPosition: { x: number; y: number };
  workspaceUuid?: string;
}

export function CircleToAiSearchPopover({
  clearSelection,
  draft,
  error,
  expandedHeight,
  fileName,
  inputRef,
  isExpanded,
  isLoading,
  loadingText,
  messages,
  onDraftChange,
  onDraftSubmit,
  onDragEnd,
  onDragMove,
  onDragStart,
  showTranscript,
  viewportPosition,
  workspaceUuid,
}: CircleToAiSearchPopoverProps) {
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const latestAssistantText = getMessageTextContent(latestAssistantMessage);
  const hasStartedConversation = messages.length > 0;
  const canSend = draft.trim().length > 0 && !isLoading;

  return (
    <motion.div
      animate={{ height: isExpanded ? expandedHeight : 136, opacity: 1 }}
      className="fixed z-40 flex w-[min(24rem,calc(100%-1rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      initial={{ opacity: 0, height: 0 }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      style={{
        left: viewportPosition.x,
        top: viewportPosition.y,
      }}
      transition={{ damping: 28, stiffness: 320, type: "spring" }}
    >
      <div className="flex items-center gap-2 border-border/70 border-b bg-card px-3 py-2">
        <div
          className="flex cursor-move items-center gap-2 text-muted-foreground"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
        >
          <GripVertical className="size-4" />
          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <WandSparkles className="size-4" />
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-[0.22em]">
            Apollo
          </div>
          <div className="truncate text-foreground text-xs">{fileName}</div>
        </div>
        <Button
          className="size-7 rounded-lg"
          onClick={clearSelection}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {showTranscript ? (
          <ScrollArea className="min-h-0 flex-1 bg-card px-3 py-3">
            <div className="space-y-2 pr-2">
              {messages.length === 0 && !error ? (
                <div className="rounded-lg border border-border/70 border-dashed bg-background px-3 py-4 text-muted-foreground text-sm">
                  Ask Apollo a question about the selection.
                </div>
              ) : null}

              {messages.map((message) => {
                const text = getMessageTextContent(message);
                if (!text) {
                  return null;
                }

                const isUser = message.role === "user";
                return (
                  <div
                    className={cn(
                      "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-6",
                      isUser
                        ? "ml-auto bg-secondary text-secondary-foreground"
                        : "border border-border/70 bg-background text-foreground shadow-sm"
                    )}
                    key={message.id}
                  >
                    <Markdown
                      className={cn(
                        "max-w-full break-words",
                        isUser ? "text-secondary-foreground" : "text-foreground"
                      )}
                      content={text}
                      id={`${message.id}-${message.role}`}
                      textSize="small"
                      workspaceUuid={workspaceUuid}
                    />
                  </div>
                );
              })}

              {isLoading ? (
                <div className="space-y-2 rounded-lg border border-border/70 bg-background px-3 py-2 shadow-sm">
                  <div className="shimmer-bar h-3 w-5/6 rounded-full bg-muted" />
                  <div className="shimmer-bar h-3 w-4/5 rounded-full bg-muted" />
                </div>
              ) : null}

              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
                  {error}
                </div>
              ) : null}

              {latestAssistantText && !isLoading ? (
                <div className="text-muted-foreground text-xs">
                  Latest answer ready. Ask Apollo a follow-up below.
                </div>
              ) : null}

              {!latestAssistantText && isLoading ? (
                <div className="text-muted-foreground text-xs">
                  {loadingText}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        ) : null}

        <div className="border-border/70 border-t bg-card p-3">
          <div className="flex items-end gap-2">
            <Input
              autoComplete="off"
              className="h-9 flex-1 rounded-lg bg-background"
              onChange={(event) => onDraftChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) {
                  return;
                }
                event.preventDefault();
                onDraftSubmit();
              }}
              placeholder={
                hasStartedConversation
                  ? "Ask a follow-up..."
                  : "Ask about the selection..."
              }
              ref={inputRef}
              value={draft}
            />
            <Button
              className="shrink-0 rounded-lg"
              disabled={!canSend}
              onClick={onDraftSubmit}
              size="sm"
              type="button"
            >
              <SendHorizontal className="mr-1 size-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
