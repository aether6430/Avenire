import { describe, expect, it, vi } from "vitest";
import {
  buildExplorerFilePreviewRetrievalProps,
  buildExplorerSearchBarProps,
} from "@/components/files/explorer/explorer-retrieval-props";

describe("Explorer retrieval props", () => {
  it("builds the shared search bar props for explorer retrieval/search wiring", () => {
    const handleApplyWorkspaceFilter = vi.fn();
    const handleSearch = vi.fn();

    const searchBarProps = buildExplorerSearchBarProps({
      focusSearchSignal: 3,
      handleApplyWorkspaceFilter,
      handleSearch,
      query: "neural",
      retrievalResults: [
        {
          description: "/notes/roadmap",
          fileId: "file-1",
          folderId: "folder-1",
          id: "result-1",
          path: "/notes/roadmap",
          score: 0.98,
          snippet: "Neural roadmap",
          sourceType: "markdown",
          title: "Roadmap",
          type: "file",
          workspaceUuid: "workspace-1",
        },
      ],
      searchableItems: [
        {
          description: "/notes/roadmap",
          folderId: "folder-1",
          id: "file-1",
          path: "/notes/roadmap",
          snippet: "Neural roadmap",
          title: "Roadmap",
          type: "file",
          workspaceUuid: "workspace-1",
        },
      ],
      workspaceUuid: "workspace-1",
    });

    expect(searchBarProps).toMatchObject({
      focusSignal: 3,
      initialQuery: "neural",
      maxWidth: "max-w-none",
      onApplyWorkspaceFilter: handleApplyWorkspaceFilter,
      onSearch: handleSearch,
      placeholder: "Search anything...",
      workspaceUuid: "workspace-1",
    });
    expect(searchBarProps.initialResults).toHaveLength(1);
    expect(searchBarProps.items).toHaveLength(1);
  });

  it("builds the shared preview retrieval props for file preview consumers", () => {
    const previewRetrievalProps = buildExplorerFilePreviewRetrievalProps({
      activeRetrievalChunkId: "chunk-2",
      query: "vector",
      retrievalResults: [
        {
          description: "/notes/vector",
          fileId: "file-2",
          folderId: "folder-2",
          id: "result-2",
          path: "/notes/vector",
          score: 0.88,
          snippet: "Vector search",
          sourceType: "markdown",
          title: "Vector note",
          type: "file",
          workspaceUuid: "workspace-1",
        },
      ],
    });

    expect(previewRetrievalProps).toEqual({
      activeRetrievalChunkId: "chunk-2",
      query: "vector",
      retrievalResults: [
        {
          description: "/notes/vector",
          fileId: "file-2",
          folderId: "folder-2",
          id: "result-2",
          path: "/notes/vector",
          score: 0.88,
          snippet: "Vector search",
          sourceType: "markdown",
          title: "Vector note",
          type: "file",
          workspaceUuid: "workspace-1",
        },
      ],
    });
  });
});
