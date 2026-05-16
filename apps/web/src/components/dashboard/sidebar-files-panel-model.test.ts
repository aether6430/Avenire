import { describe, expect, it } from "vitest";

import {
  buildSidebarAutoExpandedAncestorIds,
  buildSidebarRootExpandedIds,
  collectSidebarDeletedFolderIds,
  filterSidebarTreeAfterDelete,
  filterSidebarTreeBySearchQuery,
  getSidebarFilesTreeState,
  isSidebarFolderDescendant,
  resolveSidebarRootFolderId,
  type SidebarFileNode,
  type SidebarFolderNode,
} from "@/components/dashboard/sidebar-files-panel-model";

const folderTree: SidebarFolderNode[] = [
  {
    id: "root",
    name: "Workspace",
    parentId: null,
    readOnly: false,
  },
  {
    id: "notes",
    name: "Notes",
    parentId: "root",
    readOnly: false,
  },
  {
    id: "archive",
    name: "Archive",
    parentId: "notes",
    readOnly: false,
  },
] satisfies SidebarFolderNode[];

const fileTree: SidebarFileNode[] = [
  {
    folderId: "notes",
    id: "file-a",
    name: "Welcome.md",
    readOnly: false,
  },
  {
    folderId: "archive",
    id: "file-b",
    name: "Old.pdf",
    readOnly: false,
  },
] satisfies SidebarFileNode[];

describe("sidebar files panel model", () => {
  it("derives root ids and ancestor expansion for active folders and files", () => {
    expect(resolveSidebarRootFolderId(folderTree)).toBe("root");
    expect(Array.from(buildSidebarRootExpandedIds(folderTree))).toEqual([
      "root",
    ]);

    expect(
      Array.from(
        buildSidebarAutoExpandedAncestorIds({
          currentFolderId: "archive",
          fileTree,
          folderTree,
        }) ?? []
      )
    ).toEqual(["archive", "notes", "root"]);

    expect(
      Array.from(
        buildSidebarAutoExpandedAncestorIds({
          currentFileId: "file-a",
          fileTree,
          folderTree,
        }) ?? []
      )
    ).toEqual(["notes", "root"]);
  });

  it("detects descendant moves and computes cascade deletion results", () => {
    expect(isSidebarFolderDescendant(folderTree, "notes", "archive")).toBe(
      true
    );
    expect(isSidebarFolderDescendant(folderTree, "archive", "notes")).toBe(
      false
    );

    const folderIdsToRemove = collectSidebarDeletedFolderIds(folderTree, [
      { id: "notes", kind: "folder" },
    ]);

    expect(Array.from(folderIdsToRemove).sort()).toEqual(["archive", "notes"]);

    const filtered = filterSidebarTreeAfterDelete({
      fileTree,
      folderIdsToRemove,
      folderTree,
      items: [{ id: "notes", kind: "folder" }],
    });

    expect(filtered.folders.map((folder) => folder.id)).toEqual(["root"]);
    expect(filtered.files).toEqual([]);
  });

  it("keeps files sidebar tree loading, failure, and ready states distinct", () => {
    expect(
      getSidebarFilesTreeState({
        filteredFolderCount: 0,
        folderCount: 0,
        loadFailed: false,
        loading: true,
        searchActive: false,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      label: "Loading files...",
      showTree: false,
    });

    expect(
      getSidebarFilesTreeState({
        filteredFolderCount: 0,
        folderCount: 0,
        loadFailed: true,
        loading: false,
        searchActive: false,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      label: "Unable to load files.",
      showTree: false,
    });

    expect(
      getSidebarFilesTreeState({
        filteredFolderCount: 0,
        folderCount: 0,
        loadFailed: false,
        loading: false,
        searchActive: false,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      label: "Workspace",
      showTree: false,
    });

    expect(
      getSidebarFilesTreeState({
        filteredFolderCount: 2,
        folderCount: 2,
        loadFailed: false,
        loading: false,
        searchActive: false,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      label: null,
      showTree: true,
    });

    expect(
      getSidebarFilesTreeState({
        filteredFolderCount: 0,
        folderCount: 2,
        loadFailed: false,
        loading: false,
        searchActive: true,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      label: "No matching files.",
      showTree: false,
    });
  });

  it("filters the sidebar tree while preserving matching folders and file ancestors", () => {
    expect(
      filterSidebarTreeBySearchQuery({
        fileTree,
        folderTree,
        searchQuery: "welcome",
      })
    ).toEqual({
      files: [fileTree[0]],
      folders: [folderTree[0], folderTree[1]],
    });

    expect(
      filterSidebarTreeBySearchQuery({
        fileTree,
        folderTree,
        searchQuery: "notes",
      })
    ).toEqual({
      files: fileTree,
      folders: folderTree,
    });
  });
});
