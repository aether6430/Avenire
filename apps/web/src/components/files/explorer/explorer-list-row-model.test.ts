import { describe, expect, it } from "vitest";
import {
  buildExplorerFileListRowModel,
  buildExplorerFolderListRowModel,
} from "@/components/files/explorer/explorer-list-row-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

function buildFile(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    createdAt: "2026-05-13T00:00:00.000Z",
    folderId: "folder-1",
    id: "file-1",
    mimeType: "text/markdown",
    name: "Welcome.md",
    page: {
      bannerUrl: null,
      icon: null,
      properties: {
        priority: { type: "number", value: 2 },
        status: { type: "select", value: "Open" },
      },
    },
    sizeBytes: 3072,
    storageUrl: "https://example.com/welcome.md",
    updatedAt: "2026-05-13T02:00:00.000Z",
    ...overrides,
  };
}

describe("explorer list row model", () => {
  it("builds folder row labels and updated text", () => {
    const model = buildExplorerFolderListRowModel({
      fileCount: 4,
      folderCount: 2,
      updatedAt: "2026-05-13T02:00:00.000Z",
    });

    expect(model.countsLabel).toBe("2 folders • 4 files");
    expect(model.updatedLabel.length).toBeGreaterThan(0);
  });

  it("builds file row size, updated text, and visible property chips", () => {
    const definitions: WorkspacePropertyDefinition[] = [
      { key: "priority", type: "number" } as WorkspacePropertyDefinition,
      { key: "status", type: "select" } as WorkspacePropertyDefinition,
      { key: "missing", type: "text" } as WorkspacePropertyDefinition,
    ];

    const model = buildExplorerFileListRowModel({
      file: buildFile(),
      selectedCardPropertyDefinitions: definitions,
    });

    expect(model.sizeLabel).toBe("3.0 KB");
    expect(model.updatedLabel.length).toBeGreaterThan(0);
    expect(model.propertyChips).toEqual([
      { label: "priority", value: "2" },
      { label: "status", value: "Open" },
    ]);
  });
});
