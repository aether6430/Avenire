"use client";

import { SidebarFilesPanelSurface } from "@/components/dashboard/sidebar-files-panel-surface";
import { useSidebarFilesPanel } from "@/components/dashboard/use-sidebar-files-panel";
import type { FilesUiIntent } from "@/stores/filesUiStore";

export function FilesSidebarPanel({
  currentFileId,
  currentFolderId,
  emitGlobalFileIntent,
  navigateToFilesRoot,
  workspaceUuid,
}: {
  currentFileId?: string;
  currentFolderId?: string;
  emitGlobalFileIntent?: (intent: FilesUiIntent) => Promise<void> | void;
  navigateToFilesRoot: (options?: { openInNewPane?: boolean }) => Promise<void>;
  workspaceUuid: string | null;
}) {
  const runtime = useSidebarFilesPanel({
    currentFileId,
    currentFolderId,
    emitGlobalFileIntent,
    navigateToFilesRoot,
    workspaceUuid,
  });

  return (
    <SidebarFilesPanelSurface
      createNewNote={runtime.createNewNote}
      currentFileId={runtime.currentFileId}
      currentFolderId={runtime.currentFolderId}
      deleteTreeItems={runtime.deleteTreeItems}
      expandedTreePathIds={runtime.expandedTreePathIds}
      filesTreeLabel={runtime.filesTreeLabel}
      fileTree={runtime.fileTree}
      fileTreePanelRef={runtime.fileTreePanelRef}
      folderTree={runtime.folderTree}
      handlePaneIntent={runtime.handlePaneIntent}
      handleTreeMoveItem={runtime.handleTreeMoveItem}
      importLink={runtime.importLink}
      isSearchOpen={runtime.isSearchOpen}
      navigateToFile={runtime.navigateToFile}
      navigateToFilesRoot={runtime.navigateToFilesRoot}
      navigateToFolder={runtime.navigateToFolder}
      onExpandedChange={runtime.onExpandedChange}
      openFileInNewPane={runtime.openFileInNewPane}
      openFolderInNewPane={runtime.openFolderInNewPane}
      pinnedFiles={runtime.pinnedFiles}
      pinnedFolders={runtime.pinnedFolders}
      searchQuery={runtime.searchQuery}
      selectedItemId={runtime.selectedItemId}
      setSearchQuery={runtime.setSearchQuery}
      toggleSearch={runtime.toggleSearch}
      uploadFile={runtime.uploadFile}
      workspaceUuid={runtime.workspaceUuid}
    />
  );
}
