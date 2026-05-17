import { describe, expect, it } from "vitest";
import {
  getExplorerEditDialogCopy,
  getExplorerPropertiesRows,
} from "@/components/files/explorer/explorer-content-dialog-model";

describe("explorer content dialog model", () => {
  it("returns edit dialog copy for create and rename modes", () => {
    expect(
      getExplorerEditDialogCopy({
        mode: "create-note",
        parentId: "folder-1",
        value: "",
      })
    ).toEqual({
      description: "Choose a name for the new note.",
      title: "Create note",
    });

    expect(
      getExplorerEditDialogCopy({
        id: "file-1",
        mode: "rename-file",
        value: "Updated.md",
      })
    ).toEqual({
      description: "Update the item name.",
      title: "Rename file",
    });
  });

  it("builds properties rows and omits missing detail", () => {
    expect(
      getExplorerPropertiesRows({
        detail: "Folder",
        id: "folder-1",
        kind: "folder",
        name: "Docs",
      })
    ).toEqual([
      { label: "Name", value: "Docs" },
      { label: "Type", value: "folder" },
      { label: "ID", value: "folder-1" },
      { label: "Detail", value: "Folder" },
    ]);

    expect(
      getExplorerPropertiesRows({
        id: "file-1",
        kind: "file",
        name: "Welcome.md",
      })
    ).toEqual([
      { label: "Name", value: "Welcome.md" },
      { label: "Type", value: "file" },
      { label: "ID", value: "file-1" },
    ]);
  });
});
