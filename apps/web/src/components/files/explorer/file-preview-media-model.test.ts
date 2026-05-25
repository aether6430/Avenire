import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFilePreviewMediaModel } from "@/components/files/explorer/file-preview-media-model";
import type { FileRecord } from "@/components/files/explorer/shared";

type BuildMediaModelOptions = Parameters<typeof buildFilePreviewMediaModel>[0];

const baseFile = {
  createdAt: null,
  folderId: "folder-1",
  id: "file-1",
  isIngested: true,
  metadata: null,
  mimeType: "application/pdf",
  name: "doc.pdf",
  readOnly: false,
  sizeBytes: 1024,
  storageUrl: "https://cdn.example.com/doc.pdf",
  updatedAt: null,
  uploadedBy: null,
  videoDelivery: null,
} as unknown as FileRecord;

const baseRetrievalModel = {
  activeFileResults: [],
  activeRangeIndex: null,
  activeResult: null,
  pdfHighlightPage: null,
  pdfHighlightText: "",
  videoRetrievalRanges: [],
  videoSeekToMs: null,
};

const pdfViewerFile = path.resolve(import.meta.dirname, "../pdf-viewer.tsx");

function buildFile(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    ...baseFile,
    ...overrides,
  } as FileRecord;
}

function createMediaModel(
  overrides: Omit<Partial<BuildMediaModelOptions>, "retrievalModel"> & {
    retrievalModel?: Partial<BuildMediaModelOptions["retrievalModel"]>;
  } = {}
) {
  const { retrievalModel: retrievalOverrides, ...restOverrides } = overrides;
  const retrievalModel: BuildMediaModelOptions["retrievalModel"] = {
    ...baseRetrievalModel,
    ...retrievalOverrides,
  };

  return buildFilePreviewMediaModel({
    activeAudioPlaybackSource: {
      kind: "progressive",
      url: "https://cdn.example.com/audio.mp3",
    },
    activeFile: baseFile,
    activeFileSourceUrl: "https://cdn.example.com/doc.pdf",
    activeVideoPlaybackSource: {
      kind: "progressive",
      url: "https://cdn.example.com/video.mp4",
    },
    audioOpenedCached: false,
    isAudio: false,
    isAudioLoadFailed: false,
    isImage: false,
    isPdf: false,
    isVideo: false,
    posterUrl: null,
    retrievalModel,
    shouldUsePreferredVideoSource: false,
    videoLoadFailed: false,
    ...restOverrides,
  });
}

describe("File preview media model", () => {
  it("keeps the pdf viewer shell borderless and no longer resets dock inputs on resolved page or zoom changes", () => {
    const source = readFileSync(pdfViewerFile, "utf8");

    expect(source).toContain(
      '"relative flex h-[500px] w-full flex-col overflow-hidden border-0 bg-background"'
    );
    expect(source).not.toContain('useEffect(() => {\n    setPageInput("");');
    expect(source).not.toContain('useEffect(() => {\n    setZoomInput("");');
  });

  it("builds a pdf viewer model with retrieval highlights", () => {
    const model = createMediaModel({
      isPdf: true,
      retrievalModel: {
        pdfHighlightPage: 4,
        pdfHighlightText: "alpha highlight",
      },
    });

    expect(model).toEqual({
      kind: "pdf",
      pdfViewer: {
        highlightPage: 4,
        highlightText: "alpha highlight",
        source: "https://cdn.example.com/doc.pdf",
      },
    });
  });

  it("falls back from failed video/audio branches into image or fallback viewers", () => {
    const imageModel = createMediaModel({
      activeFile: buildFile({
        mimeType: "image/png",
        name: "image.png",
      }),
      activeFileSourceUrl: "https://cdn.example.com/image.png",
      isImage: true,
    });

    expect(imageModel).toEqual({
      imageViewer: {
        src: "https://cdn.example.com/image.png",
      },
      kind: "image",
    });

    const fallbackModel = createMediaModel({
      activeFile: buildFile({
        mimeType: "application/octet-stream",
        name: "archive.bin",
        storageUrl: "https://cdn.example.com/archive.bin",
      }),
      activeFileSourceUrl: "https://cdn.example.com/archive.bin",
    });

    expect(fallbackModel).toEqual({
      fallbackViewer: {
        openUrl: "https://cdn.example.com/archive.bin",
      },
      kind: "fallback",
    });
  });

  it("builds audio and video player models with playback state", () => {
    const videoModel = createMediaModel({
      activeFile: buildFile({
        mimeType: "video/mp4",
        name: "clip.mp4",
      }),
      activeFileSourceUrl: "https://cdn.example.com/clip.mp4",
      activeVideoCaptionsSrc: "/captions.vtt",
      activeVideoPlaybackSource: {
        kind: "hls",
        manifestUrl: "https://cdn.example.com/clip.m3u8",
        fallbackUrl: "https://cdn.example.com/clip.mp4",
        provider: "generic",
      },
      isVideo: true,
      posterUrl: "https://cdn.example.com/poster.jpg",
      retrievalModel: {
        activeRangeIndex: 1,
        videoRetrievalRanges: [{ endMs: 2000, startMs: 1000 }],
        videoSeekToMs: 1000,
      },
      shouldUsePreferredVideoSource: true,
    });

    expect(videoModel).toMatchObject({
      kind: "video",
      videoPlayer: {
        activeRangeIndex: 1,
        captionsSrc: "/captions.vtt",
        openedCached: true,
        posterUrl: "https://cdn.example.com/poster.jpg",
        retrievalRanges: [{ endMs: 2000, startMs: 1000 }],
        seekToMs: 1000,
      },
    });

    const audioModel = createMediaModel({
      activeFile: buildFile({
        mimeType: "audio/mpeg",
        name: "audio.mp3",
      }),
      activeFileSourceUrl: "https://cdn.example.com/audio.mp3",
      audioOpenedCached: true,
      isAudio: true,
    });

    expect(audioModel).toEqual({
      audioPlayer: {
        openedCached: true,
        playbackSource: {
          kind: "progressive",
          url: "https://cdn.example.com/audio.mp3",
        },
      },
      kind: "audio",
    });
  });
});
