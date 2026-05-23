import type { MediaPlaybackSource } from "@avenire/ui/media";
import type { FilePreviewRetrievalModel } from "@/components/files/explorer/file-preview-retrieval-model";
import type { FileRecord } from "@/components/files/explorer/shared";

interface BuildFilePreviewMediaModelOptions {
  activeAudioPlaybackSource: MediaPlaybackSource;
  activeFile: FileRecord;
  activeFileSourceUrl: string;
  activeVideoCaptionsSrc?: string;
  activeVideoPlaybackSource: MediaPlaybackSource;
  audioOpenedCached: boolean;
  isAudio: boolean;
  isAudioLoadFailed: boolean;
  isImage: boolean;
  isPdf: boolean;
  isVideo: boolean;
  posterUrl: string | null;
  retrievalModel: FilePreviewRetrievalModel;
  shouldUsePreferredVideoSource: boolean;
  videoLoadFailed: boolean;
}

export type FilePreviewMediaModel =
  | {
      kind: "pdf";
      pdfViewer: {
        highlightPage: number | null;
        highlightText: string;
        source: string;
      };
    }
  | {
      kind: "video";
      videoPlayer: {
        activeRangeIndex: number | null;
        captionsSrc?: string;
        openedCached: boolean;
        playbackSource: MediaPlaybackSource;
        posterUrl: string | null;
        retrievalRanges: Array<{
          endMs: number | undefined;
          startMs: number;
        }>;
        seekToMs: number | null;
      };
    }
  | {
      kind: "audio";
      audioPlayer: {
        openedCached: boolean;
        playbackSource: MediaPlaybackSource;
      };
    }
  | {
      kind: "image";
      imageViewer: {
        src: string;
      };
    }
  | {
      kind: "fallback";
      fallbackViewer: {
        openUrl: string;
      };
    };

export function buildFilePreviewMediaModel({
  activeAudioPlaybackSource,
  activeFile,
  activeFileSourceUrl,
  activeVideoCaptionsSrc,
  activeVideoPlaybackSource,
  audioOpenedCached,
  isAudio,
  isAudioLoadFailed,
  isImage,
  isPdf,
  isVideo,
  posterUrl,
  retrievalModel,
  shouldUsePreferredVideoSource,
  videoLoadFailed,
}: BuildFilePreviewMediaModelOptions): FilePreviewMediaModel {
  if (isPdf) {
    return {
      kind: "pdf",
      pdfViewer: {
        highlightPage: retrievalModel.pdfHighlightPage,
        highlightText: retrievalModel.pdfHighlightText,
        source: activeFile.storageUrl || activeFileSourceUrl,
      },
    };
  }

  if (isVideo && !videoLoadFailed) {
    return {
      kind: "video",
      videoPlayer: {
        activeRangeIndex: retrievalModel.activeRangeIndex,
        captionsSrc: activeVideoCaptionsSrc,
        openedCached: shouldUsePreferredVideoSource,
        playbackSource: activeVideoPlaybackSource,
        posterUrl,
        retrievalRanges: retrievalModel.videoRetrievalRanges,
        seekToMs: retrievalModel.videoSeekToMs,
      },
    };
  }

  if (isAudio && !isAudioLoadFailed) {
    return {
      audioPlayer: {
        openedCached: audioOpenedCached,
        playbackSource: activeAudioPlaybackSource,
      },
      kind: "audio",
    };
  }

  if (isImage) {
    return {
      imageViewer: {
        src: activeFileSourceUrl,
      },
      kind: "image",
    };
  }

  return {
    fallbackViewer: {
      openUrl: activeFile.storageUrl || activeFileSourceUrl,
    },
    kind: "fallback",
  };
}
