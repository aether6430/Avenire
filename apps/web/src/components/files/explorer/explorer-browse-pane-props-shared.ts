import type {
  ChangeEventHandler,
  ComponentProps,
  MutableRefObject,
  RefObject,
} from "react";
import type { ExplorerBrowseSurfaceProps } from "@/components/files/explorer/explorer-browse-surface-types";
import type { ExplorerCanvasShell } from "@/components/files/explorer/explorer-canvas-shell";
import type { ExplorerContentDialogsProps } from "@/components/files/explorer/explorer-content-dialogs";
import type { ExplorerControls } from "@/components/files/explorer/explorer-controls";
import type { ExplorerMobileActionsProps } from "@/components/files/explorer/explorer-mobile-actions";
import type { ExplorerSearchBarProps } from "@/components/files/explorer/explorer-retrieval-props";
import type { ShareDialogProps } from "@/components/files/explorer/share-dialog";
import type { FolderRecord } from "@/components/files/explorer/shared";

export interface ExplorerBrowsePaneProps {
  bannerInputRef: RefObject<HTMLInputElement | null>;
  bannerUploadBusy: boolean;
  browseSurfaceProps: ExplorerBrowseSurfaceProps;
  contentDialogsProps: ExplorerContentDialogsProps;
  controlsProps: ComponentProps<typeof ExplorerControls>;
  currentFolder: FolderRecord | null;
  currentFolderBannerUrl: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileShareDialogProps: ShareDialogProps;
  folderInputRef: RefObject<HTMLInputElement | null>;
  folderShareDialogProps: ShareDialogProps;
  isMobile: boolean;
  mobileActionsProps: ExplorerMobileActionsProps;
  onBannerInputChange: ChangeEventHandler<HTMLInputElement>;
  onChangeFolderBanner: (folderId: string) => void;
  onQueueFiles: (files: File[]) => void;
  onQueueFolderFiles: (
    files: Array<{
      file: File;
      relativePath: string;
    }>
  ) => void;
  onResetFolderBanner: (folderId: string) => void;
  searchBarProps: ExplorerSearchBarProps;
  shellProps: Omit<ComponentProps<typeof ExplorerCanvasShell>, "children">;
}

export type BrowseSurfaceProps = ExplorerBrowsePaneProps["browseSurfaceProps"];
export type ContentDialogsProps =
  ExplorerBrowsePaneProps["contentDialogsProps"];
export type ControlsProps = ExplorerBrowsePaneProps["controlsProps"];
export type MobileActionsProps = ExplorerBrowsePaneProps["mobileActionsProps"];
export type ShellProps = ExplorerBrowsePaneProps["shellProps"];
export type NoteWorkflowContentDialogProps = Omit<
  ContentDialogsProps,
  | "editDialog"
  | "onApplyEditDialog"
  | "onEditDialogOpenChange"
  | "onEditDialogValueChange"
  | "onPropertiesOpenChange"
  | "propertiesItem"
  | "propertiesOpen"
>;

export interface BuildExplorerBrowsePanePropsOptions {
  allFiles: BrowseSurfaceProps["sortedFiles"];
  allFolders: BrowseSurfaceProps["allFolders"];
  availablePropertyDefinitions: ControlsProps["availablePropertyDefinitions"];
  bannerInputRef: ExplorerBrowsePaneProps["bannerInputRef"];
  bannerUploadBusy: ExplorerBrowsePaneProps["bannerUploadBusy"];
  canMoveSelectionUp: boolean;
  canNavigateUp: boolean;
  canRedoFileOperation: ControlsProps["canRedoFileOperation"];
  canUndoFileOperation: ControlsProps["canUndoFileOperation"];
  canvasDropActive: ShellProps["canvasDropActive"];
  canvasDropProps: ShellProps["canvasDropProps"];
  cardFieldQuery: ControlsProps["cardFieldQuery"];
  cardPropertyKeys: ControlsProps["cardPropertyKeys"];
  clearSelection: () => void;
  contextMenuSurfaceClass: BrowseSurfaceProps["contextMenuSurfaceClass"];
  currentFolder: ExplorerBrowsePaneProps["currentFolder"];
  currentFolderBannerUrl: ExplorerBrowsePaneProps["currentFolderBannerUrl"];
  currentFolderId: ControlsProps["currentFolderId"];
  currentLocationTitle: ControlsProps["currentLocationTitle"];
  deleteSelectionItems: (
    items: Array<{ id: string; kind: "file" | "folder" }>
  ) => Promise<void>;
  downloadStatus: ShellProps["downloadStatus"];
  dropTargetId: BrowseSurfaceProps["dropTargetId"];
  editDialog: ContentDialogsProps["editDialog"];
  explorerEntries: BrowseSurfaceProps["explorerEntries"];
  fileInputRef: ExplorerBrowsePaneProps["fileInputRef"];
  fileOperationHistoryBusy: ControlsProps["fileOperationHistoryBusy"];
  fileShareDialogProps: ExplorerBrowsePaneProps["fileShareDialogProps"];
  filteredAvailablePropertyDefinitions: ControlsProps["filteredAvailablePropertyDefinitions"];
  folderFileCount: BrowseSurfaceProps["folderFileCount"];
  folderInputRef: ExplorerBrowsePaneProps["folderInputRef"];
  folderPreviewKinds: BrowseSurfaceProps["folderPreviewKinds"];
  folderShareDialogProps: ExplorerBrowsePaneProps["folderShareDialogProps"];
  folderSubfolderCount: BrowseSurfaceProps["folderSubfolderCount"];
  getFileDragProps: BrowseSurfaceProps["getFileDragProps"];
  getFileIcon: BrowseSurfaceProps["getFileIcon"];
  getFileItemActionProps: BrowseSurfaceProps["getFileItemActionProps"];
  getFileKind: BrowseSurfaceProps["getFileKind"];
  getFolderDragProps: BrowseSurfaceProps["getFolderDragProps"];
  getFolderItemActionProps: BrowseSurfaceProps["getFolderItemActionProps"];
  getSelectedActionItems: () => Array<{ id: string; kind: "file" | "folder" }>;
  gridRef: ShellProps["gridRef"];
  handleApplyEditDialog: ContentDialogsProps["onApplyEditDialog"];
  handleEditDialogOpenChange: ContentDialogsProps["onEditDialogOpenChange"];
  handleEditDialogValueChange: ContentDialogsProps["onEditDialogValueChange"];
  handlePropertyFiltersChange: ControlsProps["onPropertyFiltersChange"];
  hoveredPreviewFileId: BrowseSurfaceProps["hoveredPreviewFileId"];
  interactions: BrowseSurfaceProps["interactions"];
  isCurrentFolderReadOnly: ControlsProps["isCurrentFolderReadOnly"];
  isMobile: ExplorerBrowsePaneProps["isMobile"];
  isSearchFilteredView: BrowseSurfaceProps["isSearchFilteredView"];
  itemActionTargetSelector: BrowseSurfaceProps["itemActionTargetSelector"];
  listMeasureElement: BrowseSurfaceProps["listMeasureElement"];
  listTotalSize: BrowseSurfaceProps["listTotalSize"];
  listVirtualItems: BrowseSurfaceProps["listVirtualItems"];
  loading: ShellProps["loading"];
  mobileConfirmAction: MobileActionsProps["mobileConfirmAction"];
  mobileCreateMenuOpen: MobileActionsProps["mobileCreateMenuOpen"];
  moveItemsToFolder: (
    itemIds: string[],
    targetFolderId: string
  ) => Promise<void>;
  moveSelectionTargetFolderId: string | null;
  noteWorkflowContentDialogProps: NoteWorkflowContentDialogProps;
  onBannerInputChange: ExplorerBrowsePaneProps["onBannerInputChange"];
  onCardFieldQueryChange: ControlsProps["onCardFieldQueryChange"];
  onCardFieldToggle: ControlsProps["onCardFieldToggle"];
  onChangeFolderBanner: ExplorerBrowsePaneProps["onChangeFolderBanner"];
  onClearCardFields: ControlsProps["onClearCardFields"];
  onCreateFolder: ControlsProps["onCreateFolder"];
  onCreateNote: ControlsProps["onCreateNote"];
  onImportLink: ControlsProps["onImportLink"];
  onMobileCanvasPointerDown: ShellProps["onMobileCanvasPointerDown"];
  onNavigateUp: ControlsProps["onNavigateUp"];
  onOpenFile: BrowseSurfaceProps["onOpenFile"];
  onOpenFolder: BrowseSurfaceProps["onOpenFolder"];
  onOpenMobileCreateMenu: ControlsProps["onOpenMobileCreateMenu"];
  onPreviewIntentEnd: BrowseSurfaceProps["onPreviewIntentEnd"];
  onPreviewIntentStart: BrowseSurfaceProps["onPreviewIntentStart"];
  onQueueFiles: ExplorerBrowsePaneProps["onQueueFiles"];
  onQueueFolderFiles: ExplorerBrowsePaneProps["onQueueFolderFiles"];
  onRedo: ControlsProps["onRedo"];
  onRefresh: ShellProps["onRefresh"];
  onResetCardFields: ControlsProps["onResetCardFields"];
  onResetFolderBanner: ExplorerBrowsePaneProps["onResetFolderBanner"];
  onUndo: ControlsProps["onUndo"];
  onUploadFile: ControlsProps["onUploadFile"];
  onUploadFolder: ControlsProps["onUploadFolder"];
  propertiesItem: ContentDialogsProps["propertiesItem"];
  propertiesOpen: ContentDialogsProps["propertiesOpen"];
  propertyFilterFields: ControlsProps["propertyFilterFields"];
  propertyFiltersForUi: ControlsProps["propertyFiltersForUi"];
  scrollRef: ShellProps["scrollRef"];
  searchBarProps: ExplorerSearchBarProps;
  searchResultByFileId: BrowseSurfaceProps["searchResultByFileId"];
  selectedCardPropertyDefinitions: ControlsProps["selectedCardPropertyDefinitions"];
  selectedCount: MobileActionsProps["selectedCount"];
  selectedIds: ReadonlySet<string>;
  selection: BrowseSurfaceProps["selection"];
  selectionRect: ShellProps["selectionRect"];
  setItemRowRefMap: MutableRefObject<Map<string, HTMLDivElement>>;
  setMobileConfirmAction: MobileActionsProps["onMobileConfirmActionChange"];
  setMobileCreateMenuOpen: MobileActionsProps["onMobileCreateMenuOpenChange"];
  setPropertiesOpen: ContentDialogsProps["onPropertiesOpenChange"];
  setSortState: ControlsProps["onSortChange"];
  setViewMode: ControlsProps["onViewModeChange"];
  sortedFiles: BrowseSurfaceProps["sortedFiles"];
  sortedFolders: BrowseSurfaceProps["sortedFolders"];
  sortState: ControlsProps["sortState"];
  startHapticSuccess: () => void;
  viewMode: ControlsProps["viewMode"];
  visibleItemIds: BrowseSurfaceProps["visibleItemIds"];
}
