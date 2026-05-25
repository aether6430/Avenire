"use client";

import { Button } from "@avenire/ui/components/button";
import { Dialog, DialogTrigger } from "@avenire/ui/components/dialog";
import { ShareNetwork as Share2 } from "@phosphor-icons/react";
import { ShareDialogFileContent } from "@/components/files/explorer/share-dialog-file-content";
import { ShareDialogFolderContent } from "@/components/files/explorer/share-dialog-folder-content";
import { ShareDialogWorkspaceContent } from "@/components/files/explorer/share-dialog-workspace-content";
import type {
  FileRecord,
  FolderRecord,
  ShareSuggestion,
} from "@/components/files/explorer/shared";

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

function renderShareDialogTrigger(options: {
  compact: boolean;
  hideTrigger: boolean;
  segmented: boolean;
  variant: "file" | "folder";
}) {
  if (options.hideTrigger) {
    return null;
  }

  if (options.variant === "file") {
    return (
      <DialogTrigger
        render={
          <Button
            className={
              options.segmented
                ? "h-9 w-9 rounded-none border-0 bg-transparent shadow-none"
                : options.compact
                  ? "h-7 w-7"
                  : "size-5"
            }
            size="icon-xs"
            type="button"
            variant={options.segmented ? "ghost" : "ghost"}
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
            options.segmented
              ? "h-9 rounded-none border-0 bg-transparent px-3 text-xs shadow-none"
              : options.compact
                ? "h-7 gap-1.5 rounded-md px-2 text-xs"
                : "rounded-md"
          }
          size="sm"
          type="button"
          variant="outline"
        />
      }
    >
      <Share2 className={options.compact ? "size-3" : "size-3.5"} />
      Share
    </DialogTrigger>
  );
}

export function ShareDialog({
  activeFile,
  compact = false,
  currentFolder,
  hideTrigger = false,
  isAtWorkspaceRoot = false,
  loadShareSuggestions,
  onOpenChange,
  open,
  segmented = false,
  variant,
  workspaceUuid,
}: ShareDialogProps) {
  const trigger = renderShareDialogTrigger({
    compact,
    hideTrigger,
    segmented,
    variant,
  });

  if (variant === "file") {
    if (!activeFile || activeFile.readOnly) {
      return null;
    }

    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        {trigger}
        <ShareDialogFileContent
          activeFile={activeFile}
          loadShareSuggestions={loadShareSuggestions}
          open={open ?? false}
          workspaceUuid={workspaceUuid}
        />
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {trigger}
      {isAtWorkspaceRoot ? (
        <ShareDialogWorkspaceContent
          loadShareSuggestions={loadShareSuggestions}
          open={open ?? false}
          workspaceUuid={workspaceUuid}
        />
      ) : (
        <ShareDialogFolderContent
          currentFolder={currentFolder}
          loadShareSuggestions={loadShareSuggestions}
          open={open ?? false}
          workspaceUuid={workspaceUuid}
        />
      )}
    </Dialog>
  );
}
