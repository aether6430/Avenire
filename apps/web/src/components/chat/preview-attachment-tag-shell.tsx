"use client";

import type { PreviewAttachmentShellProps } from "@/components/chat/preview-attachment-shell-props";
import { PreviewAttachmentTag } from "@/components/chat/preview-attachment-variants";
import { usePreviewAttachment } from "@/components/chat/use-preview-attachment";

export function PreviewAttachmentTagShell(props: PreviewAttachmentShellProps) {
  const runtime = usePreviewAttachment({
    attachment: props.attachment,
    workspaceUuid: props.workspaceUuid,
  });

  return <PreviewAttachmentTag {...props} runtime={runtime} />;
}
