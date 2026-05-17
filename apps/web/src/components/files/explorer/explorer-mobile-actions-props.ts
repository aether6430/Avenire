import type {
  BuildExplorerBrowsePanePropsOptions,
  MobileActionsProps,
} from "@/components/files/explorer/explorer-browse-pane-props-shared";

export function buildExplorerMobileActionsProps({
  canMoveSelectionUp,
  clearSelection,
  currentFolderId,
  deleteSelectionItems,
  getSelectedActionItems,
  isCurrentFolderReadOnly,
  mobileConfirmAction,
  mobileCreateMenuOpen,
  moveItemsToFolder,
  moveSelectionTargetFolderId,
  onCreateFolder,
  onCreateNote,
  onImportLink,
  onUploadFile,
  onUploadFolder,
  selectedCount,
  selectedIds,
  setMobileConfirmAction,
  setMobileCreateMenuOpen,
  startHapticSuccess,
}: BuildExplorerBrowsePanePropsOptions): MobileActionsProps {
  return {
    canMoveSelectionUp,
    currentFolderId,
    isCurrentFolderReadOnly,
    mobileConfirmAction,
    mobileCreateMenuOpen,
    onClearSelection: clearSelection,
    onConfirmAction: (action) => {
      const items = getSelectedActionItems();
      if (action === "delete") {
        void deleteSelectionItems(items);
      } else if (moveSelectionTargetFolderId) {
        void moveItemsToFolder(
          Array.from(selectedIds),
          moveSelectionTargetFolderId
        );
      }
      startHapticSuccess();
      setMobileConfirmAction(null);
    },
    onCreateFolder: (folderId) => onCreateFolder(folderId),
    onCreateNote: (folderId) => onCreateNote(folderId),
    onImportLink: (folderId) => onImportLink(folderId),
    onMobileConfirmActionChange: setMobileConfirmAction,
    onMobileCreateMenuOpenChange: setMobileCreateMenuOpen,
    onUploadFile,
    onUploadFolder,
    selectedCount,
  };
}
