import { describe, expect, it } from "vitest";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import {
  buildWorkspaceFolderBrowseModel,
  type PropertyFilterState,
  type SortState,
} from "@/components/files/explorer/workspace-folder-browse-model";
import { EMPTY_PAGE_METADATA_STATE } from "@/lib/frontmatter";

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
    page = EMPTY_PAGE_METADATA_STATE,
    sizeBytes = 1024,
    storageUrl = "https://example.com/file-1",
    updatedAt = "2026-05-12T01:00:00.000Z",
    ...rest
  } = overrides;

  return {
    createdAt,
    folderId,
    id,
    mimeType,
    name,
    page,
    sizeBytes,
    storageUrl,
    updatedAt,
    ...rest,
  };
}

describe("workspace folder browse model", () => {
  it("filters files by property values and sorts them through the shared model", () => {
    const propertyFilters: PropertyFilterState[] = [
      {
        id: "filter-1",
        key: "status",
        operator: "eq",
        type: "select",
        value: "Open",
      },
    ];
    const sortState: SortState = {
      direction: "asc",
      key: "priority",
      kind: "property",
      type: "number",
    };

    const model = buildWorkspaceFolderBrowseModel({
      files: [
        buildFile({
          id: "file-a",
          name: "Alpha.md",
          page: {
            ...EMPTY_PAGE_METADATA_STATE,
            properties: {
              priority: { type: "number", value: 3 },
              status: { type: "select", value: "Open" },
            },
          },
        }),
        buildFile({
          id: "file-b",
          name: "Beta.md",
          page: {
            ...EMPTY_PAGE_METADATA_STATE,
            properties: {
              priority: { type: "number", value: 1 },
              status: { type: "select", value: "Open" },
            },
          },
        }),
        buildFile({
          id: "file-c",
          name: "Gamma.md",
          page: {
            ...EMPTY_PAGE_METADATA_STATE,
            properties: {
              priority: { type: "number", value: 2 },
              status: { type: "select", value: "Closed" },
            },
          },
        }),
      ],
      folders: [buildFolder({ id: "folder-a", name: "Specs" })],
      propertyFilters,
      query: "",
      sortState,
      vectorFilteredIds: null,
    });

    expect(model.filteredFiles.map((file) => file.id)).toEqual([
      "file-a",
      "file-b",
    ]);
    expect(model.sortedFiles.map((file) => file.id)).toEqual([
      "file-b",
      "file-a",
    ]);
    expect(model.visibleItemIds).toEqual(["folder-a", "file-b", "file-a"]);
    expect(model.explorerEntries).toEqual([
      {
        folder: buildFolder({ id: "folder-a", name: "Specs" }),
        id: "folder-a",
        kind: "folder",
      },
      {
        file: expect.objectContaining({ id: "file-b" }),
        id: "file-b",
        kind: "file",
      },
      {
        file: expect.objectContaining({ id: "file-a" }),
        id: "file-a",
        kind: "file",
      },
    ]);
  });

  it("prefers vector-filtered ids over text query for folders and files", () => {
    const sortState: SortState = {
      direction: "asc",
      key: "name",
      kind: "builtin",
    };

    const model = buildWorkspaceFolderBrowseModel({
      files: [
        buildFile({ id: "file-a", name: "Inbox.md" }),
        buildFile({ id: "file-b", name: "Launch plan.md" }),
      ],
      folders: [
        buildFolder({ id: "folder-a", name: "Archive" }),
        buildFolder({ id: "folder-b", name: "Launch" }),
      ],
      propertyFilters: [],
      query: "this term matches nothing",
      sortState,
      vectorFilteredIds: new Set(["folder-b", "file-a"]),
    });

    expect(model.filteredFolders.map((folder) => folder.id)).toEqual([
      "folder-b",
    ]);
    expect(model.filteredFiles.map((file) => file.id)).toEqual(["file-a"]);
    expect(model.visibleItemIds).toEqual(["folder-b", "file-a"]);
  });
});
