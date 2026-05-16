"use client";

import { measureElement, useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useState } from "react";
import { shouldEnableExplorerRealtime } from "@/components/files/explorer/explorer-realtime-model";
import type { ExplorerUploadQueueItem } from "@/components/files/explorer/explorer-upload-model";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import { useExplorerCommandRouting } from "@/components/files/explorer/use-explorer-command-routing";
import type { useExplorerEditWorkflows } from "@/components/files/explorer/use-explorer-edit-workflows";
import { useExplorerFileOperations } from "@/components/files/explorer/use-explorer-file-operations";
import { useExplorerItemInteractions } from "@/components/files/explorer/use-explorer-item-interactions";
import type { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";
import type { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";
import { useExplorerRealtimeSync } from "@/components/files/explorer/use-explorer-realtime-sync";
import { useExplorerUploadWorkflows } from "@/components/files/explorer/use-explorer-upload-workflows";
import { useFileDragDrop } from "@/hooks/use-file-drag-drop";
import { useFileSelection } from "@/hooks/use-file-selection";
import { useHaptics } from "@/hooks/use-haptics";
import { useIsTouchDevice } from "@/hooks/use-touch-device";
import { useUploadThing } from "@/lib/uploadthing";
import { useFilesActivityStore } from "@/stores/filesActivityStore";

const MOBILE_LONG_PRESS_DELAY_MS = 450;
const ITEM_ACTION_TARGET_SELECTOR =
  "[data-item-actions='true'], [data-selection-control='true'], button, a, input, textarea, select, label";
const FILE_EXPLORER_LIST_ROW_ESTIMATE = 52;

interface UseExplorerRuntimeOptions {
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  breadcrumbs: FolderRecord[];
  contextActionIdsRef: React.MutableRefObject<{
    itemId: string;
    ids: string[];
  } | null>;
  currentFolderId: string;
  editWorkflows: ReturnType<typeof useExplorerEditWorkflows>;
  emitSync: () => void;
  explorerEntryCount: number;
  explorerScrollRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  isCurrentFolderReadOnly: boolean;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  loadFolder: (options?: { silent?: boolean }) => Promise<void>;
  loadTree: () => Promise<void>;
  mobileLongPressTimerRef: React.MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
  mobileSuppressClickRef: React.MutableRefObject<string | null>;
  navigation: ReturnType<typeof useExplorerNavigation>;
  noteWorkflows: ReturnType<typeof useExplorerNoteWorkflows>;
  onOpenMobileCreateMenu: () => void;
  refreshDataDebounced: () => void;
  viewMode: "cards" | "list";
  visibleItemIds: string[];
  workspaceUuid: string;
}

export function useExplorerRuntime({
  allFiles,
  allFolders,
  breadcrumbs,
  contextActionIdsRef,
  currentFolderId,
  editWorkflows,
  emitSync,
  explorerEntryCount,
  explorerScrollRef,
  fileInputRef,
  folderInputRef,
  gridRef,
  isCurrentFolderReadOnly,
  itemRefs,
  loadFolder,
  loadTree,
  mobileLongPressTimerRef,
  mobileSuppressClickRef,
  navigation,
  noteWorkflows,
  onOpenMobileCreateMenu,
  refreshDataDebounced,
  viewMode,
  visibleItemIds,
  workspaceUuid,
}: UseExplorerRuntimeOptions) {
  const { startUpload } = useUploadThing("fileExplorerUploader");
  const isMobile = useIsTouchDevice();
  const selection = useFileSelection({ gridRef, itemRefs });
  const triggerHaptic = useHaptics();
  const updateWorkspaceQueue = useFilesActivityStore(
    (state) => state.updateWorkspaceQueue
  );
  const queuesByWorkspace = useFilesActivityStore(
    (state) => state.queuesByWorkspace
  );
  const [realtimeReady, setRealtimeReady] = useState(false);
  const setUploadQueue = useCallback(
    (
      updater:
        | ExplorerUploadQueueItem[]
        | ((previous: ExplorerUploadQueueItem[]) => ExplorerUploadQueueItem[])
    ) => {
      if (!workspaceUuid) {
        return;
      }
      updateWorkspaceQueue(workspaceUuid, updater);
    },
    [updateWorkspaceQueue, workspaceUuid]
  );
  const workspaceQueue = queuesByWorkspace[workspaceUuid] ?? [];

  useEffect(() => {
    if (realtimeReady || typeof window === "undefined") {
      return;
    }

    const markReady = () => {
      setRealtimeReady(true);
    };

    const cleanupListeners = () => {
      window.removeEventListener("pointerdown", markReady);
      window.removeEventListener("keydown", markReady);
    };

    window.addEventListener("pointerdown", markReady, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", markReady, { once: true });

    return () => {
      cleanupListeners();
    };
  }, [realtimeReady]);

  const fileOperations = useExplorerFileOperations({
    allFiles,
    allFolders,
    contextActionIdsRef,
    emitSync,
    loadFolder,
    loadTree,
    selection,
    workspaceUuid,
  });

  const uploadWorkflows = useExplorerUploadWorkflows({
    allFolders,
    currentFolderId,
    emitSync,
    isCurrentFolderReadOnly,
    loadFolder,
    loadTree,
    setUploadQueue,
    startUpload,
    workspaceUuid,
  });

  const dragDrop = useFileDragDrop({
    currentFolderId,
    enableTouchDrag: !isMobile,
    getDropUploadCandidates: uploadWorkflows.getDropUploadCandidates,
    isCurrentFolderReadOnly,
    moveItemsToFolder: fileOperations.moveItemsToFolder,
    queueUploads: uploadWorkflows.queueUploads,
    selection,
  });

  const itemInteractions = useExplorerItemInteractions({
    contextActionIdsRef,
    isMobile,
    itemActionTargetSelector: ITEM_ACTION_TARGET_SELECTOR,
    mobileLongPressDelayMs: MOBILE_LONG_PRESS_DELAY_MS,
    mobileLongPressTimerRef,
    mobileSuppressClickRef,
    onMobileCanvasLongPress: onOpenMobileCreateMenu,
    selection,
    triggerHaptic,
  });

  const commandRouting = useExplorerCommandRouting({
    allFiles,
    allFolders,
    breadcrumbs,
    currentFolderId,
    deleteSelectionItems: fileOperations.deleteSelectionItems,
    fileInputRef,
    folderInputRef,
    getSelectedActionItems: fileOperations.getSelectedActionItems,
    moveItemsToFolder: fileOperations.moveItemsToFolder,
    navigateToFolder: navigation.navigateToFolder,
    openCreateFolderDialog: editWorkflows.openCreateFolderDialog,
    openCreateNoteDialog: editWorkflows.openCreateNoteDialog,
    openFileById: navigation.openFileById,
    openImportLinkDialog: noteWorkflows.openImportLinkDialog,
    redoLatestFileOperation: fileOperations.redoLatestFileOperation,
    selection,
    undoLatestFileOperation: fileOperations.undoLatestFileOperation,
    visibleItemIds,
  });

  useExplorerRealtimeSync({
    enabled: realtimeReady && shouldEnableExplorerRealtime(workspaceQueue),
    refreshDataDebounced,
    setUploadQueue,
    workspaceUuid,
  });

  const listVirtualizer = useVirtualizer({
    count: explorerEntryCount,
    estimateSize: () => FILE_EXPLORER_LIST_ROW_ESTIMATE,
    getScrollElement: () =>
      viewMode === "list" ? explorerScrollRef.current : null,
    measureElement,
    overscan: 10,
  });

  useEffect(() => {
    return () => {
      if (mobileLongPressTimerRef.current) {
        clearTimeout(mobileLongPressTimerRef.current);
      }
    };
  }, [mobileLongPressTimerRef]);

  const triggerHapticSuccess = useCallback(() => {
    triggerHaptic("success");
  }, [triggerHaptic]);

  return {
    commandRouting,
    dragDrop,
    fileOperations,
    isMobile,
    itemInteractions,
    listVirtualizer,
    selection,
    triggerHapticSuccess,
    uploadWorkflows,
  };
}
