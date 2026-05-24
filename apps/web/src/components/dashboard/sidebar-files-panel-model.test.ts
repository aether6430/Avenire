import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  applySidebarFilesRealtimeInvalidation,
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

const sidebarFilesPanelSource = readFileSync(
  resolve(import.meta.dirname, "./sidebar-files-panel.tsx"),
  "utf8"
);
const sidebarFilesPanelHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-sidebar-files-panel.ts"),
  "utf8"
);
const sidebarFilesPanelTreeSource = readFileSync(
  resolve(import.meta.dirname, "./use-sidebar-files-panel-tree.ts"),
  "utf8"
);
const sidebarFilesPanelNavigationSource = readFileSync(
  resolve(import.meta.dirname, "./use-sidebar-files-panel-navigation.ts"),
  "utf8"
);
const sidebarFilesPanelMutationsSource = readFileSync(
  resolve(import.meta.dirname, "./use-sidebar-files-panel-mutations.ts"),
  "utf8"
);
const sidebarFilesPanelModelSource = readFileSync(
  resolve(import.meta.dirname, "./sidebar-files-panel-model.ts"),
  "utf8"
);

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

  it("applies realtime invalidation payloads for deleted files and folders", () => {
    expect(
      applySidebarFilesRealtimeInvalidation({
        detail: {
          fileId: "file-a",
          reason: "file.deleted",
        },
        expandedTreePaths: new Set(["root", "notes"]),
        fileTree,
        folderTree,
      })
    ).toEqual({
      expandedTreePaths: new Set(["root", "notes"]),
      fileTree: [fileTree[1]],
      folderTree,
    });

    expect(
      applySidebarFilesRealtimeInvalidation({
        detail: {
          folderId: "notes",
          reason: "folder.deleted",
        },
        expandedTreePaths: new Set(["root", "notes", "archive"]),
        fileTree,
        folderTree,
      })
    ).toEqual({
      expandedTreePaths: new Set(["root"]),
      fileTree: [],
      folderTree: [folderTree[0]],
    });
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
        errorMessage: "tree backend offline",
        filteredFolderCount: 0,
        folderCount: 0,
        loadFailed: true,
        loading: false,
        searchActive: false,
        workspaceUuid: "workspace-1",
      })
    ).toEqual({
      label: "tree backend offline",
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

  it("keeps files sidebar ownership split between the orchestration wrapper, pure model helpers, and dedicated navigation/tree/mutation hooks", () => {
    expect(sidebarFilesPanelSource).toContain(
      "@/components/dashboard/sidebar-files-panel-actions-section"
    );
    expect(sidebarFilesPanelSource).toContain(
      "@/components/dashboard/sidebar-files-panel-pinned-section"
    );
    expect(sidebarFilesPanelSource).toContain(
      "@/components/dashboard/sidebar-files-panel-tree-section"
    );
    expect(sidebarFilesPanelSource).toContain(
      "@/components/dashboard/use-sidebar-files-panel"
    );
    expect(sidebarFilesPanelSource).not.toContain(
      "@/components/dashboard/sidebar-files-panel-surface"
    );
    expect(sidebarFilesPanelSource).not.toContain("fetch(");
    expect(sidebarFilesPanelSource).not.toContain("EventSource");

    expect(sidebarFilesPanelHookSource).toContain(
      "@/components/dashboard/sidebar-files-panel-model"
    );
    expect(sidebarFilesPanelHookSource).toContain(
      "@/components/dashboard/use-sidebar-files-panel-navigation"
    );
    expect(sidebarFilesPanelHookSource).toContain(
      "@/components/dashboard/use-sidebar-files-panel-tree"
    );
    expect(sidebarFilesPanelHookSource).toContain(
      "@/components/dashboard/use-sidebar-files-panel-mutations"
    );
    expect(sidebarFilesPanelHookSource).not.toContain("new EventSource(");
    expect(sidebarFilesPanelHookSource).not.toContain(
      "fetch(`/api/workspaces/"
    );

    expect(sidebarFilesPanelModelSource).toContain(
      "export function getSidebarFilesTreeState"
    );
    expect(sidebarFilesPanelModelSource).toContain(
      "export function filterSidebarTreeBySearchQuery"
    );
    expect(sidebarFilesPanelModelSource).not.toContain("fetch(");
    expect(sidebarFilesPanelModelSource).not.toContain("useState(");

    expect(sidebarFilesPanelTreeSource).toContain(
      "createFilesRealtimeConnection"
    );
    expect(sidebarFilesPanelTreeSource).toContain("loadWorkspaceTreePayload");
    expect(sidebarFilesPanelTreeSource).toContain("writeWorkspaceTreePayload");
    expect(sidebarFilesPanelNavigationSource).toContain(
      "useWorkspaceSurfaceNavigation"
    );
    expect(sidebarFilesPanelMutationsSource).toContain("/items/bulk");
  });
});
