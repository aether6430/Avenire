import { describe, expect, it } from "vitest";
import {
  createWorkspaceSearchItems,
  findFastWorkspaceSearchMatch,
  mapWorkspaceRetrievalResults,
  resolveWorkspaceRetrievalError,
} from "@/components/files/search-model";
import { createWorkspaceFileIndex } from "@/lib/workspace-file-index";

const folders = [
  { id: "root", name: "Workspace", parentId: null },
  { id: "folder-a", name: "Docs", parentId: "root" },
];

const files = [
  {
    createdAt: "2026-05-12T00:00:00.000Z",
    folderId: "folder-a",
    id: "file-a",
    mimeType: "text/markdown",
    name: "Welcome.md",
    sizeBytes: 1024,
    storageUrl: "https://example.com/welcome.md",
  },
];

describe("createWorkspaceSearchItems", () => {
  it("builds folder and file search items with stable workspace paths", () => {
    const workspaceFileIndex = createWorkspaceFileIndex({
      files,
      folders,
    });

    expect(
      createWorkspaceSearchItems({
        files,
        folders,
        workspaceFileIndex,
      })
    ).toEqual([
      {
        description: "Folder",
        id: "root",
        path: "Workspace",
        snippet: "Folder in workspace",
        title: "Workspace",
        type: "folder",
      },
      {
        description: "Folder",
        id: "folder-a",
        path: "Docs",
        snippet: "Folder in workspace",
        title: "Docs",
        type: "folder",
      },
      {
        description: "text/markdown",
        folderId: "folder-a",
        id: "file-a",
        path: "Docs/Welcome.md",
        snippet: "1.0 KB • text/markdown",
        title: "Welcome.md",
        type: "file",
      },
    ]);
  });
});

describe("workspace search model helpers", () => {
  const items = [
    {
      description: "Folder",
      id: "folder-a",
      path: "Docs",
      snippet: "Folder in workspace",
      title: "Docs",
      type: "folder" as const,
    },
    {
      description: "text/markdown",
      folderId: "folder-a",
      id: "file-a",
      path: "Docs/Welcome.md",
      snippet: "1.0 KB • text/markdown",
      title: "Welcome.md",
      type: "file" as const,
      workspaceUuid: "workspace-1",
    },
  ];

  it("finds fast matches by exact title or exact path from a single item model", () => {
    expect(findFastWorkspaceSearchMatch("Welcome.md", items)).toEqual(items[1]);
    expect(findFastWorkspaceSearchMatch("docs/welcome.md", items)).toEqual(
      items[1]
    );
  });

  it("maps retrieval payloads into stable search results with path metadata", () => {
    expect(
      mapWorkspaceRetrievalResults({
        items,
        results: [
          {
            content:
              "  [https://avenire.space/demo, p.4] Intro  text\nwith noise https://example.com/source  ",
            fileId: "file-a",
            rerankScore: 0.91,
            title: "Welcome",
          },
        ],
      })
    ).toEqual([
      {
        chunkId: undefined,
        description: "text/markdown",
        endMs: null,
        fileId: "file-a",
        folderId: "folder-a",
        highlightText:
          "[https://avenire.space/demo, p.4] Intro  text\nwith noise https://example.com/source",
        id: "file-a",
        page: null,
        path: "Docs/Welcome.md",
        score: 0.91,
        snippet: "Intro text with noise",
        sourceType: undefined,
        startMs: null,
        title: "Welcome.md",
        type: "file",
        workspaceUuid: "workspace-1",
      },
    ]);
  });

  it("keeps broader retrieval result sets instead of silently capping them to 8 items", () => {
    const results = Array.from({ length: 10 }, (_unused, index) => ({
      content: `Result ${index + 1}`,
      fileId: "file-a",
      rerankScore: 1 - index * 0.01,
      title: `Result ${index + 1}`,
    }));

    expect(
      mapWorkspaceRetrievalResults({
        items,
        results,
      })
    ).toHaveLength(10);
  });

  it("keeps retrieval errors readable for command palette and search surfaces", () => {
    expect(resolveWorkspaceRetrievalError(new Error("boom"))).toBe("boom");
    expect(resolveWorkspaceRetrievalError(null)).toBe(
      "Unable to search workspace content."
    );
  });
});
