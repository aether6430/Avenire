"use client";

import type { PreviewAttachmentShellProps } from "@/components/chat/preview-attachment-shell-props";
import { PreviewAttachmentDefault } from "@/components/chat/preview-attachment-variants";
import { usePreviewAttachment } from "@/components/chat/use-preview-attachment";

export function PreviewAttachmentDefaultShell(
  props: PreviewAttachmentShellProps
) {
  const runtime = usePreviewAttachment({
    attachment: props.attachment,
    workspaceUuid: props.workspaceUuid,
  });

  return <PreviewAttachmentDefault {...props} runtime={runtime} />;
}
