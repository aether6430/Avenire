"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@avenire/ui/components/tooltip";
import { cn } from "@avenire/ui/lib/utils";
import { X } from "@phosphor-icons/react";
import { File } from "@phosphor-icons/react/File";
import { motion } from "motion/react";
import type { Attachment } from "@/components/chat/attachment";
import type { PreviewAttachmentRuntime } from "@/components/chat/use-preview-attachment";
import { PreviewAttachmentHoverPreview } from "./preview-attachment-hover-preview";
import { PreviewAttachmentModal } from "./preview-attachment-modal";
import { PreviewAttachmentPillIcon } from "./preview-attachment-thumbnail";

interface PreviewAttachmentVariantProps {
  attachment: Partial<Attachment>;
  onRemove?: (attachmentId: string) => void;
  runtime: PreviewAttachmentRuntime;
}

function renderPreviewFallback({
  attachment,
  runtime,
  variant,
}: {
  attachment: Partial<Attachment>;
  runtime: PreviewAttachmentRuntime;
  variant: "composer" | "default";
}) {
  const { fileSize } = runtime;
  const { name, source } = attachment;

  if (variant === "composer") {
    return (
      <div className="max-w-xs">
        <p className="font-medium text-sm">{name ?? "Attachment"}</p>
        {fileSize || source === "workspace" ? (
          <p className="text-muted-foreground text-xs">
            {[fileSize, source === "workspace" ? "Workspace file" : null]
              .filter(Boolean)
              .join(" • ")}
          </p>
        ) : null}
      </div>
    );
  }

  return <p>Click to preview file</p>;
}

function renderModal({ attachment, runtime }: PreviewAttachmentVariantProps) {
  return (
    <PreviewAttachmentModal
      capabilities={runtime.capabilities}
      contentType={attachment.contentType}
      fileSize={runtime.fileSize}
      isLoadingText={runtime.isLoadingText}
      isModalOpen={runtime.isModalOpen}
      isVideoSurface={
        runtime.capabilities.isImagePreview ||
        runtime.capabilities.isVideoPreview
      }
      name={attachment.name}
      onOpenChange={runtime.handleModalOpenChange}
      playbackDescriptor={runtime.playbackDescriptor}
      previewUrl={runtime.previewUrl}
      status={attachment.status}
      textPreview={runtime.textPreview}
    />
  );
}

export function PreviewAttachmentComposer({
  attachment,
  onRemove,
  runtime,
}: PreviewAttachmentVariantProps) {
  const hoverPreview = (
    <PreviewAttachmentHoverPreview
      capabilities={runtime.capabilities}
      contentType={attachment.contentType}
      name={attachment.name}
      playbackDescriptor={runtime.playbackDescriptor}
      status={attachment.status}
      textPreview={runtime.textPreview}
      url={runtime.previewUrl ?? undefined}
    />
  );

  return (
    <TooltipProvider delay={280}>
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="group relative"
        exit={{ opacity: 0, scale: 0.92 }}
        initial={{ opacity: 0, scale: 0.92 }}
        layout
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={attachment.name ?? "Attachment"}
                className={cn(
                  "relative flex h-7 min-w-0 max-w-[240px] items-center gap-1.5 overflow-hidden rounded-md border border-border/80 bg-background px-2.5 pr-7 text-left transition-colors hover:bg-muted"
                )}
                onBlur={runtime.handleBlur}
                onClick={runtime.openPreview}
                onFocus={runtime.handleFocus}
                onMouseEnter={runtime.handleHoverStart}
                onMouseLeave={runtime.handleHoverEnd}
                type="button"
                variant="ghost"
              />
            }
          >
            <PreviewAttachmentPillIcon status={attachment.status} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[12px] text-foreground leading-none">
                {attachment.name ?? "Unnamed file"}
              </p>
            </div>

            {onRemove && attachment.id ? (
              <Button
                className="absolute top-1/2 right-1 z-10 h-4.5 w-4.5 -translate-y-1/2 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(attachment.id!);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            ) : null}
          </TooltipTrigger>
          <TooltipContent className="p-2" side="top">
            {hoverPreview ||
              renderPreviewFallback({
                attachment,
                runtime,
                variant: "composer",
              })}
          </TooltipContent>
        </Tooltip>
        {renderModal({ attachment, runtime })}
      </motion.div>
    </TooltipProvider>
  );
}

export function PreviewAttachmentTag({
  attachment,
  onRemove,
  runtime,
}: PreviewAttachmentVariantProps) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="group relative inline-flex max-w-full"
      exit={{ opacity: 0, scale: 0.92 }}
      initial={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.18 }}
    >
      <Button
        aria-label={attachment.name ?? "Attachment"}
        className="flex h-6 min-w-0 max-w-[240px] items-center gap-1.5 rounded-md border border-border/80 bg-muted px-2 text-foreground text-xs hover:bg-muted/90"
        onClick={runtime.openPreview}
        type="button"
        variant="ghost"
      >
        <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{attachment.name ?? "Unnamed file"}</span>
      </Button>

      {onRemove && attachment.id ? (
        <Button
          className="absolute -top-1 -right-1 z-10 h-4 w-4 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(attachment.id!);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="h-2.5 w-2.5" />
        </Button>
      ) : null}

      {renderModal({ attachment, runtime })}
    </motion.div>
  );
}

export function PreviewAttachmentDefault({
  attachment,
  onRemove,
  runtime,
}: PreviewAttachmentVariantProps) {
  const hoverPreview = (
    <PreviewAttachmentHoverPreview
      capabilities={runtime.capabilities}
      contentType={attachment.contentType}
      name={attachment.name}
      playbackDescriptor={runtime.playbackDescriptor}
      status={attachment.status}
      textPreview={runtime.textPreview}
      url={runtime.previewUrl ?? undefined}
    />
  );

  return (
    <TooltipProvider delay={280}>
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="group relative max-w-sm"
        exit={{ opacity: 0, scale: 0.8 }}
        initial={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={attachment.name ?? "Open attachment preview"}
                className={`rounded-full border border-border bg-secondary px-3 py-2 transition-colors hover:bg-muted ${
                  runtime.capabilities.canPreview ? "cursor-pointer" : ""
                }`}
                onBlur={runtime.handleBlur}
                onClick={runtime.openPreview}
                onFocus={runtime.handleFocus}
                onMouseEnter={runtime.handleHoverStart}
                onMouseLeave={runtime.handleHoverEnd}
                size="default"
                type="button"
                variant="ghost"
              />
            }
          >
            <div className="flex items-center gap-2.5">
              <div className="shrink-0">
                <PreviewAttachmentPillIcon status={attachment.status} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground text-sm leading-none">
                  {attachment.name ?? "Unnamed file"}
                </p>
                {attachment.errorMessage ? (
                  <p className="truncate text-destructive text-xs">
                    {attachment.errorMessage}
                  </p>
                ) : null}
              </div>

              {onRemove && attachment.id ? (
                <Button
                  className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(attachment.id!);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </TooltipTrigger>

          <TooltipContent className="p-2" side="top">
            {hoverPreview ||
              renderPreviewFallback({
                attachment,
                runtime,
                variant: "default",
              })}
          </TooltipContent>
        </Tooltip>

        {renderModal({ attachment, runtime })}
      </motion.div>
    </TooltipProvider>
  );
}
