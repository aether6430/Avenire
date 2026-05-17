"use client";

import type { buildExplorerBrowsePaneProps } from "@/components/files/explorer/explorer-browse-pane-props";
import type { buildExplorerPreviewPaneProps } from "@/components/files/explorer/explorer-preview-pane-props";
import type { useExplorerCurrentFolderActions } from "@/components/files/explorer/use-explorer-current-folder-actions";
import type { useExplorerDerivedState } from "@/components/files/explorer/use-explorer-derived-state";
import type { useExplorerEditWorkflows } from "@/components/files/explorer/use-explorer-edit-workflows";
import type { useExplorerFileOperations } from "@/components/files/explorer/use-explorer-file-operations";
import type { useExplorerItemInteractions } from "@/components/files/explorer/use-explorer-item-interactions";
import type { useExplorerNavigation } from "@/components/files/explorer/use-explorer-navigation";
import type { useExplorerNoteWorkflows } from "@/components/files/explorer/use-explorer-note-workflows";
import type { useExplorerPaneHeader } from "@/components/files/explorer/use-explorer-pane-header";
import type { useExplorerPropertyControls } from "@/components/files/explorer/use-explorer-property-controls";
import type { useExplorerSearchSurface } from "@/components/files/explorer/use-explorer-search-surface";
import type { useExplorerShareDialogs } from "@/components/files/explorer/use-explorer-share-dialogs";
import type { useExplorerSurfaceUiState } from "@/components/files/explorer/use-explorer-surface-ui-state";
import type { useExplorerUploadWorkflows } from "@/components/files/explorer/use-explorer-upload-workflows";
import type { useFileDragDrop } from "@/hooks/use-file-drag-drop";
import type { useFileSelection } from "@/hooks/use-file-selection";

export interface UseExplorerPaneSurfacesOptions {
  activeFile: ReturnType<typeof useExplorerDerivedState>["activeFile"];
  allFiles: Parameters<typeof buildExplorerPreviewPaneProps>[0]["allFiles"];
  allFolders: Parameters<typeof buildExplorerBrowsePaneProps>[0]["allFolders"];
  breadcrumbs: Parameters<typeof useExplorerPaneHeader>[0]["breadcrumbs"];
  canClosePane: Parameters<typeof useExplorerPaneHeader>[0]["canClosePane"];
  closePane: Parameters<typeof useExplorerPaneHeader>[0]["closePane"];
  currentFolderId: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["currentFolderId"];
  derivedState: ReturnType<typeof useExplorerDerivedState>;
  dragDrop: ReturnType<typeof useFileDragDrop>;
  editWorkflows: ReturnType<typeof useExplorerEditWorkflows>;
  fileInputRef: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["fileInputRef"];
  fileOperations: ReturnType<typeof useExplorerFileOperations>;
  focusSearchSignal: number;
  folderInputRef: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["folderInputRef"];
  gridRef: Parameters<typeof buildExplorerBrowsePaneProps>[0]["gridRef"];
  isMobile: boolean;
  itemInteractions: ReturnType<typeof useExplorerItemInteractions>;
  itemRefs: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["setItemRowRefMap"];
  listMeasureElement: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["listMeasureElement"];
  listTotalSize: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["listTotalSize"];
  listVirtualItems: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["listVirtualItems"];
  loading: Parameters<typeof buildExplorerBrowsePaneProps>[0]["loading"];
  navigation: ReturnType<typeof useExplorerNavigation>;
  noteWorkflows: ReturnType<typeof useExplorerNoteWorkflows>;
  openPane: Parameters<typeof useExplorerCurrentFolderActions>[0]["openPane"];
  paneId: Parameters<typeof useExplorerCurrentFolderActions>[0]["paneId"];
  propertyControls: ReturnType<typeof useExplorerPropertyControls>;
  refreshCurrentFolder: () => Promise<unknown>;
  scrollRef: Parameters<typeof buildExplorerBrowsePaneProps>[0]["scrollRef"];
  searchSurface: ReturnType<typeof useExplorerSearchSurface>;
  selection: ReturnType<typeof useFileSelection>;
  setPropertyDefinitions: Parameters<
    typeof buildExplorerPreviewPaneProps
  >[0]["setPropertyDefinitions"];
  setSortState: Parameters<
    typeof buildExplorerBrowsePaneProps
  >[0]["setSortState"];
  shareDialogs: ReturnType<typeof useExplorerShareDialogs>;
  shell: {
    setViewMode: Parameters<
      typeof buildExplorerBrowsePaneProps
    >[0]["setViewMode"];
    viewMode: Parameters<typeof buildExplorerBrowsePaneProps>[0]["viewMode"];
  };
  sortState: Parameters<typeof buildExplorerBrowsePaneProps>[0]["sortState"];
  startBannerUpload: Parameters<
    typeof buildExplorerPreviewPaneProps
  >[0]["startBannerUpload"];
  triggerHapticSuccess: () => void;
  uiState: ReturnType<typeof useExplorerSurfaceUiState>;
  uploadWorkflows: ReturnType<typeof useExplorerUploadWorkflows>;
  workspaceUuid: Parameters<
    typeof buildExplorerPreviewPaneProps
  >[0]["workspaceUuid"];
}
