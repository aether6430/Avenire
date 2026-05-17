"use client";

import Image from "next/image";
import type { PreviewAttachmentCapabilities } from "@/components/chat/preview-attachment-model";
import type { PreviewAttachmentRuntime } from "@/components/chat/use-preview-attachment";
import { InlineVideoPreview } from "./preview-attachment-modal";

export function PreviewAttachmentHoverPreview({
  capabilities,
  contentType,
  name,
  playbackDescriptor,
  status,
  textPreview,
  url,
}: {
  capabilities: PreviewAttachmentCapabilities;
  contentType?: string;
  name?: string;
  playbackDescriptor: PreviewAttachmentRuntime["playbackDescriptor"];
  status?: string;
  textPreview: string | null;
  url?: string;
}) {
  if (capabilities.isImagePreview && url) {
    return (
      <div className="max-w-xs">
        <Image
          alt={name ?? "Preview"}
          className="max-h-48 max-w-full rounded-md object-cover"
          height={192}
          src={url}
          unoptimized
          width={320}
        />
      </div>
    );
  }

  if (capabilities.isVideoPreview && url && status === "completed") {
    return (
      <div className="max-w-xs">
        {playbackDescriptor ? (
          <InlineVideoPreview
            autoPlay
            className="max-h-48 max-w-full rounded-md"
            playbackSource={playbackDescriptor.preferredSource}
            posterUrl={playbackDescriptor.posterUrl}
          />
        ) : (
          <video className="max-h-48 max-w-full rounded-md" controls src={url}>
            <track kind="captions" />
          </video>
        )}
      </div>
    );
  }

  if (capabilities.isCodePreview && textPreview) {
    return (
      <div className="max-w-xs rounded-md bg-muted p-3">
        <pre className="whitespace-pre-wrap font-mono text-xs">
          {textPreview.substring(0, 300) +
            (textPreview.length > 300 ? "..." : "")}
        </pre>
      </div>
    );
  }

  return null;
}
