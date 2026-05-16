import { describe, expect, it } from "vitest";
import { resolveWorkspaceFilesPageTitle } from "./workspace-files-page-metadata";

describe("workspace files page metadata", () => {
  it("uses the workspace name at the workspace root", () => {
    expect(
      resolveWorkspaceFilesPageTitle({
        folderName: "Root Folder",
        isAtWorkspaceRoot: true,
        workspaceName: "Dev Workspace",
      })
    ).toBe("Dev Workspace");
  });

  it("uses the folder name inside nested folders", () => {
    expect(
      resolveWorkspaceFilesPageTitle({
        folderName: "Lecture Notes",
        isAtWorkspaceRoot: false,
        workspaceName: "Dev Workspace",
      })
    ).toBe("Lecture Notes");
  });

  it("fails closed to Files when no descriptive title is available", () => {
    expect(
      resolveWorkspaceFilesPageTitle({
        folderName: "   ",
        workspaceName: null,
      })
    ).toBe("Files");
  });
});
