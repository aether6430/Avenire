import { describe, expect, it } from "vitest";
import {
  buildFilePreviewPanelDerivedState,
  getActiveFileLinkSourceUrl,
} from "@/components/files/explorer/file-preview-panel-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspaceSearchResult } from "@/components/files/search-model";

describe("file preview panel model", () => {
  it("prefers markdown link sources and normalizes page icons", () => {
    const activeFile: FileRecord = {
      createdAt: "2026-05-17T00:00:00.000Z",
      folderId: "folder-1",
      id: "file-1",
      metadata: {
        link: {
          sourceUrl: "https://example.com/source",
        },
      },
      mimeType: "text/markdown",
      name: "Note.md",
      page: {
        bannerUrl: null,
        icon: "   verylongiconvalue   ",
        properties: {},
      },
      sizeBytes: 128,
      storageUrl: "https://cdn.example.com/file-1.md",
      videoDelivery: null,
    };

    const derived = buildFilePreviewPanelDerivedState({
      activeFile,
      activeFileIsMarkdown: true,
      activeRetrievalChunkId: null,
      mediaStreamFailed: false,
      query: "vector",
      retrievalResults: [],
      workspaceUuid: "workspace-1",
    });

    expect(getActiveFileLinkSourceUrl(activeFile)).toBe(
      "https://example.com/source"
    );
    expect(derived.activeCustomIcon).toBe("verylong");
    expect(derived.activeFileSourceUrl).toBe("https://example.com/source");
    expect(derived.isMarkdown).toBe(true);
  });

  it("builds retrieval and captions state for a video preview", () => {
    const activeFile: FileRecord = {
      createdAt: "2026-05-17T00:00:00.000Z",
      folderId: "folder-2",
      id: "file-2",
      mimeType: "video/mp4",
      name: "Lecture.mp4",
      sizeBytes: 4096,
      storageUrl: "https://cdn.example.com/file-2.mp4",
      videoDelivery: null,
    };
    const retrievalResults: WorkspaceSearchResult[] = [
      {
        fileId: "file-2",
        id: "result-1",
        page: null,
        score: 0.8,
        snippet: "Explain flux",
        startMs: 12_000,
        title: "Lecture",
        type: "file",
      },
    ];

    const derived = buildFilePreviewPanelDerivedState({
      activeFile,
      activeFileIsMarkdown: false,
      activeRetrievalChunkId: null,
      mediaStreamFailed: false,
      query: "flux",
      retrievalResults,
      workspaceUuid: "workspace-2",
    });

    expect(derived.activeMediaStreamUrl).toBe(
      "/api/workspaces/workspace-2/files/file-2/stream"
    );
    expect(derived.activeVideoCaptionsSrc).toBe(
      "/api/workspaces/workspace-2/files/file-2/captions.vtt"
    );
    expect(derived.isVideo).toBe(true);
    expect(derived.retrievalModel.videoSeekToMs).toBe(12_000);
    expect(derived.activePlaybackDescriptor?.preferredSource).toBeTruthy();
  });
});
