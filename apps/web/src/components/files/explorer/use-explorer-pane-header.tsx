"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@avenire/ui/components/breadcrumb";
import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { cn } from "@avenire/ui/lib/utils";
import {
  Columns,
  Copy,
  Folder,
  FolderPlus as FolderInput,
  House,
  Info,
  DotsThree as MoreHorizontal,
  Pencil,
  PushPin as Pin,
  PushPinSlash as PinOff,
  ShareNetwork as Share2,
  SlidersHorizontal,
  Trash as Trash2,
  X,
} from "@phosphor-icons/react";
import { DownloadSimple as ArrowDownToLine } from "@phosphor-icons/react/DownloadSimple";
import { useEffect } from "react";
import type { ExplorerSurfaceInfoEntry } from "@/components/files/explorer/explorer-surface-summary-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import { usePaneHeaderActions } from "@/stores/header-store";
import {
  canUseExplorerPaneHeaderFolderActions,
  getExplorerPaneHeaderMoveTargets,
} from "./explorer-pane-header-model";

interface ExplorerPaneHeaderBreadcrumb {
  id: string;
  name: string;
}

interface UseExplorerPaneHeaderOptions {
  activeFile: FileRecord | null;
  allFolders: FolderRecord[];
  breadcrumbs: ExplorerPaneHeaderBreadcrumb[];
  canClosePane: boolean;
  closePane: (paneId: string) => void;
  currentFolder: FolderRecord | null;
  currentInfoEntries: ExplorerSurfaceInfoEntry[];
  currentLocationTitle: string;
  deleteCurrentFolder: () => void;
  downloadCurrentFolder: () => void;
  duplicateCurrentFolder: () => void;
  isAtWorkspaceRoot: boolean;
  isCurrentPinned: boolean;
  menuSurfaceClass: string;
  moveCurrentFolderTo: (targetFolderId: string) => void;
  navigateToFolder: (folderId: string) => void;
  openCurrentFolderProperties: () => void;
  openCurrentFolderRename: () => void;
  openCurrentFolderShare: () => void;
  openPaneRight: () => void;
  paneId: string;
  toggleCurrentPinnedItem: () => void;
}

export function useExplorerPaneHeader({
  activeFile,
  allFolders,
  breadcrumbs,
  canClosePane,
  closePane,
  currentFolder,
  currentInfoEntries,
  currentLocationTitle,
  deleteCurrentFolder,
  downloadCurrentFolder,
  duplicateCurrentFolder,
  isAtWorkspaceRoot,
  isCurrentPinned,
  menuSurfaceClass,
  moveCurrentFolderTo,
  navigateToFolder,
  openCurrentFolderProperties,
  openCurrentFolderRename,
  openCurrentFolderShare,
  openPaneRight,
  paneId,
  toggleCurrentPinnedItem,
}: UseExplorerPaneHeaderOptions) {
  const { resetHeaderContext, setHeaderContext } = usePaneHeaderActions();

  useEffect(() => {
    if (activeFile) {
      return;
    }

    const canUseFolderActions = canUseExplorerPaneHeaderFolderActions(
      isAtWorkspaceRoot,
      currentFolder
    );
    const moveTargets = getExplorerPaneHeaderMoveTargets(
      allFolders,
      currentFolder
    );

    setHeaderContext({
      actions: (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="Workspace actions"
                className="h-9 w-9 rounded-md border border-border/60 bg-background text-foreground shadow-sm hover:bg-muted/70"
                size="icon"
                type="button"
                variant="ghost"
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn("w-56 bg-background", menuSurfaceClass)}
          >
            <DropdownMenuItem onClick={toggleCurrentPinnedItem}>
              {isCurrentPinned ? (
                <PinOff className="size-3.5" />
              ) : (
                <Pin className="size-3.5" />
              )}
              {isCurrentPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canUseFolderActions}
              onClick={openCurrentFolderProperties}
            >
              <SlidersHorizontal className="size-3.5" />
              Properties
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canUseFolderActions}
              onClick={openCurrentFolderRename}
            >
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canUseFolderActions}
              onClick={duplicateCurrentFolder}
            >
              <Copy className="size-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canUseFolderActions}
              onClick={openCurrentFolderShare}
            >
              <Share2 className="size-3.5" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canUseFolderActions}>
                <FolderInput className="size-3.5" />
                Move To
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className={cn("w-56 bg-background", menuSurfaceClass)}
              >
                {moveTargets.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => moveCurrentFolderTo(folder.id)}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              disabled={!canUseFolderActions}
              onClick={downloadCurrentFolder}
            >
              <ArrowDownToLine className="size-3.5" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openPaneRight}>
              <Columns className="size-3.5" />
              Split right
            </DropdownMenuItem>
            {canClosePane ? (
              <DropdownMenuItem onClick={() => closePane(paneId)}>
                <X className="size-3.5" />
                Close pane
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Info className="size-3.5" />
                Metadata
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className={cn("w-56 bg-background", menuSurfaceClass)}
              >
                {currentInfoEntries.map((entry) => (
                  <div
                    className="flex items-start justify-between gap-3 px-2 py-1.5 text-xs"
                    key={entry.label}
                  >
                    <span className="text-muted-foreground">{entry.label}</span>
                    <span className="max-w-[12rem] text-right text-foreground">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!canUseFolderActions}
              onClick={deleteCurrentFolder}
              variant="destructive"
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      breadcrumbs: (
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap pr-2">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const Icon = index === 0 ? House : Folder;
              return (
                <BreadcrumbItem key={crumb.id}>
                  {isLast ? (
                    <BreadcrumbPage className="inline-flex items-center gap-2">
                      <Icon className="hidden size-3.5 text-muted-foreground sm:inline-flex" />
                      <span>{crumb.name}</span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="inline-flex items-center gap-2"
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        navigateToFolder(crumb.id);
                      }}
                    >
                      <Icon className="hidden size-3.5 text-muted-foreground sm:inline-flex" />
                      <span>{crumb.name}</span>
                    </BreadcrumbLink>
                  )}
                  {isLast ? null : <BreadcrumbSeparator />}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ),
      leadingIcon: (
        <div className="flex size-6 items-center justify-center text-muted-foreground">
          {currentFolder ? <Folder className="size-4" /> : null}
        </div>
      ),
      title: currentLocationTitle,
    });

    return () => {
      resetHeaderContext();
    };
  }, [
    activeFile,
    allFolders,
    breadcrumbs,
    canClosePane,
    closePane,
    currentFolder,
    currentInfoEntries,
    currentLocationTitle,
    deleteCurrentFolder,
    downloadCurrentFolder,
    duplicateCurrentFolder,
    isAtWorkspaceRoot,
    isCurrentPinned,
    menuSurfaceClass,
    moveCurrentFolderTo,
    navigateToFolder,
    openCurrentFolderProperties,
    openCurrentFolderRename,
    openCurrentFolderShare,
    openPaneRight,
    paneId,
    resetHeaderContext,
    setHeaderContext,
    toggleCurrentPinnedItem,
  ]);
}
