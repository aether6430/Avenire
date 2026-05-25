import { describe, expect, it } from "vitest";
import { createWorkspaceFileIndex } from "@/lib/workspace-file-index";

const snapshot = {
  files: [
    { folderId: "folder-a", id: "file-a", name: "Welcome.md" },
    { folderId: "folder-b", id: "file-b", name: "Plan.md" },
  ],
  folders: [
    { id: "root", name: "Workspace", parentId: null },
    { id: "folder-a", name: "Docs", parentId: "root" },
    { id: "folder-b", name: "Architecture", parentId: "folder-a" },
  ],
};

describe("createWorkspaceFileIndex", () => {
  it("builds reusable path maps and sorted file entries from a workspace tree snapshot", () => {
    const index = createWorkspaceFileIndex(snapshot);

    expect(index.folderPathById.get("folder-a")).toBe("Docs");
    expect(index.folderPathById.get("folder-b")).toBe("Docs/Architecture");
    expect(index.filePathById.get("file-a")).toBe("Docs/Welcome.md");
    expect(index.filePathById.get("file-b")).toBe("Docs/Architecture/Plan.md");
    expect(index.files).toEqual([
      {
        file: { folderId: "folder-b", id: "file-b", name: "Plan.md" },
        nameLower: "plan.md",
        parentPath: "Docs/Architecture",
        pathLower: "docs/architecture/plan.md",
        workspacePath: "Docs/Architecture/Plan.md",
      },
      {
        file: { folderId: "folder-a", id: "file-a", name: "Welcome.md" },
        nameLower: "welcome.md",
        parentPath: "Docs",
        pathLower: "docs/welcome.md",
        workspacePath: "Docs/Welcome.md",
      },
    ]);
  });
});
