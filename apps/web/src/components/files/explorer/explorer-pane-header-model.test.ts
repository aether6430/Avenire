import { describe, expect, it } from "vitest";
import {
  canUseExplorerPaneHeaderFolderActions,
  getExplorerPaneHeaderMoveTargets,
} from "@/components/files/explorer/explorer-pane-header-model";
import type { FolderRecord } from "@/components/files/explorer/shared";

function buildFolder(overrides: Partial<FolderRecord>): FolderRecord {
  return {
    id: "folder-1",
    name: "Folder",
    parentId: null,
    ...overrides,
  };
}

describe("explorer-pane-header-model", () => {
  it("disables current-folder actions at the workspace root or without a folder", () => {
    expect(canUseExplorerPaneHeaderFolderActions(true, null)).toBe(false);
    expect(canUseExplorerPaneHeaderFolderActions(false, buildFolder({}))).toBe(
      true
    );
  });

  it("returns non-read-only move targets excluding the current folder", () => {
    const currentFolder = buildFolder({ id: "current" });
    const targets = getExplorerPaneHeaderMoveTargets(
      [
        currentFolder,
        buildFolder({ id: "writable-1", name: "A" }),
        buildFolder({ id: "readonly-1", name: "B", readOnly: true }),
        buildFolder({ id: "writable-2", name: "C" }),
      ],
      currentFolder
    );

    expect(targets.map((folder) => folder.id)).toEqual([
      "writable-1",
      "writable-2",
    ]);
  });
});
