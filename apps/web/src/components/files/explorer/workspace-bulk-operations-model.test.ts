import { describe, expect, it } from "vitest";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  type BulkActionItem,
  buildMoveBulkActionItems,
  buildMoveMutationHistoryItems,
  describeMutationHistoryEntry,
  type FileMutationHistoryEntry,
  filterMutationHistoryEntry,
  filterWritableBulkActionItems,
  getSuccessfulBulkMutationKeys,
  resolveBulkActionItemsFromContext,
  resolveBulkActionItemsFromSelection,
  subtractMutationHistoryKeys,
} from "@/components/files/explorer/workspace-bulk-operations-model";

function buildFolder(overrides: Partial<FolderRecord> = {}): FolderRecord {
  const {
    id = "folder-1",
    name = "Docs",
    parentId = null,
    ...rest
  } = overrides;

  return {
    id,
    name,
    parentId,
    ...rest,
  };
}

function buildFile(overrides: Partial<FileRecord> = {}): FileRecord {
  const {
    createdAt = "2026-05-12T00:00:00.000Z",
    folderId = "folder-1",
    id = "file-1",
    mimeType = "text/markdown",
    name = "Welcome.md",
    sizeBytes = 1024,
    storageUrl = "https://example.com/file-1",
    ...rest
  } = overrides;

  return {
    createdAt,
    folderId,
    id,
    mimeType,
    name,
    sizeBytes,
    storageUrl,
    ...rest,
  };
}

describe("workspace bulk operations model", () => {
  const folders = [
    buildFolder({ id: "root-1", name: "Workspace", parentId: null }),
    buildFolder({ id: "folder-a", name: "Docs", parentId: "root-1" }),
    buildFolder({
      id: "folder-b",
      name: "Read only",
      parentId: "root-1",
      readOnly: true,
    }),
  ];
  const files = [
    buildFile({ folderId: "folder-a", id: "file-a", name: "Alpha.md" }),
    buildFile({
      folderId: "folder-a",
      id: "file-b",
      name: "Locked.md",
      readOnly: true,
    }),
  ];

  it("resolves bulk action items from selection and context without leaking unknown ids", () => {
    expect(
      resolveBulkActionItemsFromSelection({
        files,
        folders,
        selectedIds: new Set(["folder-a", "file-a", "missing"]),
      })
    ).toEqual([
      { id: "folder-a", kind: "folder" },
      { id: "file-a", kind: "file" },
    ]);

    expect(
      resolveBulkActionItemsFromContext({
        fallbackKind: "file",
        files,
        folders,
        itemId: "file-a",
        selectedIds: new Set(["file-a", "folder-a"]),
        snapshottedIds: ["folder-a", "file-a"],
      })
    ).toEqual([
      { id: "folder-a", kind: "folder" },
      { id: "file-a", kind: "file" },
    ]);

    expect(
      resolveBulkActionItemsFromContext({
        fallbackKind: "folder",
        files,
        folders,
        itemId: "folder-b",
        selectedIds: new Set(["file-a"]),
        snapshottedIds: null,
      })
    ).toEqual([{ id: "folder-b", kind: "folder" }]);
  });

  it("filters writable items and builds move plans without including the target folder itself", () => {
    const actionItems: BulkActionItem[] = [
      { id: "folder-a", kind: "folder" },
      { id: "folder-b", kind: "folder" },
      { id: "file-a", kind: "file" },
      { id: "file-b", kind: "file" },
    ];

    expect(
      filterWritableBulkActionItems({
        files,
        folders,
        items: actionItems,
      })
    ).toEqual([
      { id: "folder-a", kind: "folder" },
      { id: "file-a", kind: "file" },
    ]);

    expect(
      buildMoveBulkActionItems({
        files,
        folders,
        itemIds: ["folder-a", "folder-b", "file-a", "file-b"],
        targetFolderId: "folder-a",
      })
    ).toEqual([{ id: "file-a", kind: "file" }]);

    expect(
      buildMoveBulkActionItems({
        files,
        folders,
        itemIds: ["file-a"],
        targetFolderId: "folder-b",
      })
    ).toEqual([]);
  });

  it("builds move mutation history items and shared mutation history summaries", () => {
    const moveItems: BulkActionItem[] = [
      { id: "folder-a", kind: "folder" },
      { id: "file-a", kind: "file" },
    ];
    const moveEntry: FileMutationHistoryEntry = {
      items: buildMoveMutationHistoryItems({
        files,
        folders,
        items: moveItems,
        targetFolderId: "root-1",
      }),
      operation: "move",
    };

    expect(moveEntry.items).toEqual([
      {
        fromFolderId: "root-1",
        id: "folder-a",
        kind: "folder",
        toFolderId: "root-1",
      },
      {
        fromFolderId: "folder-a",
        id: "file-a",
        kind: "file",
        toFolderId: "root-1",
      },
    ]);

    expect(
      getSuccessfulBulkMutationKeys({
        results: [
          { id: "folder-a", kind: "folder", status: "ok" },
          { id: "file-a", kind: "file", status: "failed" },
        ],
      })
    ).toEqual(new Set(["folder:folder-a"]));

    expect(
      filterMutationHistoryEntry(moveEntry, new Set(["file:file-a"]))
    ).toEqual({
      items: [
        {
          fromFolderId: "folder-a",
          id: "file-a",
          kind: "file",
          toFolderId: "root-1",
        },
      ],
      operation: "move",
    });

    expect(
      subtractMutationHistoryKeys(moveEntry, new Set(["folder:folder-a"]))
    ).toEqual({
      items: [
        {
          fromFolderId: "folder-a",
          id: "file-a",
          kind: "file",
          toFolderId: "root-1",
        },
      ],
      operation: "move",
    });

    expect(describeMutationHistoryEntry(moveEntry, "normal", 1, 2)).toBe(
      "Moved 1 of 2 items."
    );
  });
});
