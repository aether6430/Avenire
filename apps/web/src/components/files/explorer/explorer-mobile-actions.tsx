"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { FileText, Folder, LinkSimple, Upload } from "@phosphor-icons/react";
import { FilePlus as FilePlus2 } from "@phosphor-icons/react/FilePlus";
import type { ExplorerMobileConfirmAction } from "./explorer-mobile-actions-model";
import { getExplorerMobileConfirmCopy } from "./explorer-mobile-actions-model";

export interface ExplorerMobileActionsProps {
  canMoveSelectionUp: boolean;
  currentFolderId: string;
  isCurrentFolderReadOnly: boolean;
  mobileConfirmAction: ExplorerMobileConfirmAction | null;
  mobileCreateMenuOpen: boolean;
  onClearSelection: () => void;
  onConfirmAction: (action: ExplorerMobileConfirmAction) => void;
  onCreateFolder: (folderId: string) => void;
  onCreateNote: (folderId: string) => void;
  onImportLink: (folderId: string) => void;
  onMobileConfirmActionChange: (
    action: ExplorerMobileConfirmAction | null
  ) => void;
  onMobileCreateMenuOpenChange: (open: boolean) => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
  selectedCount: number;
}

export function ExplorerMobileActions({
  canMoveSelectionUp,
  currentFolderId,
  isCurrentFolderReadOnly,
  mobileConfirmAction,
  mobileCreateMenuOpen,
  onClearSelection,
  onConfirmAction,
  onCreateFolder,
  onCreateNote,
  onImportLink,
  onMobileConfirmActionChange,
  onMobileCreateMenuOpenChange,
  onUploadFile,
  onUploadFolder,
  selectedCount,
}: ExplorerMobileActionsProps) {
  const confirmCopy = getExplorerMobileConfirmCopy(mobileConfirmAction);

  return (
    <>
      {selectedCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-border/40 border-t bg-background px-4 py-3 md:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto">
              <p className="font-medium text-sm">{selectedCount} selected</p>
              <p className="text-muted-foreground text-xs">
                Move or delete the selected items.
              </p>
            </div>
            <Button
              disabled={!canMoveSelectionUp}
              onClick={() => onMobileConfirmActionChange("move")}
              size="sm"
              type="button"
              variant="outline"
            >
              Move up
            </Button>
            <Button
              onClick={() => onMobileConfirmActionChange("delete")}
              size="sm"
              type="button"
              variant="destructive"
            >
              Delete
            </Button>
            <Button
              onClick={onClearSelection}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        onOpenChange={onMobileCreateMenuOpenChange}
        open={mobileCreateMenuOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create</DialogTitle>
            <DialogDescription>
              Choose what you want to create in this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              disabled={isCurrentFolderReadOnly}
              onClick={() => {
                onMobileCreateMenuOpenChange(false);
                onCreateNote(currentFolderId);
              }}
              type="button"
              variant="outline"
            >
              <FileText className="size-4" />
              New note
            </Button>
            <Button
              disabled={isCurrentFolderReadOnly}
              onClick={() => {
                onMobileCreateMenuOpenChange(false);
                onImportLink(currentFolderId);
              }}
              type="button"
              variant="outline"
            >
              <LinkSimple className="size-4" />
              Import link
            </Button>
            <Button
              disabled={isCurrentFolderReadOnly}
              onClick={() => {
                onMobileCreateMenuOpenChange(false);
                onCreateFolder(currentFolderId);
              }}
              type="button"
              variant="outline"
            >
              <Folder className="size-4" />
              New folder
            </Button>
            <Button
              disabled={isCurrentFolderReadOnly}
              onClick={() => {
                onMobileCreateMenuOpenChange(false);
                onUploadFile();
              }}
              type="button"
              variant="outline"
            >
              <Upload className="size-4" />
              Upload file
            </Button>
            <Button
              disabled={isCurrentFolderReadOnly}
              onClick={() => {
                onMobileCreateMenuOpenChange(false);
                onUploadFolder();
              }}
              type="button"
              variant="outline"
            >
              <FilePlus2 className="size-4" />
              Upload folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            onMobileConfirmActionChange(null);
          }
        }}
        open={mobileConfirmAction !== null}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmCopy?.title ?? "Confirm action"}</DialogTitle>
            <DialogDescription>
              {confirmCopy?.description ?? "Confirm the selected action."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => onMobileConfirmActionChange(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!mobileConfirmAction) {
                  return;
                }
                onConfirmAction(mobileConfirmAction);
              }}
              type="button"
              variant={confirmCopy?.confirmVariant ?? "default"}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
