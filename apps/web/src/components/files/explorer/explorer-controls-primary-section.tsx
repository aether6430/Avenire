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
    <div className="flex min-w-0 items-center gap-2 max-[340px]:w-full max-[340px]:flex-wrap max-[340px]:items-start max-[340px]:gap-y-2">
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
      <div className="min-w-0 max-[340px]:order-3 max-[340px]:basis-full">
        <h1 className="line-clamp-2 font-semibold text-[1.45rem] leading-tight tracking-tight max-[340px]:text-[1.2rem] max-[340px]:leading-snug sm:truncate sm:text-[1.9rem]">
          {currentLocationTitle}
        </h1>
      </div>
      <div className="max-[340px]:order-2 max-[340px]:ml-auto">
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
    </div>
  );
}
