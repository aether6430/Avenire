import { describe, expect, it } from "vitest";
import {
  buildExplorerCurrentInfoEntries,
  buildExplorerCurrentPinnedItem,
  buildExplorerFolderFileCount,
  buildExplorerFolderPreviewKinds,
  buildExplorerFolderSubfolderCount,
  buildExplorerIsCurrentPinned,
  buildExplorerWorkspaceMemberNameById,
} from "@/components/files/explorer/explorer-surface-summary-model";
import type {
  FileRecord,
  FolderRecord,
  WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import type { PinnedExplorerItem } from "@/stores/filesPinsStore";

function createFileRecord(
  overrides: Partial<FileRecord> & Pick<FileRecord, "id" | "folderId" | "name">
) {
  return {
    createdAt: "2026-05-12T10:00:00.000Z",
    mimeType: "text/markdown",
    sizeBytes: 1024,
    storageUrl: "https://example.com/file",
    ...overrides,
  } as FileRecord;
}

function createFolderRecord(
  overrides: Partial<FolderRecord> & Pick<FolderRecord, "id" | "name">
) {
  return {
    parentId: null,
    ...overrides,
  } as FolderRecord;
}

describe("Explorer surface summary model", () => {
  it("builds pinned-target and pinned-state for the current surface", () => {
    const activeFile = createFileRecord({
      folderId: "folder-a",
      id: "file-a",
      name: "alpha.md",
    });
    const currentFolder = createFolderRecord({
      id: "folder-root",
      name: "Root",
      parentId: null,
    });
    const pinnedItems: PinnedExplorerItem[] = [
      {
        folderId: "folder-a",
        id: "file-a",
        kind: "file",
        name: "alpha.md",
        workspaceId: "workspace-1",
      },
    ];

    const pinnedTarget = buildExplorerCurrentPinnedItem({
      activeFile,
      currentFolder,
      workspaceUuid: "workspace-1",
    });

    expect(pinnedTarget).toEqual({
      folderId: "folder-a",
      id: "file-a",
      kind: "file",
      name: "alpha.md",
      workspaceId: "workspace-1",
    });
    expect(buildExplorerIsCurrentPinned(pinnedItems, pinnedTarget)).toBe(true);
    expect(
      buildExplorerCurrentPinnedItem({
        activeFile: null,
        currentFolder,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      folderId: null,
      id: "folder-root",
      kind: "folder",
      name: "Root",
      workspaceId: "workspace-1",
    });
  });

  it("builds folder counts and preview-kind rollups", () => {
    const files = [
      createFileRecord({
        folderId: "folder-a",
        id: "file-1",
        mimeType: "image/png",
        name: "image.png",
      }),
      createFileRecord({
        folderId: "folder-a",
        id: "file-2",
        mimeType: "image/png",
        name: "hero.png",
      }),
      createFileRecord({
        folderId: "folder-a",
        id: "file-3",
        mimeType: "video/mp4",
        name: "clip.mp4",
      }),
      createFileRecord({
        folderId: "folder-b",
        id: "file-4",
        mimeType: "application/pdf",
        name: "spec.pdf",
      }),
    ];
    const folders = [
      createFolderRecord({ id: "folder-a", name: "A", parentId: "root" }),
      createFolderRecord({ id: "folder-b", name: "B", parentId: "root" }),
      createFolderRecord({ id: "folder-c", name: "C", parentId: "folder-a" }),
    ];

    expect(buildExplorerFolderFileCount(files).get("folder-a")).toBe(3);
    expect(buildExplorerFolderSubfolderCount(folders).get("root")).toBe(2);
    expect(
      buildExplorerFolderPreviewKinds(files, (file) =>
        file.mimeType?.startsWith("image/")
          ? "image"
          : file.mimeType?.startsWith("video/")
            ? "video"
            : "document"
      ).get("folder-a")
    ).toEqual(["image", "video"]);
  });

  it("builds readable info entries for file and folder surfaces", () => {
    const activeFile = createFileRecord({
      createdAt: "2026-05-11T08:00:00.000Z",
      folderId: "folder-a",
      id: "file-a",
      isIngested: true,
      name: "alpha.md",
      sizeBytes: 2048,
      updatedAt: "2026-05-12T09:30:00.000Z",
      uploadedBy: "user-1",
    });
    const currentFolder = createFolderRecord({
      createdAt: "2026-05-10T07:00:00.000Z",
      id: "folder-a",
      name: "Folder A",
      updatedAt: "2026-05-12T07:15:00.000Z",
    });
    const workspaceMembers: WorkspaceMemberRecord[] = [
      {
        email: "dev@avenire.local",
        id: "member-1",
        name: "Dev User",
        role: "owner",
        userId: "user-1",
      },
    ];
    const memberNameById =
      buildExplorerWorkspaceMemberNameById(workspaceMembers);

    const fileInfo = buildExplorerCurrentInfoEntries({
      activeFile,
      currentFolder,
      currentLocationTitle: "Folder A",
      filePathById: new Map([["file-a", "Root/Folder A/alpha.md"]]),
      isAtWorkspaceRoot: false,
      workspaceMemberCount: workspaceMembers.length,
      workspaceMemberNameById: memberNameById,
    });
    expect(fileInfo.map((entry) => entry.label)).toEqual([
      "Name",
      "Owner",
      "File size",
      "Ingestion",
      "Visible to",
      "Location",
      "Created at",
      "Updated at",
    ]);
    expect(fileInfo.find((entry) => entry.label === "Owner")?.value).toBe(
      "Dev User"
    );
    expect(fileInfo.find((entry) => entry.label === "Visible to")?.value).toBe(
      "1 workspace member"
    );

    const folderInfo = buildExplorerCurrentInfoEntries({
      activeFile: null,
      currentFolder,
      currentLocationTitle: "Folder A",
      filePathById: new Map(),
      isAtWorkspaceRoot: false,
      workspaceMemberCount: 0,
      workspaceMemberNameById: memberNameById,
    });
    expect(folderInfo[0]).toEqual({ label: "Folder name", value: "Folder A" });
    expect(
      folderInfo.find((entry) => entry.label === "Visible to")?.value
    ).toBe("Workspace members");
  });
});
