import { describe, expect, it } from "vitest";
import {
  buildMoveFolderHistoryEntry,
  canMoveExplorerFolder,
  describeExplorerHardReingestSuccessCount,
  resolveBulkMutationHistoryOutcome,
  resolveExplorerHardReingestFiles,
} from "@/components/files/explorer/explorer-file-action-operations-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import type {
  BulkActionItem,
  FileMutationHistoryEntry,
} from "@/components/files/explorer/workspace-bulk-operations-model";

function buildFolder(overrides: Partial<FolderRecord> = {}): FolderRecord {
  return {
    id: "folder-1",
    name: "Folder",
    parentId: null,
    ...overrides,
  };
}

function buildFile(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    createdAt: "2026-05-12T00:00:00.000Z",
    folderId: "folder-1",
    id: "file-1",
    mimeType: "text/plain",
    name: "notes.txt",
    sizeBytes: 12,
    storageUrl: "https://example.com/file-1",
    ...overrides,
  };
}

describe("explorer file action operations model", () => {
  it("blocks invalid folder moves and allows valid ones", () => {
    const allFolders = [
      buildFolder({ id: "root" }),
      buildFolder({ id: "parent", parentId: "root" }),
      buildFolder({ id: "child", parentId: "parent" }),
      buildFolder({ id: "locked", parentId: "root", readOnly: true }),
    ];

    expect(
      canMoveExplorerFolder({
        allFolders,
        folderId: "parent",
        targetFolderId: "child",
        workspaceUuid: "workspace-1",
      })
    ).toBe(false);

    expect(
      canMoveExplorerFolder({
        allFolders,
        folderId: "parent",
        targetFolderId: "locked",
        workspaceUuid: "workspace-1",
      })
    ).toBe(false);

    expect(
      canMoveExplorerFolder({
        allFolders,
        folderId: "child",
        targetFolderId: "root",
        workspaceUuid: "workspace-1",
      })
    ).toBe(true);
  });

  it("builds folder history entries and mutation outcomes", () => {
    const allFolders = [
      buildFolder({ id: "root" }),
      buildFolder({ id: "child", parentId: "root" }),
    ];

    expect(
      buildMoveFolderHistoryEntry({
        allFolders,
        folderId: "child",
        targetFolderId: "target",
      })
    ).toEqual<FileMutationHistoryEntry>({
      items: [
        {
          fromFolderId: "root",
          id: "child",
          kind: "folder",
          toFolderId: "target",
        },
      ],
      operation: "move",
    });

    expect(
      resolveBulkMutationHistoryOutcome({
        items: [
          { id: "child", kind: "folder" },
          { id: "file-1", kind: "file" },
        ],
        result: {
          results: [
            { id: "child", kind: "folder", status: "ok" },
            { id: "file-1", kind: "file", status: "failed" },
          ],
          summary: { failed: 1, succeeded: 1, total: 2 },
        },
      })
    ).toEqual({
      successfulItems: [{ id: "child", kind: "folder" }],
      totalCount: 2,
    });
  });

  it("selects writable files for hard re-ingest and formats success copy", () => {
    const allFolders = [buildFolder({ id: "folder-1" })];
    const allFiles = [
      buildFile({ id: "file-a", folderId: "folder-1" }),
      buildFile({ id: "file-b", folderId: "folder-1", readOnly: true }),
    ];
    const items: BulkActionItem[] = [
      { id: "file-a", kind: "file" },
      { id: "file-b", kind: "file" },
      { id: "folder-1", kind: "folder" },
    ];

    expect(
      resolveExplorerHardReingestFiles({
        allFiles,
        allFolders,
        items,
      })
    ).toEqual([allFiles[0]]);

    expect(describeExplorerHardReingestSuccessCount(1)).toBe(
      "File queued for hard re-ingestion."
    );
    expect(describeExplorerHardReingestSuccessCount(3)).toBe(
      "3 files queued for hard re-ingestion."
    );
  });
});
