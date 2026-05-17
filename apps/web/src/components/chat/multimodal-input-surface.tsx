"use client";

import { MultimodalInputAttachmentStrip } from "@/components/chat/multimodal-input-attachment-strip";
import { MultimodalInputComposerControls } from "@/components/chat/multimodal-input-composer-controls";
import { MultimodalInputMentionMenu } from "@/components/chat/multimodal-input-mention-menu";
import type { MultimodalInputRuntime } from "@/components/chat/use-multimodal-input";

export function MultimodalInputSurface({
  runtime,
}: {
  runtime: MultimodalInputRuntime;
}) {
  const { attachments, canSend, fileInputRef, handleFileChange, isRunning } =
    runtime;

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
          <MultimodalInputAttachmentStrip
            attachments={attachments}
            runtime={runtime}
          />

          <div className="relative">
            <MultimodalInputMentionMenu runtime={runtime} />
            <MultimodalInputComposerControls runtime={runtime} />
          </div>
        </div>
      </div>
    </div>
  );
}
