import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: vi.fn(),
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

  it("maps search results to citations with workspace paths", () => {
    const maps = buildMaps();
    const citations = mapSearchResultsToCitations({
      maps,
      results: [
        {
          chunkId: "chunk-1",
          content: "Momentum is conserved.",
          endMs: null,
          fileId: "file-2",
          page: 4,
          score: 0.92,
          source: "Momentum Review",
          sourceType: "file",
          startMs: null,
          title: "Momentum Review",
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
    ]);

    expect(
      getWorkspacePathForFile(
        { id: "missing", name: "fallback.md" },
        buildMaps()
      )
    ).toBe("fallback.md");
  });
});
