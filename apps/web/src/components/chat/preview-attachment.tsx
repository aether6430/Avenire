"use client";

import dynamic from "next/dynamic";
import type { PreviewAttachmentShellProps } from "./preview-attachment-shell-props";

// ─── Pan/Pinch Image Viewer ───────────────────────────────────────────────────

const MIN_SCALE = 1;
const PreviewAttachmentDefaultShell = dynamic<PreviewAttachmentShellProps>(
  () =>
    import("@/components/chat/preview-attachment-default-shell").then(
      (module) => module.PreviewAttachmentDefaultShell
    ),
  { ssr: false }
);

const PreviewAttachmentComposerShell = dynamic<PreviewAttachmentShellProps>(
  () =>
    import("@/components/chat/preview-attachment-composer-shell").then(
      (module) => module.PreviewAttachmentComposerShell
    ),
  { ssr: false }
);

const PreviewAttachmentTagShell = dynamic<PreviewAttachmentShellProps>(
  () =>
    import("@/components/chat/preview-attachment-tag-shell").then(
      (module) => module.PreviewAttachmentTagShell
    ),
  { ssr: false }
);

export function PreviewAttachment({
  attachment,
  onRemove,
  variant = "default",
  workspaceUuid,
}: PreviewAttachmentShellProps & {
  variant?: "composer" | "default" | "tag";
}) {
  const shellProps = {
    attachment,
    onRemove,
    workspaceUuid,
  };

  if (variant === "composer") {
    return <PreviewAttachmentComposerShell {...shellProps} />;
  }

  if (variant === "tag") {
    return <PreviewAttachmentTagShell {...shellProps} />;
  }

  return <PreviewAttachmentDefaultShell {...shellProps} />;
}
