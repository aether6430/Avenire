"use client";

import { Input } from "@avenire/ui/components/input";
import { SidebarGroup } from "@avenire/ui/components/sidebar";
import type { Route } from "next";
import { type MouseEvent, type RefObject, useEffect, useRef } from "react";
import { SidebarFilesPanelActionsSection } from "@/components/dashboard/sidebar-files-panel-actions-section";
import type {
  SidebarFileNode,
  SidebarFolderNode,
} from "@/components/dashboard/sidebar-files-panel-model";
import { SidebarFilesPanelPinnedSection } from "@/components/dashboard/sidebar-files-panel-pinned-section";
import { SidebarFilesPanelTreeSection } from "@/components/dashboard/sidebar-files-panel-tree-section";
import type { PinnedExplorerItem } from "@/stores/filesPinsStore";

interface SidebarFilesPanelSurfaceProps {
  createNewNote: () => void;
  currentFileId?: string;
  currentFolderId?: string;
  deleteTreeItems: (
    items: Array<{ id: string; kind: "file" | "folder" }>
  ) => Promise<void>;
  expandedTreePathIds: string[];
  filesTreeLabel: string | null;
  fileTree: SidebarFileNode[];
  fileTreePanelRef: RefObject<HTMLDivElement | null>;
  folderTree: SidebarFolderNode[];
  handlePaneIntent: (event: MouseEvent<HTMLElement>, href: Route) => boolean;
  handleTreeMoveItem: (draggedItemId: string, targetItemId: string) => void;
  importLink: () => void;
  isSearchOpen: boolean;
  navigateToFile: (
    fileId: string,
    folderId: string,
    routeWorkspaceUuid: string
  ) => void;
  navigateToFilesRoot: (options?: { openInNewPane?: boolean }) => Promise<void>;
  navigateToFolder: (folderId: string, routeWorkspaceUuid: string) => void;
  onExpandedChange: (itemIds: string[]) => void;
  openFileInNewPane: (
    fileId: string,
    folderId: string,
    routeWorkspaceUuid: string
  ) => void;
  openFolderInNewPane: (folderId: string, routeWorkspaceUuid: string) => void;
  pinnedFiles: PinnedExplorerItem[];
  pinnedFolders: PinnedExplorerItem[];
  searchQuery: string;
  selectedItemId?: string;
  setSearchQuery: (value: string) => void;
  toggleSearch: () => void;
  uploadFile: () => void;
  workspaceUuid: string | null;
}

export function SidebarFilesPanelSurface({
  createNewNote,
  currentFileId,
  currentFolderId,
  deleteTreeItems,
  expandedTreePathIds,
  fileTree,
  fileTreePanelRef,
  filesTreeLabel,
  folderTree,
  handlePaneIntent,
  handleTreeMoveItem,
  importLink,
  isSearchOpen,
  navigateToFile,
  navigateToFilesRoot,
  navigateToFolder,
  onExpandedChange,
  openFileInNewPane,
  openFolderInNewPane,
  pinnedFiles,
  pinnedFolders,
  searchQuery,
  selectedItemId,
  setSearchQuery,
  toggleSearch,
  uploadFile,
  workspaceUuid,
}: SidebarFilesPanelSurfaceProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      ref={fileTreePanelRef}
    >
      <SidebarFilesPanelActionsSection
        createNewNote={createNewNote}
        importLink={importLink}
        onToggleSearch={toggleSearch}
      />
      {isSearchOpen || searchQuery ? (
        <div className="px-2 pb-2">
          <Input
            className="h-8 text-xs"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search Files..."
            ref={searchInputRef}
            value={searchQuery}
          />
        </div>
      ) : null}

      <SidebarGroup className="min-h-0 flex-1">
        <SidebarFilesPanelPinnedSection
          handlePaneIntent={handlePaneIntent}
          navigateToFile={navigateToFile}
          navigateToFolder={navigateToFolder}
          pinnedFiles={pinnedFiles}
          pinnedFolders={pinnedFolders}
          workspaceUuid={workspaceUuid}
        />

        <SidebarFilesPanelTreeSection
          deleteTreeItems={deleteTreeItems}
          expandedTreePathIds={expandedTreePathIds}
          fileTree={fileTree}
          folderTree={folderTree}
          handlePaneIntent={handlePaneIntent}
          handleTreeMoveItem={handleTreeMoveItem}
          label={filesTreeLabel}
          navigateToFile={navigateToFile}
          navigateToFilesRoot={navigateToFilesRoot}
          navigateToFolder={navigateToFolder}
          onExpandedChange={onExpandedChange}
          openFileInNewPane={openFileInNewPane}
          openFolderInNewPane={openFolderInNewPane}
          selectedItemId={selectedItemId ?? currentFileId ?? currentFolderId}
          uploadFile={uploadFile}
          workspaceUuid={workspaceUuid}
        />
      </SidebarGroup>
    </div>
  );
}
