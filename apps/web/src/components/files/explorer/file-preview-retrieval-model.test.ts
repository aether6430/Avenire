import { describe, expect, it } from "vitest";
import { buildFilePreviewRetrievalModel } from "@/components/files/explorer/file-preview-retrieval-model";

describe("File preview retrieval model", () => {
  it("selects the active file results and preferred retrieval chunk", () => {
    const model = buildFilePreviewRetrievalModel({
      activeFileId: "file-1",
      activeRetrievalChunkId: "chunk-2",
      query: "fallback query",
      retrievalResults: [
        {
          chunkId: "chunk-1",
          description: "alpha",
          fileId: "file-1",
          folderId: "folder-1",
          id: "result-1",
          page: 2,
          path: "/alpha",
          score: 0.91,
          snippet: "Alpha snippet",
          sourceType: "markdown",
          startMs: 1500,
          title: "Alpha",
          type: "file",
          workspaceUuid: "workspace-1",
        },
        {
          chunkId: "chunk-2",
          description: "beta",
          fileId: "file-1",
          folderId: "folder-1",
          highlightText: "Exact beta",
          id: "result-2",
          path: "/beta",
          score: 0.97,
          snippet: "Beta snippet",
          sourceType: "video",
          startMs: 3200,
          endMs: 4100,
          title: "Beta",
          type: "file",
          workspaceUuid: "workspace-1",
        },
        {
          chunkId: "chunk-3",
          description: "other file",
          fileId: "file-2",
          folderId: "folder-2",
          id: "result-3",
          path: "/other",
          score: 0.8,
          snippet: "Other snippet",
          sourceType: "markdown",
          title: "Other",
          type: "file",
          workspaceUuid: "workspace-1",
        },
      ],
    });

    expect(model.activeFileResults).toHaveLength(2);
    expect(model.activeResult?.chunkId).toBe("chunk-2");
    expect(model.activeRangeIndex).toBe(1);
    expect(model.pdfHighlightPage).toBeNull();
    expect(model.pdfHighlightText).toBe("Exact beta");
    expect(model.videoSeekToMs).toBe(3200);
    expect(model.videoRetrievalRanges).toEqual([
      { endMs: undefined, startMs: 1500 },
      { endMs: 4100, startMs: 3200 },
    ]);
  });

  it("falls back to the first result and query text when no exact chunk match exists", () => {
    const model = buildFilePreviewRetrievalModel({
      activeFileId: "file-9",
      activeRetrievalChunkId: "missing",
      query: "needle",
      retrievalResults: [
        {
          description: "doc",
          fileId: "file-9",
          folderId: "folder-9",
          id: "result-9",
          page: 7,
          path: "/doc",
          score: 0.7,
          snippet: "Doc snippet",
          sourceType: "pdf",
          title: "Doc",
          type: "file",
          workspaceUuid: "workspace-1",
        },
      ],
    });

    expect(model.activeResult?.id).toBe("result-9");
    expect(model.activeRangeIndex).toBeNull();
    expect(model.pdfHighlightPage).toBe(7);
    expect(model.pdfHighlightText).toBe("Doc snippet");
    expect(model.videoSeekToMs).toBeNull();
  });

  it("returns empty retrieval state when the active file has no matches", () => {
    const model = buildFilePreviewRetrievalModel({
      activeFileId: "file-empty",
      activeRetrievalChunkId: null,
      query: "plain query",
      retrievalResults: [],
    });

    expect(model.activeFileResults).toEqual([]);
    expect(model.activeResult).toBeNull();
    expect(model.activeRangeIndex).toBeNull();
    expect(model.pdfHighlightPage).toBeNull();
    expect(model.pdfHighlightText).toBe("plain query");
    expect(model.videoRetrievalRanges).toEqual([]);
    expect(model.videoSeekToMs).toBeNull();
  });
});
