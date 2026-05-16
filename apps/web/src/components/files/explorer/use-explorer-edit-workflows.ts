"use client";

import { useCallback, useRef, useState } from "react";
import type { ExplorerEditDialogState } from "@/components/files/explorer/explorer-content-dialog-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";

interface UploadedBannerFile {
  ufsUrl?: string;
  url?: string;
}

interface UseExplorerEditWorkflowsOptions {
  allFolders: FolderRecord[];
  currentFolder: FolderRecord | null;
  emitSync: () => void;
  files: FileRecord[];
  loadFolder: (options?: { silent?: boolean }) => Promise<void>;
  loadTree: () => Promise<void>;
  onCreateNote: (parentId: string, name: string) => Promise<void>;
  startBannerUpload: (
    files: File[]
  ) => Promise<UploadedBannerFile[] | undefined>;
  workspaceUuid: string;
}

function rgbToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

async function extractImageAccentColor(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () =>
        reject(new Error("Unable to read banner image."));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const sampleWidth = 48;
    const sampleHeight = 48;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    ctx.drawImage(image, 0, 0, sampleWidth, sampleHeight);

    const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;
    let totalWeight = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      if (alpha < 0.02) {
        continue;
      }

      totalRed += data[index] * alpha;
      totalGreen += data[index + 1] * alpha;
      totalBlue += data[index + 2] * alpha;
      totalWeight += alpha;
    }

    if (totalWeight === 0) {
      return null;
    }

    return `#${rgbToHex(totalRed / totalWeight)}${rgbToHex(totalGreen / totalWeight)}${rgbToHex(totalBlue / totalWeight)}`;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function useExplorerEditWorkflows({
  allFolders,
  currentFolder,
  emitSync,
  files,
  loadFolder,
  loadTree,
  onCreateNote,
  startBannerUpload,
  workspaceUuid,
}: UseExplorerEditWorkflowsOptions) {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerUploadBusy, setBannerUploadBusy] = useState(false);
  const [editDialog, setEditDialog] = useState<ExplorerEditDialogState | null>(
    null
  );

  const createFolder = useCallback(
    async (parentId: string, name: string) => {
      if (!workspaceUuid) {
        return;
      }
      const parentFolder = allFolders.find((folder) => folder.id === parentId);
      if (parentFolder?.readOnly) {
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/folders`, {
        body: JSON.stringify({ parentId, name: trimmedName }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      await Promise.all([loadFolder(), loadTree()]);
      emitSync();
    },
    [allFolders, emitSync, loadFolder, loadTree, workspaceUuid]
  );

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      if (!workspaceUuid) {
        return;
      }
      const folder = allFolders.find((entry) => entry.id === folderId);
      if (folder?.readOnly) {
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/folders/${folderId}`, {
        body: JSON.stringify({ name: trimmedName }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      await Promise.all([loadFolder(), loadTree()]);
      emitSync();
    },
    [allFolders, emitSync, loadFolder, loadTree, workspaceUuid]
  );

  const updateFolderAppearance = useCallback(
    async (
      folderId: string,
      updates: { bannerUrl?: string | null; iconColor?: string | null }
    ) => {
      if (!workspaceUuid) {
        return;
      }

      const folder = allFolders.find((entry) => entry.id === folderId);
      if (folder?.readOnly) {
        return;
      }

      await fetch(`/api/workspaces/${workspaceUuid}/folders/${folderId}`, {
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      await Promise.all([loadFolder({ silent: true }), loadTree()]);
      emitSync();
    },
    [allFolders, emitSync, loadFolder, loadTree, workspaceUuid]
  );

  const renameFile = useCallback(
    async (fileId: string, name: string) => {
      if (!workspaceUuid) {
        return;
      }
      const file = files.find((entry) => entry.id === fileId);
      if (file?.readOnly) {
        return;
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      await fetch(`/api/workspaces/${workspaceUuid}/files/${fileId}`, {
        body: JSON.stringify({ name: trimmedName }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      await loadFolder();
      emitSync();
    },
    [emitSync, files, loadFolder, workspaceUuid]
  );

  const openCreateFolderDialog = useCallback(
    (parentId: string) => {
      if (!parentId) {
        return;
      }

      const parentFolder = allFolders.find((folder) => folder.id === parentId);
      if (parentFolder?.readOnly) {
        return;
      }

      setEditDialog({
        mode: "create-folder",
        parentId,
        value: "",
      });
    },
    [allFolders]
  );

  const openCreateNoteDialog = useCallback(
    (parentId: string) => {
      if (!parentId) {
        return;
      }

      const parentFolder = allFolders.find((folder) => folder.id === parentId);
      if (parentFolder?.readOnly) {
        return;
      }

      setEditDialog({
        mode: "create-note",
        parentId,
        value: "",
      });
    },
    [allFolders]
  );

  const openRenameFolderDialog = useCallback((folder: FolderRecord) => {
    setEditDialog({
      id: folder.id,
      mode: "rename-folder",
      value: folder.name,
    });
  }, []);

  const openRenameFileDialog = useCallback((file: FileRecord) => {
    setEditDialog({
      id: file.id,
      mode: "rename-file",
      value: file.name,
    });
  }, []);

  const applyEditDialog = useCallback(async () => {
    if (!editDialog) {
      return;
    }

    if (editDialog.mode === "create-folder" && editDialog.parentId) {
      await createFolder(editDialog.parentId, editDialog.value);
    }

    if (editDialog.mode === "create-note" && editDialog.parentId) {
      await onCreateNote(editDialog.parentId, editDialog.value);
    }

    if (editDialog.mode === "rename-folder" && editDialog.id) {
      await renameFolder(editDialog.id, editDialog.value);
    }

    if (editDialog.mode === "rename-file" && editDialog.id) {
      await renameFile(editDialog.id, editDialog.value);
    }

    setEditDialog(null);
  }, [createFolder, editDialog, onCreateNote, renameFile, renameFolder]);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditDialog(null);
    }
  }, []);

  const handleEditDialogValueChange = useCallback((value: string) => {
    setEditDialog((current) => (current ? { ...current, value } : current));
  }, []);

  const triggerBannerPicker = useCallback(
    (folderId: string) => {
      if (!folderId || bannerUploadBusy) {
        return;
      }

      const folder = allFolders.find((entry) => entry.id === folderId);
      if (folder?.readOnly || !bannerInputRef.current) {
        return;
      }

      bannerInputRef.current.dataset.folderId = folderId;
      bannerInputRef.current.click();
    },
    [allFolders, bannerUploadBusy]
  );

  const handleBannerInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const targetFolderId =
        event.currentTarget.dataset.folderId ?? currentFolder?.id ?? "";

      event.currentTarget.value = "";

      if (!(file && targetFolderId)) {
        return;
      }

      const folder = allFolders.find((entry) => entry.id === targetFolderId);
      if (folder?.readOnly) {
        return;
      }

      setBannerUploadBusy(true);
      try {
        const [accentColor, uploadedFiles] = await Promise.all([
          extractImageAccentColor(file),
          startBannerUpload([file]),
        ]);
        const uploaded = uploadedFiles?.[0];
        const uploadedUrl =
          (typeof uploaded?.ufsUrl === "string" && uploaded.ufsUrl) ||
          (typeof uploaded?.url === "string" && uploaded.url) ||
          null;

        if (!uploadedUrl) {
          return;
        }

        await updateFolderAppearance(targetFolderId, {
          bannerUrl: uploadedUrl,
          iconColor: accentColor ?? null,
        });
      } finally {
        setBannerUploadBusy(false);
      }
    },
    [allFolders, currentFolder?.id, startBannerUpload, updateFolderAppearance]
  );

  const resetFolderBanner = useCallback(
    (folderId: string) =>
      updateFolderAppearance(folderId, {
        bannerUrl: null,
        iconColor: null,
      }),
    [updateFolderAppearance]
  );

  return {
    applyEditDialog,
    bannerInputRef,
    bannerUploadBusy,
    editDialog,
    handleBannerInputChange,
    handleEditDialogOpenChange,
    handleEditDialogValueChange,
    openCreateFolderDialog,
    openCreateNoteDialog,
    openRenameFileDialog,
    openRenameFolderDialog,
    resetFolderBanner,
    triggerBannerPicker,
  };
}
