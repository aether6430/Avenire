import { describe, expect, it } from "vitest";
import {
  collectDuplicateDescendants,
  resolveDuplicateName,
} from "./workspace-item-duplicate-model";

describe("workspace item duplicate model", () => {
  it("adds copy suffixes while preserving the file extension", () => {
    expect(resolveDuplicateName(["notes.md", "notes (1).md"], "notes.md")).toBe(
      "notes (2).md"
    );
  });

  it("orders descendant folders from shallowest to deepest within the source subtree", () => {
    expect(
      collectDuplicateDescendants(
        [
          { id: "root", name: "Root", parentId: null },
          { id: "child-1", name: "Child 1", parentId: "root" },
          { id: "child-2", name: "Child 2", parentId: "child-1" },
          { id: "other", name: "Other", parentId: null },
        ],
        "root"
      ).map((folder) => folder.id)
    ).toEqual(["child-1", "child-2"]);
  });
});
