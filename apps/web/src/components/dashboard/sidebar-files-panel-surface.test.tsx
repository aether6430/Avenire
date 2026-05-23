import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SidebarFilesPanelSurface } from "@/components/dashboard/sidebar-files-panel-surface";

vi.mock("@/components/dashboard/sidebar-files-panel-actions-section", () => ({
  SidebarFilesPanelActionsSection: () => <div data-actions="1" />,
}));

vi.mock("@/components/dashboard/sidebar-files-panel-pinned-section", () => ({
  SidebarFilesPanelPinnedSection: () => <div data-pinned="1" />,
}));

vi.mock("@/components/dashboard/sidebar-files-panel-tree-section", () => ({
  SidebarFilesPanelTreeSection: ({ label }: { label?: string | null }) => (
    <div data-tree-label={label ?? ""} />
  ),
}));

vi.mock("@avenire/ui/components/sidebar", () => ({
  SidebarGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("SidebarFilesPanelSurface", () => {
  it("passes an explicit failure label through to the tree section fallback", () => {
    const html = renderToStaticMarkup(
      <SidebarFilesPanelSurface
        createNewNote={() => {}}
        currentFileId={undefined}
        currentFolderId={undefined}
        deleteTreeItems={async () => {}}
        expandedTreePathIds={[]}
        filesTreeLabel="tree backend offline"
        fileTree={[]}
        fileTreePanelRef={{ current: null }}
        folderTree={[]}
        handlePaneIntent={() => false}
        handleTreeMoveItem={() => {}}
        importLink={() => {}}
        isSearchOpen={false}
        navigateToFile={() => {}}
        navigateToFilesRoot={async () => {}}
        navigateToFolder={() => {}}
        onExpandedChange={() => {}}
        openFileInNewPane={() => {}}
        openFolderInNewPane={() => {}}
        pinnedFiles={[]}
        pinnedFolders={[]}
        searchQuery=""
        selectedItemId={undefined}
        setSearchQuery={() => {}}
        toggleSearch={() => {}}
        uploadFile={() => {}}
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain('data-tree-label="tree backend offline"');
  });

  it("renders the local files search field only when search is open", () => {
    const closedHtml = renderToStaticMarkup(
      <SidebarFilesPanelSurface
        createNewNote={() => {}}
        currentFileId={undefined}
        currentFolderId={undefined}
        deleteTreeItems={async () => {}}
        expandedTreePathIds={[]}
        filesTreeLabel={null}
        fileTree={[]}
        fileTreePanelRef={{ current: null }}
        folderTree={[]}
        handlePaneIntent={() => false}
        handleTreeMoveItem={() => {}}
        importLink={() => {}}
        isSearchOpen={false}
        navigateToFile={() => {}}
        navigateToFilesRoot={async () => {}}
        navigateToFolder={() => {}}
        onExpandedChange={() => {}}
        openFileInNewPane={() => {}}
        openFolderInNewPane={() => {}}
        pinnedFiles={[]}
        pinnedFolders={[]}
        searchQuery=""
        selectedItemId={undefined}
        setSearchQuery={() => {}}
        toggleSearch={() => {}}
        uploadFile={() => {}}
        workspaceUuid="workspace-1"
      />
    );
    const openHtml = renderToStaticMarkup(
      <SidebarFilesPanelSurface
        createNewNote={() => {}}
        currentFileId={undefined}
        currentFolderId={undefined}
        deleteTreeItems={async () => {}}
        expandedTreePathIds={[]}
        filesTreeLabel={null}
        fileTree={[]}
        fileTreePanelRef={{ current: null }}
        folderTree={[]}
        handlePaneIntent={() => false}
        handleTreeMoveItem={() => {}}
        importLink={() => {}}
        isSearchOpen={true}
        navigateToFile={() => {}}
        navigateToFilesRoot={async () => {}}
        navigateToFolder={() => {}}
        onExpandedChange={() => {}}
        openFileInNewPane={() => {}}
        openFolderInNewPane={() => {}}
        pinnedFiles={[]}
        pinnedFolders={[]}
        searchQuery=""
        selectedItemId={undefined}
        setSearchQuery={() => {}}
        toggleSearch={() => {}}
        uploadFile={() => {}}
        workspaceUuid="workspace-1"
      />
    );

    expect(closedHtml).not.toContain("Search Files...");
    expect(openHtml).toContain("Search Files...");
  });

  it("passes an explicit no-match label through to the tree section while search is open", () => {
    const html = renderToStaticMarkup(
      <SidebarFilesPanelSurface
        createNewNote={() => {}}
        currentFileId={undefined}
        currentFolderId={undefined}
        deleteTreeItems={async () => {}}
        expandedTreePathIds={[]}
        filesTreeLabel="No matching files."
        fileTree={[]}
        fileTreePanelRef={{ current: null }}
        folderTree={[]}
        handlePaneIntent={() => false}
        handleTreeMoveItem={() => {}}
        importLink={() => {}}
        isSearchOpen={true}
        navigateToFile={() => {}}
        navigateToFilesRoot={async () => {}}
        navigateToFolder={() => {}}
        onExpandedChange={() => {}}
        openFileInNewPane={() => {}}
        openFolderInNewPane={() => {}}
        pinnedFiles={[]}
        pinnedFolders={[]}
        searchQuery="entropy"
        selectedItemId={undefined}
        setSearchQuery={() => {}}
        toggleSearch={() => {}}
        uploadFile={() => {}}
        workspaceUuid="workspace-1"
      />
    );

    expect(html).toContain('data-tree-label="No matching files."');
    expect(html).toContain("Search Files...");
  });
});
