import { describe, expect, it, vi } from "vitest";

const { getFileAssetByIdMock } = vi.hoisted(() => ({
  getFileAssetByIdMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
  getNoteContent: vi.fn(),
  isMarkdownFileRecord: vi.fn(),
  isSharedFilesVirtualFolderId: vi.fn(),
  listWorkspaceFiles: vi.fn(),
  listWorkspaceFolders: vi.fn(),
  userCanEditFolder: vi.fn(),
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: vi.fn(),
}));

vi.mock("@/lib/ingestion-data", () => ({
  getIngestionSummaryForFile: vi.fn(),
}));

vi.mock("@/lib/retrieval-service", () => ({
  retrieveWorkspaceChunksShared: vi.fn(),
}));

import type { ExplorerFileLike } from "@/lib/chat-tools/workspace-file-helpers";
import {
  findTargetNoteFile,
  getWorkspacePathForFile,
  mapSearchResultsToCitations,
  normalizeWorkspacePath,
  resolveFileExcerpt,
  resolveFileIdByPathHint,
  resolveFolderIdByPathHint,
  type WorkspacePathMaps,
} from "@/lib/chat-tools/workspace-file-helpers";

function buildMaps(): WorkspacePathMaps {
  return {
    filePathById: new Map([
      ["file-1", "Physics/Week 1/lecture-plan.md"],
      ["file-2", "Physics/Week 2/momentum-review.md"],
    ]),
    folderPathById: new Map([
      ["root-1", ""],
      ["folder-1", "Physics"],
      ["folder-2", "Physics/Week 1"],
      ["folder-3", "Physics/Week 2"],
      ["folder-4", "Archive/Week 2"],
    ]),
  };
}

function buildNoteFile(
  overrides: Partial<ExplorerFileLike> & Pick<ExplorerFileLike, "id" | "name">
): ExplorerFileLike {
  return {
    createdAt: "2026-05-17T00:00:00.000Z",
    folderId: "folder-1",
    id: overrides.id,
    isIngested: true,
    mimeType: "text/markdown",
    name: overrides.name,
    page: null,
    readOnly: false,
    sizeBytes: 1200,
    storageUrl: "https://example.com/note.md",
    updatedAt: "2026-05-17T00:00:00.000Z",
    ...overrides,
  } as ExplorerFileLike;
}

describe("chat tool workspace file helpers", () => {
  it("normalizes workspace paths and resolves folders conservatively", () => {
    const maps = buildMaps();

    expect(normalizeWorkspacePath(" /Physics//Week 1/ ")).toBe(
      "physics/week 1"
    );
    expect(resolveFolderIdByPathHint(maps, "root-1", "")).toBe("root-1");
    expect(resolveFolderIdByPathHint(maps, "root-1", "Physics/Week 1")).toBe(
      "folder-2"
    );
    expect(resolveFolderIdByPathHint(maps, "root-1", "Week 2")).toBeNull();
    expect(resolveFolderIdByPathHint(maps, "root-1", "workspace")).toBe(
      "root-1"
    );
  });

  it("resolves file ids by exact or unique tail path", () => {
    const maps = buildMaps();

    expect(
      resolveFileIdByPathHint(maps, "Physics/Week 1/lecture-plan.md")
    ).toBe("file-1");
    expect(resolveFileIdByPathHint(maps, "momentum-review.md")).toBe("file-2");
    expect(resolveFileIdByPathHint(maps, "missing.md")).toBeNull();
  });

  it("finds target notes by explicit path or unique title match", () => {
    const maps = buildMaps();
    const notes = [
      buildNoteFile({ id: "file-1", name: "lecture-plan.md" }),
      buildNoteFile({ id: "file-2", name: "momentum-review.md" }),
    ];

    expect(
      findTargetNoteFile({
        maps,
        noteFiles: notes,
        task: 'Update "Physics/Week 1/lecture-plan.md" with examples',
      })?.id
    ).toBe("file-1");

    expect(
      findTargetNoteFile({
        maps,
        noteFiles: [
          buildNoteFile({ id: "file-2", name: "Momentum Review.md" }),
        ],
        task: 'Revise note called "Momentum Review"',
      })?.id
    ).toBe("file-2");
  });

  it("resolves explicit file ids and can require exact targets for note updates", () => {
    const maps = buildMaps();
    const notes = [
      buildNoteFile({ id: "file-1", name: "lecture-plan.md" }),
      buildNoteFile({ id: "file-2", name: "momentum-review.md" }),
    ];

    expect(
      findTargetNoteFile({
        maps,
        noteFiles: notes,
        requireExplicitTarget: true,
        task: "Update workspace-file://file-2 with a stronger summary",
      })?.id
    ).toBe("file-2");

    expect(
      findTargetNoteFile({
        maps,
        noteFiles: [
          buildNoteFile({ id: "file-2", name: "Momentum Review.md" }),
        ],
        requireExplicitTarget: true,
        task: 'Update note called "Momentum Review"',
      })
    ).toBeNull();
  });

  it("maps search results to citations with workspace paths", () => {
    const maps = buildMaps();
    const citations = mapSearchResultsToCitations({
      maps,
      results: [
        {
          chunkId: "chunk-1",
          content: "  Momentum is conserved.  ",
          endMs: null,
          fileId: "file-2",
          page: 4,
          score: 0.92,
          source: " Momentum Review ",
          sourceType: "file",
          startMs: null,
          title: " Momentum Review ",
        },
        {
          chunkId: "chunk-2",
          content: "  Snippet from a link result.  ",
          endMs: null,
          fileId: null,
          page: null,
          score: 0.41,
          source: " https://example.com/resource ",
          sourceType: "link",
          startMs: null,
          title: " Linked resource ",
        },
      ],
    });

    expect(citations).toEqual([
      {
        chunkId: "chunk-1",
        endMs: null,
        fileId: "file-2",
        page: 4,
        score: 0.92,
        snippet: "Momentum is conserved.",
        sourceType: "file",
        startMs: null,
        title: "Momentum Review",
        workspacePath: "Physics/Week 2/momentum-review.md",
      },
      {
        chunkId: "chunk-2",
        endMs: null,
        fileId: null,
        page: null,
        score: 0.41,
        snippet: "Snippet from a link result.",
        sourceType: "link",
        startMs: null,
        title: "Linked resource",
        workspacePath: "Linked resource",
      },
    ]);

    expect(
      getWorkspacePathForFile(
        { id: "missing", name: "fallback.md" },
        buildMaps()
      )
    ).toBe("fallback.md");
  });

  it("treats whitespace-only markdown excerpts as unreadable", async () => {
    getFileAssetByIdMock.mockResolvedValueOnce(
      buildNoteFile({
        id: "file-1",
        name: "empty.md",
        storageUrl: "https://example.com/empty.md",
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("   ", { status: 200 }))
    );

    await expect(
      resolveFileExcerpt({
        fileId: "file-1",
        maps: buildMaps(),
        maxChars: 500,
        workspaceId: "workspace-1",
      })
    ).resolves.toBeNull();

    vi.unstubAllGlobals();
  });
});
