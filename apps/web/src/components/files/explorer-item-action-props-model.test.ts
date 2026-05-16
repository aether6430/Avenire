import { describe, expect, it } from "vitest";
import {
  buildExplorerFileActionDetail,
  buildExplorerFolderActionDetail,
  buildExplorerPropertiesItem,
} from "@/components/files/explorer/explorer-item-action-props-model";

describe("explorer item action props model", () => {
  it("builds stable folder and file action detail strings", () => {
    expect(
      buildExplorerFolderActionDetail({
        fileCount: 7,
        folderCount: 3,
      })
    ).toBe("Folder • 3 folders • 7 files");

    expect(
      buildExplorerFileActionDetail({
        isIngested: false,
        mimeType: null,
        sizeLabel: "12 KB",
      })
    ).toBe("12 KB • unknown • Pending");
  });

  it("builds explorer properties items for both files and folders", () => {
    expect(
      buildExplorerPropertiesItem({
        detail: "Folder",
        id: "folder-1",
        kind: "folder",
        name: "Docs",
      })
    ).toEqual({
      detail: "Folder",
      id: "folder-1",
      kind: "folder",
      name: "Docs",
    });
  });
});
