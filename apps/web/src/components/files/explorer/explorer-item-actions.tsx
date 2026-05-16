"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { cn } from "@avenire/ui/lib/utils";
import {
  Copy,
  FolderPlus as FolderInput,
  Info,
  DotsThree as MoreHorizontal,
  Pencil,
  PushPin as Pin,
  PushPinSlash as PinOff,
  ArrowCounterClockwise as RotateCcw,
  ShareNetwork as Share2,
  SlidersHorizontal,
  Trash as Trash2,
  MagicWand as WandSparkles,
} from "@phosphor-icons/react";
import { DownloadSimple as ArrowDownToLine } from "@phosphor-icons/react/DownloadSimple";
import type { FolderRecord } from "@/components/files/explorer/shared";
import type { ExplorerItemActionKind } from "./explorer-item-actions-model";
import {
  getExplorerItemActionMoveTargets,
  getExplorerItemMetadataRows,
} from "./explorer-item-actions-model";

const COMPACT_MENU_SURFACE_CLASS = "border border-border/60 shadow-md";
const ACTION_ROW_CLASS = "gap-2 text-xs";

export interface ExplorerItemActionsProps {
  detail: string;
  folders: FolderRecord[];
  kind: ExplorerItemActionKind;
  name: string;
  onCircleToAi?: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onHardReingest?: () => void;
  onMetadata: () => void;
  onMoveTo: (folderId: string) => void;
  onOpenProperties: () => void;
  onRename: () => void;
  onShare: () => void;
  onTogglePin: () => void;
  pinned: boolean;
  readOnly: boolean;
  targetId: string;
}

export function ExplorerItemActions({
  detail,
  folders,
  kind,
  name,
  onCircleToAi,
  onDelete,
  onDownload,
  onDuplicate,
  onHardReingest,
  onMetadata,
  onMoveTo,
  onOpenProperties,
  onRename,
  onShare,
  onTogglePin,
  pinned,
  readOnly,
  targetId,
}: ExplorerItemActionsProps) {
  const canEdit = !readOnly;
  const moveTargets = getExplorerItemActionMoveTargets({
    folders,
    kind,
    targetId,
  });
  const metadataRows = getExplorerItemMetadataRows({
    detail,
    kind,
    targetId,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`More actions for ${name}`}
            className="h-7 w-7 shrink-0 rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm hover:bg-muted/70"
            size="icon-sm"
            type="button"
            variant="outline"
          />
        }
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
      >
        {onCircleToAi ? (
          <DropdownMenuItem onClick={onCircleToAi}>
            <WandSparkles className="size-3.5" />
            Circle to AI
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ACTION_ROW_CLASS}>
            <Info className="size-3.5" />
            Properties
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                {name}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <div className="space-y-1 px-2 pb-2 text-xs">
              {metadataRows.map((row) => (
                <div
                  className="flex items-start justify-between gap-3"
                  key={row.label}
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span
                    className={cn(
                      "text-right text-foreground",
                      row.label === "ID" ? "max-w-32 truncate" : "max-w-32"
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenProperties}>
              <SlidersHorizontal className="size-3.5" />
              Metadata
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {canEdit ? (
          <>
            <DropdownMenuItem onClick={onTogglePin}>
              {pinned ? (
                <PinOff className="size-3.5" />
              ) : (
                <Pin className="size-3.5" />
              )}
              {pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="size-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="size-3.5" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={ACTION_ROW_CLASS}>
                <FolderInput className="size-3.5" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
              >
                <ScrollArea className="max-h-48">
                  <div className="p-1">
                    {moveTargets.length === 0 ? (
                      <div className="px-2 py-2 text-center text-muted-foreground text-xs">
                        No destinations available
                      </div>
                    ) : (
                      moveTargets.map((folder) => (
                        <DropdownMenuItem
                          key={folder.id}
                          onClick={() => {
                            onMoveTo(folder.id);
                          }}
                        >
                          {folder.name}
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onDownload}>
              <ArrowDownToLine className="size-3.5" />
              Download
            </DropdownMenuItem>
            {onHardReingest ? (
              <DropdownMenuItem onClick={onHardReingest}>
                <RotateCcw className="size-3.5" />
                Hard Re-ingest
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={ACTION_ROW_CLASS}>
            <Info className="size-3.5" />
            Metadata
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("w-56 bg-background", COMPACT_MENU_SURFACE_CLASS)}
          >
            <div className="space-y-1 px-2 py-2 text-xs">
              {metadataRows.map((row) => (
                <div
                  className="flex items-start justify-between gap-3"
                  key={row.label}
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span
                    className={cn(
                      "text-right text-foreground",
                      row.label === "ID" ? "max-w-32 truncate" : "max-w-32"
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={onMetadata}>
          <SlidersHorizontal className="size-3.5" />
          Properties
        </DropdownMenuItem>
        {readOnly ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
