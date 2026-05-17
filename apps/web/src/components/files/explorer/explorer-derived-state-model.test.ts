import { describe, expect, it } from "vitest";
import {
  buildExplorerCurrentSurface,
  DEFAULT_EXPLORER_FOLDER_BANNER_URL,
} from "@/components/files/explorer/explorer-derived-state-model";
import { buildExplorerWorkspaceIndexState } from "@/components/files/explorer/explorer-workspace-index-state-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";

function buildFolder(
  overrides: Partial<FolderRecord> & Pick<FolderRecord, "id" | "name">
): FolderRecord {
  return {
    parentId: null,
    ...overrides,
  };
}

function buildFile(
  overrides: Partial<FileRecord> & Pick<FileRecord, "id" | "folderId" | "name">
): FileRecord {
  return {
    createdAt: "2026-05-12T00:00:00.000Z",
    mimeType: "text/markdown",
    sizeBytes: 1024,
    storageUrl: "https://example.com/file",
    ...overrides,
  };
}

describe("Explorer derived state model", () => {
  it("builds current surface context from selected file and breadcrumbs", () => {
    const root = buildFolder({ id: "root", name: "Workspace Root" });
    const child = buildFolder({
      bannerUrl: "",
      id: "folder-a",
      name: "Folder A",
      parentId: "root",
      readOnly: true,
    });
    const files = [
      buildFile({
        folderId: "folder-a",
        id: "file-a",
        name: "Alpha.md",
      }),
    ];

    const surface = buildExplorerCurrentSurface({
      breadcrumbs: [root, child],
      files,
      selectedFileParam: "file-a",
      workspaceName: "Workspace Name",
    });

    expect(surface.activeFile?.id).toBe("file-a");
    expect(surface.currentFolder?.id).toBe("folder-a");
    expect(surface.parentFolder?.id).toBe("root");
    expect(surface.isAtWorkspaceRoot).toBe(false);
    expect(surface.isCurrentFolderReadOnly).toBe(true);
    expect(surface.currentLocationTitle).toBe("Folder A");
    expect(surface.currentFolderBannerUrl).toBe(
      DEFAULT_EXPLORER_FOLDER_BANNER_URL
    );
  });

  it("builds workspace index/search state from all folders and files", () => {
    const folders = [
      buildFolder({ id: "root", name: "Workspace Root" }),
      buildFolder({ id: "folder-a", name: "Folder A", parentId: "root" }),
    ];
    const files = [
      buildFile({
        folderId: "folder-a",
        id: "file-a",
        mimeType: "application/pdf",
        name: "Spec.pdf",
      }),
    ];

    const state = buildExplorerWorkspaceIndexState({
      allFiles: files,
      allFolders: folders,
    });

    expect(state.filePathById.get("file-a")).toBe("Folder A/Spec.pdf");
    expect(state.searchableItems).toEqual([
      {
        description: "Folder",
        id: "root",
        path: "Workspace Root",
        snippet: "Folder in workspace",
        title: "Workspace Root",
        type: "folder",
      },
      {
        description: "Folder",
        id: "folder-a",
        path: "Folder A",
        snippet: "Folder in workspace",
        title: "Folder A",
        type: "folder",
      },
      {
        description: "application/pdf",
        folderId: "folder-a",
        id: "file-a",
        path: "Folder A/Spec.pdf",
        snippet: "1.0 KB • application/pdf",
        title: "Spec.pdf",
        type: "file",
      },
    ]);
  });
});
