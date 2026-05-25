"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import {
  ArrowUp,
  Columns as Columns3,
  Copy,
  FileText,
  FolderPlus as FolderInput,
  Info,
  LinkSimple,
  DotsThree as MoreHorizontal,
  Pencil,
  PushPin as Pin,
  PushPinSlash as PinOff,
  ArrowCounterClockwise as RotateCcw,
  ShareNetwork as Share2,
  SlidersHorizontal,
  Trash as Trash2,
  X,
} from "@phosphor-icons/react";
import { DownloadSimple as ArrowDownToLine } from "@phosphor-icons/react/DownloadSimple";
import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import type { ExplorerSurfaceInfoEntry } from "@/components/files/explorer/explorer-surface-summary-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import { getFilePreviewPaneHeaderMoveTargets } from "./file-preview-pane-header-model";
import { toUpdatedLabel } from "./shared";

function isRenderableIconUrl(icon: string) {
  return (
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("/") ||
    icon.startsWith("data:image/")
  );
}

export function FilePreviewPaneHeaderLeadingIcon({
  activeCustomIcon,
  activeLinkSourceUrl,
}: {
  activeCustomIcon: string | null;
  activeLinkSourceUrl: string | null;
}) {
  return (
    <div className="flex size-6 items-center justify-center text-muted-foreground">
      {activeCustomIcon ? (
        isRenderableIconUrl(activeCustomIcon) ? (
          <span className="relative inline-flex size-5 items-center justify-center overflow-hidden rounded-[3px] bg-muted">
            <Image
              alt=""
              className="object-cover"
              draggable={false}
              fill
              referrerPolicy="no-referrer"
              sizes="20px"
              src={activeCustomIcon}
              unoptimized
            />
          </span>
        ) : (
          <span className="text-base leading-none">{activeCustomIcon}</span>
        )
      ) : activeLinkSourceUrl ? (
        <LinkSimple className="size-4" />
      ) : (
        <FileText className="size-4" />
      )}
    </div>
  );
}

export function FilePreviewPaneHeaderBreadcrumbs({
  activeFileIsMarkdown,
  activeFileName,
  markdownDisplayTitle,
}: {
  activeFileIsMarkdown: boolean;
  activeFileName: string;
  markdownDisplayTitle: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <span className="truncate font-medium text-foreground">
        {activeFileIsMarkdown ? markdownDisplayTitle : activeFileName}
      </span>
    </div>
  );
}

interface FilePreviewPaneHeaderActionsProps {
  activeFile: FileRecord;
  activeFileSourceUrl: string;
  allFolders: FolderRecord[];
  canClosePane: boolean;
  closePane: (paneId: string) => void;
  currentInfoEntries: ExplorerSurfaceInfoEntry[];
  deleteContextActionItems: (itemId: string, kind: "file" | "folder") => void;
  downloadContextActionItems: (
    itemId: string,
    kind: "file" | "folder",
    fallbackName: string
  ) => void;
  duplicateContextActionItems: (
    itemId: string,
    kind: "file" | "folder"
  ) => void;
  hardReingestContextActionItems: (itemId: string) => void;
  isCurrentPinned: boolean;
  isPdf: boolean;
  moveContextActionItemsToFolder: (
    itemId: string,
    kind: "file" | "folder",
    targetFolderId: string
  ) => void;
  openFileShareDialog: (file: FileRecord) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: "horizontal" | "vertical";
      splitPlacement?: "after" | "before";
    }
  ) => void;
  openPropertiesDialog: () => void;
  openRenameFileDialog: (file: FileRecord) => void;
  paneId: string;
  pdfInvertColors: boolean;
  setPdfInvertColors: Dispatch<SetStateAction<boolean>>;
  toggleCurrentPinnedItem: () => void;
}

export function FilePreviewPaneHeaderActions({
  activeFile,
  activeFileSourceUrl,
  allFolders,
  canClosePane,
  closePane,
  currentInfoEntries,
  deleteContextActionItems,
  downloadContextActionItems,
  duplicateContextActionItems,
  hardReingestContextActionItems,
  isCurrentPinned,
  isPdf,
  moveContextActionItemsToFolder,
  openFileShareDialog,
  openPane,
  openPropertiesDialog,
  openRenameFileDialog,
  paneId,
  pdfInvertColors,
  setPdfInvertColors,
  toggleCurrentPinnedItem,
}: FilePreviewPaneHeaderActionsProps) {
  const moveTargets = getFilePreviewPaneHeaderMoveTargets(allFolders);

  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2">
      <span className="hidden text-muted-foreground text-xs sm:inline">
        Edited {toUpdatedLabel(activeFile.updatedAt ?? activeFile.createdAt)}{" "}
        ago
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="File actions"
              className="h-7 w-7 rounded-md border border-border/60 bg-background text-foreground shadow-sm hover:bg-muted/70"
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
          className="w-56 border border-border/60 bg-background shadow-md"
        >
          {isPdf ? (
            <DropdownMenuCheckboxItem
              checked={pdfInvertColors}
              onCheckedChange={(checked) => {
                setPdfInvertColors(checked === true);
              }}
            >
              PDF dark mode
            </DropdownMenuCheckboxItem>
          ) : null}
          <DropdownMenuItem onClick={toggleCurrentPinnedItem}>
            {isCurrentPinned ? (
              <PinOff className="size-3.5" />
            ) : (
              <Pin className="size-3.5" />
            )}
            {isCurrentPinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openPropertiesDialog}>
            <SlidersHorizontal className="size-3.5" />
            Properties
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              window.open(activeFileSourceUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ArrowUp className="size-3.5" />
            Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openRenameFileDialog(activeFile)}>
            <Pencil className="size-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              duplicateContextActionItems(activeFile.id, "file");
            }}
          >
            <Copy className="size-3.5" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openFileShareDialog(activeFile)}>
            <Share2 className="size-3.5" />
            Share
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="size-3.5" />
              Move To
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 border border-border/60 bg-background shadow-md">
              {moveTargets.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => {
                    moveContextActionItemsToFolder(
                      activeFile.id,
                      "file",
                      folder.id
                    );
                  }}
                >
                  {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={() => {
              downloadContextActionItems(
                activeFile.id,
                "file",
                activeFile.name
              );
            }}
          >
            <ArrowDownToLine className="size-3.5" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              hardReingestContextActionItems(activeFile.id);
            }}
          >
            <RotateCcw className="size-3.5" />
            Hard Re-ingest
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              openPane("/workspace", {
                sourcePaneId: paneId,
                splitDirection: "horizontal",
                splitPlacement: "after",
              })
            }
          >
            <Columns3 className="size-3.5" />
            Split right
          </DropdownMenuItem>
          {canClosePane ? (
            <DropdownMenuItem
              onClick={() => closePane(paneId)}
              variant="destructive"
            >
              <X className="size-3.5" />
              Close pane
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Info className="size-3.5" />
              Metadata
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 border border-border/60 bg-background shadow-md">
              <div className="px-2 pt-1 pb-1 text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                Info
              </div>
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
            onClick={() => {
              deleteContextActionItems(activeFile.id, "file");
            }}
            variant="destructive"
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
