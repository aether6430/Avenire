"use client";

import { Button } from "@avenire/ui/components/button";
import {
  ArrowCounterClockwise as RotateCcw,
  ArrowClockwise as RotateCw,
} from "@phosphor-icons/react";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { ExplorerCreateMenu } from "./explorer-create-menu";

export function ExplorerControlsPrimarySection({
  canNavigateUp,
  canRedoFileOperation,
  canUndoFileOperation,
  currentFolderId,
  currentLocationTitle,
  fileOperationHistoryBusy,
  isCurrentFolderReadOnly,
  isMobile,
  menuSurfaceClass,
  onCreateFolder,
  onCreateNote,
  onImportLink,
  onNavigateUp,
  onOpenMobileCreateMenu,
  onRedo,
  onUndo,
  onUploadFile,
  onUploadFolder,
}: {
  canNavigateUp: boolean;
  canRedoFileOperation: boolean;
  canUndoFileOperation: boolean;
  currentFolderId: string;
  currentLocationTitle: string;
  fileOperationHistoryBusy: boolean;
  isCurrentFolderReadOnly: boolean;
  isMobile: boolean;
  menuSurfaceClass: string;
  onCreateFolder: (folderId: string) => void;
  onCreateNote: (folderId: string) => void;
  onImportLink: (folderId: string) => void;
  onNavigateUp: () => void;
  onOpenMobileCreateMenu: () => void;
  onRedo: () => void;
  onUndo: () => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {canNavigateUp ? (
        <Button
          aria-label="Go to parent folder"
          className="rounded-md"
          onClick={onNavigateUp}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ArrowLeft className="size-3.5" />
        </Button>
      ) : null}
      <Button
        aria-label="Undo last file operation"
        className="rounded-md"
        disabled={!canUndoFileOperation || fileOperationHistoryBusy}
        onClick={onUndo}
        size="icon-sm"
        title="Undo (Cmd/Ctrl+Z)"
        type="button"
        variant="outline"
      >
        <RotateCcw className="size-3.5" />
      </Button>
      <Button
        aria-label="Redo last file operation"
        className="rounded-md"
        disabled={!canRedoFileOperation || fileOperationHistoryBusy}
        onClick={onRedo}
        size="icon-sm"
        title="Redo (Cmd/Ctrl+Shift+Z)"
        type="button"
        variant="outline"
      >
        <RotateCw className="size-3.5" />
      </Button>
      <div className="min-w-0">
        <h1 className="truncate font-semibold text-[1.9rem] tracking-tight">
          {currentLocationTitle}
        </h1>
      </div>
      <ExplorerCreateMenu
        currentFolderId={currentFolderId}
        isCurrentFolderReadOnly={isCurrentFolderReadOnly}
        isMobile={isMobile}
        menuSurfaceClass={menuSurfaceClass}
        onCreateFolder={onCreateFolder}
        onCreateNote={onCreateNote}
        onImportLink={onImportLink}
        onOpenMobileCreateMenu={onOpenMobileCreateMenu}
        onUploadFile={onUploadFile}
        onUploadFolder={onUploadFolder}
      />
    </div>
  );
}
