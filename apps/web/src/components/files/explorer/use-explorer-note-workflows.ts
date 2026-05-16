"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ExplorerLinkImportDialogState } from "@/components/files/explorer/explorer-content-dialog-model";
import type { FileRecord } from "@/components/files/explorer/shared";

interface UseExplorerNoteWorkflowsOptions {
  isCurrentFolderReadOnly: boolean;
  openWorkspaceFileInFolder: (folderId: string, fileId: string) => void;
  workspaceUuid: string;
}

export function useExplorerNoteWorkflows({
  isCurrentFolderReadOnly,
  openWorkspaceFileInFolder,
  workspaceUuid,
}: UseExplorerNoteWorkflowsOptions) {
  const [noteCreateBusy, setNoteCreateBusy] = useState(false);
  const [linkImportDialog, setLinkImportDialog] =
    useState<ExplorerLinkImportDialogState | null>(null);
  const [linkImportBusy, setLinkImportBusy] = useState(false);

  const createNote = useCallback(
    async (parentId: string, name: string) => {
      if (!(workspaceUuid && parentId) || noteCreateBusy) {
        return;
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      const fileName = /\.mdx?$/i.test(trimmedName)
        ? trimmedName
        : `${trimmedName}.md`;
      const noteTitle = fileName.replace(/\.mdx?$/i, "") || "Untitled";

      setNoteCreateBusy(true);
      try {
        const response = await fetch(
          `/api/workspaces/${workspaceUuid}/files/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folderId: parentId,
              name: fileName,
              content: `# ${noteTitle}\n`,
              metadata: {
                type: "note",
              },
            }),
          }
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error ?? "Unable to create note.");
        }

        const payload = (await response.json()) as { file?: FileRecord };
        const created = payload.file;
        if (created?.id) {
          openWorkspaceFileInFolder(parentId, created.id);
        }
      } catch (error) {
        console.error(
          error instanceof Error ? error.message : "Unable to create note."
        );
      } finally {
        setNoteCreateBusy(false);
      }
    },
    [noteCreateBusy, openWorkspaceFileInFolder, workspaceUuid]
  );

  const openImportLinkDialog = useCallback(
    (parentId: string) => {
      if (!parentId || isCurrentFolderReadOnly) {
        return;
      }

      setLinkImportDialog({
        folderId: parentId,
        name: "",
        url: "",
      });
    },
    [isCurrentFolderReadOnly]
  );

  const importLinkAsResource = useCallback(async () => {
    if (!(workspaceUuid && linkImportDialog)) {
      return;
    }

    const normalizedUrl = linkImportDialog.url.trim();
    if (!normalizedUrl || linkImportBusy) {
      return;
    }

    setLinkImportBusy(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceUuid}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: linkImportDialog.folderId,
          name: linkImportDialog.name,
          url: normalizedUrl,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        file?: FileRecord;
      };
      if (!(response.ok && payload.file?.id)) {
        throw new Error(payload.error ?? "Unable to import link.");
      }

      const targetFolderId = linkImportDialog.folderId;
      setLinkImportDialog(null);
      toast.success("Link saved and queued for ingestion.");
      openWorkspaceFileInFolder(targetFolderId, payload.file.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to import link."
      );
    } finally {
      setLinkImportBusy(false);
    }
  }, [
    linkImportBusy,
    linkImportDialog,
    openWorkspaceFileInFolder,
    workspaceUuid,
  ]);

  const contentDialogProps = useMemo(
    () => ({
      linkImportBusy,
      linkImportDialog,
      onImportLinkAsResource: () => {
        void importLinkAsResource();
      },
      onLinkImportDialogOpenChange: (open: boolean) => {
        if (!(open || linkImportBusy)) {
          setLinkImportDialog(null);
        }
      },
      onLinkImportNameChange: (value: string) => {
        setLinkImportDialog((current) =>
          current ? { ...current, name: value } : current
        );
      },
      onLinkImportUrlChange: (value: string) => {
        setLinkImportDialog((current) =>
          current ? { ...current, url: value } : current
        );
      },
    }),
    [importLinkAsResource, linkImportBusy, linkImportDialog]
  );

  return {
    contentDialogProps,
    createNote,
    openImportLinkDialog,
  };
}
