"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { Spinner } from "@avenire/ui/components/spinner";
import { cn } from "@avenire/ui/lib/utils";
import {
  FileMediaPlayer,
  type MediaPlaybackSource,
  useMediaPlaybackSource,
} from "@avenire/ui/media";
import {
  FileCode as FileCode2,
  SpinnerGap as LoaderIcon,
} from "@phosphor-icons/react";
import { File } from "@phosphor-icons/react/File";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PreviewAttachmentCapabilities } from "@/components/chat/preview-attachment-model";
import type { PreviewAttachmentRuntime } from "@/components/chat/use-preview-attachment";
import { resolveCachedPlaybackSource } from "@/lib/file-preview-cache";
import { buildProgressivePlaybackSource } from "@/lib/media-playback";

const PDFViewer = dynamic(() => import("@/components/files/pdf-viewer"), {
  loading: () => (
    <div className="inline-flex items-center gap-2 p-4 text-muted-foreground text-sm">
      <Spinner className="size-4" />
      Loading PDF...
    </div>
  ),
  ssr: false,
});

const ChatPanPinchImageViewer = dynamic(
  () =>
    import("@/components/chat/chat-pan-pinch-image-viewer").then(
      (module) => module.ChatPanPinchImageViewer
    ),
  {
    loading: () => (
      <div className="inline-flex items-center gap-2 p-4 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        Loading image viewer...
      </div>
    ),
    ssr: false,
  }
);

const attachmentPreviewDialogClassName =
  "h-[100dvh] w-screen max-w-none rounded-none border-0 p-0 sm:h-[92vh] sm:w-[96vw] sm:max-w-[1200px] sm:rounded-xl sm:border lg:max-w-[1280px]";

function InlineVideoPreview({
  autoPlay = false,
  className,
  muted = true,
  playbackSource,
  posterUrl,
}: {
  autoPlay?: boolean;
  className?: string;
  muted?: boolean;
  playbackSource: MediaPlaybackSource;
  posterUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedSource, setResolvedSource] = useState(() =>
    resolveCachedPlaybackSource(playbackSource)
  );

  useMediaPlaybackSource({
    mediaRef: videoRef,
    playbackSource: resolvedSource,
  });

  useEffect(() => {
    setResolvedSource(resolveCachedPlaybackSource(playbackSource));
  }, [playbackSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!autoPlay) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const startPlayback = async () => {
      try {
        video.loop = true;
        await video.play();
      } catch {
        // Browser may require a gesture.
      }
    };
    startPlayback().catch(() => undefined);

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [autoPlay]);

  return (
    <video
      className={className}
      muted={muted}
      playsInline
      poster={posterUrl ?? undefined}
      preload={autoPlay ? "auto" : "metadata"}
      ref={videoRef}
    />
  );
}

export function PreviewAttachmentThumbnail({
  contentType,
  name,
  playbackDescriptor,
  status,
  url,
}: {
  contentType?: string;
  name?: string;
  playbackDescriptor: PreviewAttachmentRuntime["playbackDescriptor"];
  status?: string;
  url?: string;
}) {
  if (contentType?.startsWith("image") && url) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image
          alt={name ?? "An image attachment"}
          className="h-full w-full object-cover"
          height={48}
          src={url}
          unoptimized
          width={48}
        />
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-white" />
          </div>
        ) : null}
      </div>
    );
  }

  if (contentType?.startsWith("video") && url) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {playbackDescriptor?.posterUrl ? (
          <Image
            alt={name ?? "A video attachment"}
            className="h-full w-full object-cover"
            height={48}
            src={playbackDescriptor.posterUrl}
            unoptimized
            width={48}
          />
        ) : (
          <video className="h-full w-full object-cover" muted src={url} />
        )}
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
          </div>
        ) : null}
      </div>
    );
  }

  if (contentType === "application/pdf") {
    return (
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 font-semibold text-[10px] text-red-600">
        PDF
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
          </div>
        ) : null}
      </div>
    );
  }

  if (contentType?.startsWith("text/") || contentType?.includes("json")) {
    return (
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-green-200 bg-green-50">
        <FileCode2 className="h-5 w-5 text-green-700" />
        {status === "uploading" || status === "pending" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
      <File className="h-6 w-6 text-muted-foreground" />
      {status === "uploading" || status === "pending" ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
          <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
        </div>
      ) : null}
    </div>
  );
}

export function PreviewAttachmentPillIcon({ status }: { status?: string }) {
  const isBusy = status === "uploading" || status === "pending";

  return (
    <div className="relative flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
      <File className="h-4 w-4" />
      {isBusy ? (
        <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background">
          <LoaderIcon className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
        </span>
      ) : null}
    </div>
  );
}

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

function PreviewAttachmentModalContent({
  capabilities,
  contentType,
  isLoadingText,
  name,
  playbackDescriptor,
  previewUrl,
  textPreview,
}: {
  capabilities: PreviewAttachmentCapabilities;
  contentType?: string;
  isLoadingText: boolean;
  name?: string;
  playbackDescriptor: PreviewAttachmentRuntime["playbackDescriptor"];
  previewUrl: PreviewAttachmentRuntime["previewUrl"];
  textPreview: string | null;
}) {
  if (capabilities.isImagePreview && previewUrl) {
    return (
      <ChatPanPinchImageViewer alt={name ?? "Image preview"} src={previewUrl} />
    );
  }

  if (capabilities.isVideoPreview && previewUrl) {
    const resolvedPlaybackSource =
      playbackDescriptor?.preferredSource ??
      buildProgressivePlaybackSource(previewUrl, contentType);

    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-stretch justify-center bg-black">
        <FileMediaPlayer
          className="h-full w-full rounded-none border-0 bg-black shadow-none"
          kind="video"
          name={name ?? "Video attachment"}
          openedCached
          playbackSource={resolvedPlaybackSource}
          posterUrl={playbackDescriptor?.posterUrl ?? null}
        />
      </div>
    );
  }

  if (capabilities.isPdfPreview && previewUrl) {
    if (previewUrl.startsWith("blob:")) {
      return (
        <iframe
          className="h-[75vh] w-full rounded-md border"
          src={previewUrl}
          title={name ?? "PDF preview"}
        />
      );
    }

    return (
      <div className="h-[75vh]">
        <PDFViewer className="h-full w-full" source={previewUrl} />
      </div>
    );
  }

  if (capabilities.isCodePreview) {
    return (
      <div className="max-h-[70vh] overflow-auto">
        {isLoadingText ? (
          <p className="inline-flex items-center gap-2 p-4 text-muted-foreground text-sm">
            <Spinner className="size-4" />
            Loading preview...
          </p>
        ) : (
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
            {textPreview ?? "No preview available."}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="py-8 text-center">
      <File className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
      <p className="text-muted-foreground">
        Preview not available for this file type
      </p>
    </div>
  );
}

export function PreviewAttachmentModal({
  capabilities,
  contentType,
  fileSize,
  isModalOpen,
  isVideoSurface,
  name,
  onOpenChange,
  playbackDescriptor,
  previewUrl,
  status,
  textPreview,
  isLoadingText,
}: {
  capabilities: PreviewAttachmentCapabilities;
  contentType?: string;
  fileSize: string;
  isLoadingText: boolean;
  isModalOpen: boolean;
  isVideoSurface: boolean;
  name?: string;
  onOpenChange: (nextOpen: boolean) => void;
  playbackDescriptor: PreviewAttachmentRuntime["playbackDescriptor"];
  previewUrl: PreviewAttachmentRuntime["previewUrl"];
  status?: string;
  textPreview: string | null;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={isModalOpen}>
      <DialogContent className={attachmentPreviewDialogClassName}>
        <div className="flex h-full flex-col overflow-hidden bg-background sm:rounded-xl">
          <DialogHeader className="border-border/60 border-b px-4 py-4 sm:px-6">
            <DialogTitle className="flex items-center gap-2">
              <PreviewAttachmentThumbnail
                contentType={contentType}
                name={name}
                playbackDescriptor={playbackDescriptor}
                status={status}
                url={previewUrl ?? undefined}
              />
              <span className="max-w-75 truncate">{name ?? "Attachment"}</span>
              {fileSize ? (
                <span className="text-muted-foreground text-sm">
                  ({fileSize})
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <div
            className={cn(
              "min-h-0 flex-1",
              isVideoSurface ? "overflow-hidden" : "overflow-auto p-4 sm:p-6"
            )}
          >
            <PreviewAttachmentModalContent
              capabilities={capabilities}
              contentType={contentType}
              isLoadingText={isLoadingText}
              name={name}
              playbackDescriptor={playbackDescriptor}
              previewUrl={previewUrl}
              textPreview={textPreview}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
