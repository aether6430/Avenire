"use client";

import type { PreviewAttachmentShellProps } from "@/components/chat/preview-attachment-shell-props";
import { PreviewAttachmentComposer } from "@/components/chat/preview-attachment-variants";
import { usePreviewAttachment } from "@/components/chat/use-preview-attachment";

export function PreviewAttachmentComposerShell(
  props: PreviewAttachmentShellProps
) {
  const runtime = usePreviewAttachment({
    attachment: props.attachment,
    workspaceUuid: props.workspaceUuid,
  });

  return <PreviewAttachmentComposer {...props} runtime={runtime} />;
}
