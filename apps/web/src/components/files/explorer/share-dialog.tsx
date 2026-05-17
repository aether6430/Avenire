"use client";

import { Button } from "@avenire/ui/components/button";
import { Dialog, DialogTrigger } from "@avenire/ui/components/dialog";
import { ShareNetwork as Share2 } from "@phosphor-icons/react";
import { useState } from "react";
import type {
  FileRecord,
  FolderRecord,
  ShareSuggestion,
} from "@/components/files/explorer/shared";
import { ShareDialogFileContent } from "./share-dialog-file-content";
import { ShareDialogFolderContent } from "./share-dialog-folder-content";
import { ShareDialogWorkspaceContent } from "./share-dialog-workspace-content";

export interface ShareDialogProps {
  activeFile?: FileRecord | null;
  compact?: boolean;
  currentFolder?: FolderRecord | null;
  hideTrigger?: boolean;
  isAtWorkspaceRoot?: boolean;
  loadShareSuggestions: (q: string, cb: (s: ShareSuggestion[]) => void) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  segmented?: boolean;
  variant: "file" | "folder";
  workspaceUuid: string;
}

function ShareDialogTriggerButton({
  compact,
  segmented,
  variant,
}: {
  compact: boolean;
  segmented: boolean;
  variant: "file" | "folder";
}) {
  if (variant === "file") {
    return (
      <DialogTrigger
        render={
          <Button
            className={
              segmented
                ? "h-9 w-9 rounded-none border-0 bg-transparent shadow-none"
                : compact
                  ? "h-7 w-7"
                  : "size-5"
            }
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <Share2 className="size-3" />
      </DialogTrigger>
    );
  }

  return (
    <DialogTrigger
      render={
        <Button
          className={
            segmented
              ? "h-9 rounded-none border-0 bg-transparent px-3 text-xs shadow-none"
              : compact
                ? "h-7 gap-1.5 rounded-md px-2 text-xs"
                : "rounded-md"
          }
          size="sm"
          type="button"
          variant="outline"
        />
      }
    >
      <Share2 className={compact ? "size-3" : "size-3.5"} />
      Share
    </DialogTrigger>
  );
}

export function ShareDialog({
  variant,
  compact = false,
  segmented = false,
  hideTrigger = false,
  open,
  onOpenChange,
  workspaceUuid,
  activeFile,
  currentFolder,
  isAtWorkspaceRoot = false,
  loadShareSuggestions,
}: ShareDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open ?? internalOpen;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  if (variant === "file") {
    if (!activeFile || activeFile.readOnly) {
      return null;
    }

    return (
      <Dialog onOpenChange={handleDialogOpenChange} open={dialogOpen}>
        {hideTrigger ? null : (
          <ShareDialogTriggerButton
            compact={compact}
            segmented={segmented}
            variant="file"
          />
        )}
        <ShareDialogFileContent
          activeFile={activeFile}
          loadShareSuggestions={loadShareSuggestions}
          open={dialogOpen}
          workspaceUuid={workspaceUuid}
        />
      </Dialog>
    );
  }

  if (!(isAtWorkspaceRoot || (currentFolder && !currentFolder.readOnly))) {
    return null;
  }

  return (
    <Dialog onOpenChange={handleDialogOpenChange} open={dialogOpen}>
      {hideTrigger ? null : (
        <ShareDialogTriggerButton
          compact={compact}
          segmented={segmented}
          variant="folder"
        />
      )}
      {isAtWorkspaceRoot ? (
        <ShareDialogWorkspaceContent
          loadShareSuggestions={loadShareSuggestions}
          open={dialogOpen}
          workspaceUuid={workspaceUuid}
        />
      ) : (
        <ShareDialogFolderContent
          currentFolder={currentFolder}
          loadShareSuggestions={loadShareSuggestions}
          open={dialogOpen}
          workspaceUuid={workspaceUuid}
        />
      )}
    </Dialog>
  );
}
