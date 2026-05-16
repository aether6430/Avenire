"use client";

import { useCallback, useMemo, useState } from "react";
import type { ShareDialog } from "@/components/files/explorer/share-dialog";
import type {
  FileRecord,
  FolderRecord,
  ShareSuggestion,
} from "@/components/files/explorer/shared";

interface UseExplorerShareDialogsOptions {
  workspaceUuid: string;
}

export function useExplorerShareDialogs({
  workspaceUuid,
}: UseExplorerShareDialogsOptions) {
  const [shareTargetFile, setShareTargetFile] = useState<FileRecord | null>(
    null
  );
  const [shareTargetFolder, setShareTargetFolder] =
    useState<FolderRecord | null>(null);
  const [fileShareDialogOpen, setFileShareDialogOpen] = useState(false);
  const [folderShareDialogOpen, setFolderShareDialogOpen] = useState(false);

  const loadShareSuggestions = useCallback(
    async (
      query: string,
      onResult: (suggestions: ShareSuggestion[]) => void
    ) => {
      if (!workspaceUuid) {
        onResult([]);
        return;
      }
      try {
        const url = new URL(
          `/api/workspaces/${workspaceUuid}/share/suggestions`,
          window.location.origin
        );
        if (query.trim()) {
          url.searchParams.set("q", query.trim());
        }
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
          onResult([]);
          return;
        }
        const payload = (await response.json()) as {
          suggestions?: ShareSuggestion[];
        };
        onResult(payload.suggestions ?? []);
      } catch {
        onResult([]);
      }
    },
    [workspaceUuid]
  );

  const openFileShareDialog = useCallback((file: FileRecord) => {
    if (file.readOnly) {
      return;
    }

    setShareTargetFile(file);
    setFileShareDialogOpen(true);
  }, []);

  const openFolderShareDialog = useCallback((folder: FolderRecord) => {
    if (folder.readOnly) {
      return;
    }

    setShareTargetFolder(folder);
    setFolderShareDialogOpen(true);
  }, []);

  const handleFileShareDialogOpenChange = useCallback((open: boolean) => {
    setFileShareDialogOpen(open);
    if (!open) {
      setShareTargetFile(null);
    }
  }, []);

  const handleFolderShareDialogOpenChange = useCallback((open: boolean) => {
    setFolderShareDialogOpen(open);
    if (!open) {
      setShareTargetFolder(null);
    }
  }, []);

  const fileShareDialogProps = useMemo(
    (): React.ComponentProps<typeof ShareDialog> => ({
      activeFile: shareTargetFile,
      hideTrigger: true,
      loadShareSuggestions,
      onOpenChange: handleFileShareDialogOpenChange,
      open: fileShareDialogOpen,
      variant: "file",
      workspaceUuid,
    }),
    [
      fileShareDialogOpen,
      handleFileShareDialogOpenChange,
      loadShareSuggestions,
      shareTargetFile,
      workspaceUuid,
    ]
  );

  const folderShareDialogProps = useMemo(
    (): React.ComponentProps<typeof ShareDialog> => ({
      currentFolder: shareTargetFolder,
      hideTrigger: true,
      loadShareSuggestions,
      onOpenChange: handleFolderShareDialogOpenChange,
      open: folderShareDialogOpen,
      variant: "folder",
      workspaceUuid,
    }),
    [
      folderShareDialogOpen,
      handleFolderShareDialogOpenChange,
      loadShareSuggestions,
      shareTargetFolder,
      workspaceUuid,
    ]
  );

  return {
    fileShareDialogProps,
    folderShareDialogProps,
    openFileShareDialog,
    openFolderShareDialog,
  };
}
