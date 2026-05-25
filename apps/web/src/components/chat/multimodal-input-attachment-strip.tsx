"use client";

import { AnimatePresence, motion } from "motion/react";
import { PreviewAttachment } from "@/components/chat/preview-attachment";
import type { MultimodalInputRuntime } from "@/components/chat/use-multimodal-input";

export function MultimodalInputAttachmentStrip({
  attachments,
  runtime,
}: {
  attachments: MultimodalInputRuntime["attachments"];
  runtime: Pick<
    MultimodalInputRuntime,
    "effectiveWorkspaceUuid" | "removeAttachment"
  >;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <AnimatePresence initial={false}>
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
                onRemove={runtime.removeAttachment}
                variant="composer"
                workspaceUuid={runtime.effectiveWorkspaceUuid}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
