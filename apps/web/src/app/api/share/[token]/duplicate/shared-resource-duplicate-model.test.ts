import { describe, expect, it } from "vitest";
import { Exit, Schema } from "effect-v4";
import {
  buildSharedResourceDuplicateFileRoute,
  buildSharedResourceDuplicateFolderRoute,
  collectSharedDuplicateDescendants,
  resolveSharedDuplicateName,
  sharedResourceDuplicateSchema,
} from "./shared-resource-duplicate-model";

describe("shared resource duplicate model", () => {
  it("validates the target workspace payload and builds destination routes", () => {
    expect(
      Exit.isSuccess(
        Schema.decodeUnknownExit(sharedResourceDuplicateSchema)({ workspaceId: "workspace-1" })
      )
    ).toBe(true);

    expect(
      buildSharedResourceDuplicateFileRoute({
        folderId: "folder-1",
        fileId: "file-1",
        workspaceId: "workspace-1",
      })
    ).toBe("/workspace/files/workspace-1/folder/folder-1?file=file-1");

    expect(
      buildSharedResourceDuplicateFolderRoute({
        folderId: "folder-1",
        workspaceId: "workspace-1",
      })
    ).toBe("/workspace/files/workspace-1/folder/folder-1");
  });

  it("resolves duplicate names and descendant order for shared folder copies", () => {
    expect(
      resolveSharedDuplicateName(["notes.md", "notes (1).md"], "notes.md")
    ).toBe("notes (2).md");

    expect(
      collectSharedDuplicateDescendants(
        [
          { id: "root", name: "Root", parentId: null },
          { id: "child-1", name: "Child 1", parentId: "root" },
          { id: "child-2", name: "Child 2", parentId: "child-1" },
        ],
        "root"
      ).map((folder) => folder.id)
    ).toEqual(["child-1", "child-2"]);
  });
});
