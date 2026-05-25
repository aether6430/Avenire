"use client";

import dynamic from "next/dynamic";
import type { Attachment } from "@/components/chat/attachment";
import {
  type PreviewAttachmentRuntime,
  usePreviewAttachment,
} from "./use-preview-attachment";

interface PreviewAttachmentShellProps {
  attachment: Partial<Attachment>;
  onRemove?: (attachmentId: string) => void;
  workspaceUuid?: string;
}

type PreviewAttachmentVariantProps = PreviewAttachmentShellProps & {
  runtime: PreviewAttachmentRuntime;
};

const PreviewAttachmentDefault = dynamic<PreviewAttachmentVariantProps>(
  () =>
    import("@/components/chat/preview-attachment-variants").then(
      (module) => module.PreviewAttachmentDefault
    ),
  { ssr: false }
);

const PreviewAttachmentComposer = dynamic<PreviewAttachmentVariantProps>(
  () =>
    import("@/components/chat/preview-attachment-variants").then(
      (module) => module.PreviewAttachmentComposer
    ),
  { ssr: false }
);

const PreviewAttachmentTag = dynamic<PreviewAttachmentVariantProps>(
  () =>
    import("@/components/chat/preview-attachment-variants").then(
      (module) => module.PreviewAttachmentTag
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
  const runtime = usePreviewAttachment({
    attachment,
    workspaceUuid,
  });
  const shellProps = {
    attachment,
    onRemove,
    runtime,
    workspaceUuid,
  };

  if (variant === "composer") {
    return <PreviewAttachmentComposer {...shellProps} />;
  }

  if (variant === "tag") {
    return <PreviewAttachmentTag {...shellProps} />;
  }

  return <PreviewAttachmentDefault {...shellProps} />;
}
