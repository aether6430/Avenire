"use client";

import { Card, CardContent } from "@avenire/ui/components/card";
import { Checkbox } from "@avenire/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import { cn } from "@avenire/ui/lib/utils";
import {
  ArrowRight,
  Copy,
  FileImage,
  FolderPlus as FolderInput,
  Info,
  Pencil,
  Plus,
  ShareNetwork as Share2,
  Trash as Trash2,
  XCircle,
} from "@phosphor-icons/react";
import { DownloadSimple as ArrowDownToLine } from "@phosphor-icons/react/DownloadSimple";
import type { SelectionControlCaptureProps } from "@/components/files/explorer/explorer-cards-shared";
import type { FolderRecord } from "@/components/files/explorer/shared";
import { FolderGlyph } from "../folder-glyph";
import { toUpdatedLabel } from "./shared";

interface ExplorerFolderCardProps {
  allFolders: FolderRecord[];
  contextMenuSurfaceClass: string;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  folder: FolderRecord;
  isDropTarget: boolean;
  isMobile: boolean;
  isSelected: boolean;
  onChangeBanner: () => void;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onCreateFolderHere: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onMoveToFolder: (targetId: string) => void;
  onOpen: () => void;
  onOpenProperties: () => void;
  onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onRename: () => void;
  onResetBanner: () => void;
  onShare: () => void;
  onToggleSelected: () => void;
  previewKinds: string[];
  rowRef: (node: HTMLDivElement | null) => void;
  selectionControlCaptureProps: SelectionControlCaptureProps;
}

export function ExplorerFolderCard({
  allFolders,
  contextMenuSurfaceClass,
  dragProps,
  folder,
  isDropTarget,
  isMobile,
  isSelected,
  onChangeBanner,
  onClick,
  onContextMenu,
  onCreateFolderHere,
  onDelete,
  onDownload,
  onDuplicate,
  onMoveToFolder,
  onOpen,
  onOpenProperties,
  onPointerCancel,
  onPointerDown,
  onPointerUp,
  onRename,
  onResetBanner,
  onShare,
  onToggleSelected,
  previewKinds,
  rowRef,
  selectionControlCaptureProps,
}: ExplorerFolderCardProps) {
  const folderUpdatedLabel =
    folder.updatedAt && folder.updatedAt.length > 0
      ? toUpdatedLabel(folder.updatedAt)
      : "";

  return (
    <ContextMenu>
      <ContextMenuTrigger {...({ disabled: isMobile } as any)}>
        <Card
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-2xl border border-transparent bg-transparent p-2 ring-0 transition",
            isSelected && "border border-primary bg-primary/5",
            isDropTarget &&
              "border-primary/80 bg-primary/20 shadow-[0_0_0_1px_rgba(59,130,246,0.25)] ring-2 ring-primary/60"
          )}
          data-drop-folder-id={folder.id}
          data-select-item="true"
          onClick={onClick}
          onContextMenu={onContextMenu}
          onPointerCancel={onPointerCancel}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          ref={rowRef}
          style={{
            containIntrinsicSize: "214px 160px",
            contentVisibility: "auto",
            width: 160,
          }}
          {...dragProps}
        >
          <div
            className="absolute top-2 left-2 z-20 rounded-md bg-background/90 p-1 shadow-sm backdrop-blur-sm"
            data-selection-control="true"
            onClickCapture={selectionControlCaptureProps.onClickCapture}
            onMouseDownCapture={selectionControlCaptureProps.onMouseDownCapture}
            onPointerDownCapture={
              selectionControlCaptureProps.onPointerDownCapture
            }
          >
            <Checkbox checked={isSelected} onCheckedChange={onToggleSelected} />
          </div>
          <CardContent className="space-y-2 px-0 pt-0">
            <div className="group relative flex h-28 w-full min-w-0 items-center justify-center overflow-hidden rounded-lg border border-border/45 bg-muted/70 p-1.5">
              <FolderGlyph
                className="transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                previewKinds={previewKinds}
              />
            </div>
            <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                  folder
                </span>
                <span
                  className="min-w-0 flex-1 truncate font-medium text-sm"
                  title={folder.name}
                >
                  {folder.name}
                </span>
              </div>
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                {folderUpdatedLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className={contextMenuSurfaceClass}>
        <ContextMenuItem onClick={onOpen}>
          <ArrowRight className="size-3.5" />
          Open
        </ContextMenuItem>
        {folder.readOnly ? null : (
          <>
            <ContextMenuItem onClick={onRename}>
              <Pencil className="size-3.5" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={onDuplicate}>
              <Copy className="size-3.5" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem onClick={onShare}>
              <Share2 className="size-3.5" />
              Share
            </ContextMenuItem>
            <ContextMenuItem onClick={onChangeBanner}>
              <FileImage className="size-3.5" />
              Change banner
            </ContextMenuItem>
            <ContextMenuItem onClick={onResetBanner}>
              <XCircle className="size-3.5" />
              Reset banner
            </ContextMenuItem>
            <ContextMenuItem onClick={onCreateFolderHere}>
              <Plus className="size-3.5" />
              New folder here
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderInput className="size-3.5" />
                Move to
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className={contextMenuSurfaceClass}>
                {allFolders
                  .filter(
                    (target) => target.id !== folder.id && !target.readOnly
                  )
                  .slice(0, 20)
                  .map((target) => (
                    <ContextMenuItem
                      key={target.id}
                      onClick={() => onMoveToFolder(target.id)}
                    >
                      {target.name}
                    </ContextMenuItem>
                  ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onClick={onDownload}>
              <ArrowDownToLine className="size-3.5" />
              Download (as Zip)
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem onClick={onOpenProperties}>
          <Info className="size-3.5" />
          Properties
        </ContextMenuItem>
        {folder.readOnly ? null : (
          <ContextMenuItem onClick={onDelete} variant="destructive">
            <Trash2 className="size-3.5" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
