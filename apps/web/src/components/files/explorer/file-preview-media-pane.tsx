"use client";

import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { FileMediaPlayer } from "@avenire/ui/media";
import { FileText } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import type { FilePreviewMediaModel } from "@/components/files/explorer/file-preview-media-model";
import { PanPinchImageViewer } from "../pan-pinch-image-viewer";

const PDFViewer = dynamic(() => import("@/components/files/pdf-viewer"), {
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-xl border border-border/70 bg-card text-sm">
      <div className="inline-flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-4" />
        Loading PDF...
      </div>
    </div>
  ),
  ssr: false,
});

interface FilePreviewMediaPaneProps {
  fallbackHighlightText: string;
  fileName: string;
  model: FilePreviewMediaModel;
  onAudioError: () => void;
  onVideoError: () => void;
  pdfInvertColors: boolean;
}

export function FilePreviewMediaPane({
  fallbackHighlightText,
  fileName,
  model,
  onAudioError,
  onVideoError,
  pdfInvertColors,
}: FilePreviewMediaPaneProps) {
  switch (model.kind) {
    case "pdf":
      return (
        <div className="min-h-0 flex-1 overflow-hidden">
          <PDFViewer
            className="h-full min-h-0 rounded-none border-0 sm:rounded-xl sm:border sm:border-border/70"
            fallbackHighlightText={fallbackHighlightText}
            highlightPage={model.pdfViewer.highlightPage}
            highlightText={model.pdfViewer.highlightText}
            invertColors={pdfInvertColors}
            source={model.pdfViewer.source}
          />
        </div>
      );
    case "video":
      return (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full items-center justify-center p-0 sm:p-4">
            <FileMediaPlayer
              activeRangeIndex={model.videoPlayer.activeRangeIndex}
              captionsSrc={model.videoPlayer.captionsSrc}
              kind="video"
              name={fileName}
              onError={onVideoError}
              openedCached={model.videoPlayer.openedCached}
              playbackSource={model.videoPlayer.playbackSource}
              posterUrl={model.videoPlayer.posterUrl}
              retrievalRanges={model.videoPlayer.retrievalRanges}
              seekToMs={model.videoPlayer.seekToMs}
            />
          </div>
        </div>
      );
    case "audio":
      return (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full items-center justify-center p-0 sm:p-4">
            <FileMediaPlayer
              kind="audio"
              name={fileName}
              onError={onAudioError}
              openedCached={model.audioPlayer.openedCached}
              playbackSource={model.audioPlayer.playbackSource}
            />
          </div>
        </div>
      );
    case "image":
      return (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1360px] flex-col gap-3 p-0 sm:p-4">
            <div className="w-full">
              <PanPinchImageViewer alt={fileName} src={model.imageViewer.src} />
            </div>
          </div>
        </div>
      );
    case "fallback":
      return (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-[55vh] flex-col items-center justify-center gap-3 rounded-none border-0 bg-card p-0 text-center sm:rounded-md sm:border sm:border-border/70 sm:p-4">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-xs">
              In-app preview is unavailable for this file type.
            </p>
            <Button
              onClick={() =>
                window.open(
                  model.fallbackViewer.openUrl,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Open in new tab
            </Button>
          </div>
        </div>
      );
  }
}
