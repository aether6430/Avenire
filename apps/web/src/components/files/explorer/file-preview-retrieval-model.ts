import type { WorkspaceSearchResult } from "@/components/files/search-model";

interface BuildFilePreviewRetrievalModelOptions {
  activeFileId: string;
  activeRetrievalChunkId: string | null;
  query: string;
  retrievalResults: WorkspaceSearchResult[];
}

export interface FilePreviewRetrievalModel {
  activeFileResults: WorkspaceSearchResult[];
  activeRangeIndex: number | null;
  activeResult: WorkspaceSearchResult | null;
  pdfHighlightPage: number | null;
  pdfHighlightText: string;
  videoRetrievalRanges: Array<{
    endMs: number | undefined;
    startMs: number;
  }>;
  videoSeekToMs: number | null;
}

export function buildFilePreviewRetrievalModel({
  activeFileId,
  activeRetrievalChunkId,
  query,
  retrievalResults,
}: BuildFilePreviewRetrievalModelOptions): FilePreviewRetrievalModel {
  const activeFileResults = retrievalResults.filter(
    (result) => (result.fileId ?? result.id) === activeFileId
  );
  const activeResult =
    activeFileResults.length === 0
      ? null
      : activeRetrievalChunkId
        ? (activeFileResults.find(
            (result) => result.chunkId === activeRetrievalChunkId
          ) ?? activeFileResults[0])
        : (activeFileResults[0] ?? null);
  const activeRangeIndex =
    activeRetrievalChunkId && activeFileResults.length > 0
      ? activeFileResults.findIndex(
          (result) => result.chunkId === activeRetrievalChunkId
        )
      : -1;

  return {
    activeFileResults,
    activeRangeIndex: activeRangeIndex >= 0 ? activeRangeIndex : null,
    activeResult,
    pdfHighlightPage: activeResult?.page ?? null,
    pdfHighlightText:
      activeResult?.highlightText ?? activeResult?.snippet ?? query,
    videoRetrievalRanges: activeFileResults
      .filter(
        (result) =>
          typeof result.startMs === "number" && Number.isFinite(result.startMs)
      )
      .map((result) => ({
        endMs: typeof result.endMs === "number" ? result.endMs : undefined,
        startMs: result.startMs as number,
      })),
    videoSeekToMs: activeResult?.startMs ?? null,
  };
}
