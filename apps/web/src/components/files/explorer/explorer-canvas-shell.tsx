"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import { Spinner } from "@avenire/ui/components/spinner";
import { cn } from "@avenire/ui/lib/utils";
import {
  FilePlus as FilePlus2,
  FileText,
  LinkSimple,
  Plus,
  Upload,
} from "@phosphor-icons/react";
import { ArrowsDownUp as ArrowUpDown } from "@phosphor-icons/react/ArrowsDownUp";

interface ExplorerSelectionRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface ExplorerCanvasShellProps {
  canvasDropActive: boolean;
  canvasDropProps?: React.HTMLAttributes<HTMLDivElement>;
  children: React.ReactNode;
  currentFolderId: string;
  downloadStatus: string | null;
  gridRef: React.Ref<HTMLDivElement>;
  isCurrentFolderReadOnly: boolean;
  isMobile: boolean;
  loading: boolean;
  menuSurfaceClass: string;
  onCreateFolder: (folderId: string) => void;
  onCreateNote: (folderId: string) => void;
  onImportLink: (folderId: string) => void;
  onMobileCanvasPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onRefresh: () => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
  scrollRef: React.Ref<HTMLDivElement>;
  selectionRect: ExplorerSelectionRect | null;
}

export function ExplorerCanvasShell({
  canvasDropActive,
  canvasDropProps,
  children,
  currentFolderId,
  downloadStatus,
  gridRef,
  isCurrentFolderReadOnly,
  isMobile,
  loading,
  menuSurfaceClass,
  onCreateFolder,
  onCreateNote,
  onImportLink,
  onMobileCanvasPointerDown,
  onRefresh,
  onUploadFile,
  onUploadFolder,
  scrollRef,
  selectionRect,
}: ExplorerCanvasShellProps) {
  const handleRootContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) {
      event.preventDefault();
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
      <ContextMenu>
        <ContextMenuTrigger {...({ disabled: isMobile } as any)}>
          <div
            className="h-full overflow-visible"
            onContextMenu={handleRootContextMenu}
          >
            <div
              className={cn(
                "relative min-h-full px-3 pb-3",
                canvasDropActive &&
                  "rounded-2xl border-2 border-primary/50 bg-primary/15 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]"
              )}
              data-drop-folder-id={
                isCurrentFolderReadOnly ? undefined : currentFolderId
              }
              onContextMenu={handleRootContextMenu}
              {...canvasDropProps}
            >
              {downloadStatus ? (
                <div className="pointer-events-none absolute top-4 right-4 z-20">
                  <div className="inline-flex max-w-[24rem] items-center gap-2 rounded-full border border-border/70 bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
                    <Spinner className="size-4" />
                    <div className="min-w-0">
                      <p className="font-medium text-xs">Preparing download</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {downloadStatus}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {loading ? (
                <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-border/60 bg-muted/10">
                  <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                    <Spinner className="size-4" />
                    Loading files...
                  </div>
                </div>
              ) : (
                <div
                  className="relative min-h-[calc(100vh-14rem)]"
                  onPointerDown={onMobileCanvasPointerDown}
                  ref={gridRef}
                >
                  {children}
                  {selectionRect ? (
                    <div
                      className="pointer-events-none absolute z-20 rounded-md border border-primary/30 bg-primary/10"
                      style={{
                        left: selectionRect.x,
                        top: selectionRect.y,
                        width: selectionRect.width,
                        height: selectionRect.height,
                      }}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        {isMobile ? null : (
          <ContextMenuContent className={menuSurfaceClass}>
            <ContextMenuItem
              disabled={isCurrentFolderReadOnly}
              onClick={() => onCreateNote(currentFolderId)}
            >
              <FileText className="size-3.5" />
              New note
            </ContextMenuItem>
            <ContextMenuItem
              disabled={isCurrentFolderReadOnly}
              onClick={() => onImportLink(currentFolderId)}
            >
              <LinkSimple className="size-3.5" />
              Import link
            </ContextMenuItem>
            <ContextMenuItem
              disabled={isCurrentFolderReadOnly}
              onClick={() => onCreateFolder(currentFolderId)}
            >
              <Plus className="size-3.5" />
              New folder
            </ContextMenuItem>
            <ContextMenuItem
              disabled={isCurrentFolderReadOnly}
              onClick={onUploadFile}
            >
              <Upload className="size-3.5" />
              Upload file
            </ContextMenuItem>
            <ContextMenuItem
              disabled={isCurrentFolderReadOnly}
              onClick={onUploadFolder}
            >
              <FilePlus2 className="size-3.5" />
              Upload folder
            </ContextMenuItem>
            <ContextMenuItem onClick={onRefresh}>
              <ArrowUpDown className="size-3.5" />
              Refresh
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    </div>
  );
}
