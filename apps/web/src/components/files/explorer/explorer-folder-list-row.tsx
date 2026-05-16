"use client";

import { Checkbox } from "@avenire/ui/components/checkbox";
import type { ExplorerItemActionsProps } from "@/components/files/explorer/explorer-item-actions";
import { ExplorerItemActions } from "@/components/files/explorer/explorer-item-actions";
import { buildExplorerFolderListRowModel } from "@/components/files/explorer/explorer-list-row-model";
import type { SelectionControlCaptureProps } from "@/components/files/explorer/explorer-list-rows-shared";
import { FolderGlyph } from "@/components/files/folder-glyph";
import { cn } from "@/lib/utils";

interface ExplorerFolderListRowProps {
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  fileCount: number;
  folderCount: number;
  folderId: string;
  folderName: string;
  isDropTarget: boolean;
  isMobile: boolean;
  isSelected: boolean;
  itemActionProps: ExplorerItemActionsProps;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onToggleSelected: () => void;
  previewKinds: string[];
  rowRef: (node: HTMLDivElement | null) => void;
  selectionControlCaptureProps: SelectionControlCaptureProps;
  showBorder: boolean;
  updatedAt?: string;
}

export function ExplorerFolderListRow({
  dragProps,
  folderId,
  fileCount,
  folderCount,
  folderName,
  isDropTarget,
  isMobile,
  isSelected,
  itemActionProps,
  onClick,
  onContextMenu,
  onPointerCancel,
  onPointerDown,
  onPointerUp,
  onToggleSelected,
  previewKinds,
  rowRef,
  selectionControlCaptureProps,
  showBorder,
  updatedAt,
}: ExplorerFolderListRowProps) {
  const { countsLabel, updatedLabel } = buildExplorerFolderListRowModel({
    fileCount,
    folderCount,
    updatedAt,
  });

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-3 border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/30",
        showBorder && "border-b",
        isSelected && "bg-primary/10",
        isDropTarget && "bg-primary/20 outline outline-2 outline-primary/60"
      )}
      data-drop-folder-id={folderId}
      data-select-item="true"
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      ref={rowRef}
      {...dragProps}
    >
      {isMobile ? (
        <>
          <FolderGlyph compact previewKinds={previewKinds} />
          <p className="min-w-0 flex-1 truncate font-medium text-sm">
            {folderName}
          </p>
          <ExplorerItemActions {...itemActionProps} />
        </>
      ) : (
        <>
          <div
            className="relative z-10 flex shrink-0"
            data-selection-control="true"
            onClickCapture={selectionControlCaptureProps.onClickCapture}
            onMouseDownCapture={selectionControlCaptureProps.onMouseDownCapture}
            onPointerDownCapture={
              selectionControlCaptureProps.onPointerDownCapture
            }
          >
            <Checkbox checked={isSelected} onCheckedChange={onToggleSelected} />
          </div>
          <FolderGlyph compact previewKinds={previewKinds} />
          <p className="min-w-0 flex-1 truncate font-medium text-sm">
            {folderName}
          </p>
          <div className="ml-auto flex items-center gap-6 text-muted-foreground text-xs">
            <span className="min-w-[110px] text-right tabular-nums">
              {countsLabel}
            </span>
            <span className="min-w-[72px] text-right tabular-nums">
              {updatedLabel}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
