import { describe, expect, it } from "vitest";
import {
  getExplorerItemActionMoveTargets,
  getExplorerItemMetadataRows,
} from "@/components/files/explorer/explorer-item-actions-model";

describe("explorer item actions model", () => {
  it("filters move targets by kind and read-only state", () => {
    const folders = [
      { id: "folder-a", name: "A", readOnly: false },
      { id: "folder-b", name: "B", readOnly: true },
      { id: "folder-c", name: "C", readOnly: false },
    ];

    expect(
      getExplorerItemActionMoveTargets({
        folders,
        kind: "folder",
        targetId: "folder-a",
      }).map((folder) => folder.id)
    ).toEqual(["folder-c"]);

    expect(
      getExplorerItemActionMoveTargets({
        folders,
        kind: "file",
        targetId: "file-a",
      }).map((folder) => folder.id)
    ).toEqual(["folder-a", "folder-c"]);
  });

  it("builds metadata rows and omits missing detail", () => {
    expect(
      getExplorerItemMetadataRows({
        detail: "Folder",
        kind: "folder",
        targetId: "folder-a",
      })
    ).toEqual([
      { label: "Type", value: "Folder" },
      { label: "ID", value: "folder-a" },
      { label: "Detail", value: "Folder" },
    ]);

    expect(
      getExplorerItemMetadataRows({
        kind: "file",
        targetId: "file-a",
      })
    ).toEqual([
      { label: "Type", value: "File" },
      { label: "ID", value: "file-a" },
    ]);
  });
});
