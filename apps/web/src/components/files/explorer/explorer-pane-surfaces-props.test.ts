import { describe, expect, it, vi } from "vitest";

const { buildExplorerBrowsePanePropsMock, buildExplorerPreviewPanePropsMock } =
  vi.hoisted(() => ({
    buildExplorerBrowsePanePropsMock: vi.fn(() => ({ browse: true })),
    buildExplorerPreviewPanePropsMock: vi.fn(() => ({ preview: true })),
  }));

vi.mock("@/components/files/explorer/explorer-browse-pane-props", () => ({
  buildExplorerBrowsePaneProps: buildExplorerBrowsePanePropsMock,
}));

vi.mock("@/components/files/explorer/explorer-preview-pane-props", () => ({
  buildExplorerPreviewPaneProps: buildExplorerPreviewPanePropsMock,
}));

import { buildExplorerPaneSurfacesBrowseProps } from "@/components/files/explorer/explorer-pane-surfaces-browse-props";
import { buildExplorerPaneSurfacesPreviewProps } from "@/components/files/explorer/explorer-pane-surfaces-preview-props";

describe("explorer pane surfaces props", () => {
  it("builds browse pane props with search bar wiring", () => {
    const searchBarProps = { marker: "search-bar" };
    const result = buildExplorerPaneSurfacesBrowseProps({
      allFolders: [],
      breadcrumbs: [{ id: "parent" }] as never,
      currentFolderId: "folder-1",
      derivedState: {
        currentFolder: null,
        currentFolderBannerUrl: null,
        currentLocationTitle: "Folder",
        currentFolderReadOnly: false,
      } as never,
      dragDrop: {
        canvasDropActive: false,
        dropTargetId: null,
        getCanvasDropProps: () => ({}),
        getFileDragProps: () => ({}),
        getFolderDragProps: () => ({}),
      } as never,
      editWorkflows: {
        bannerInputRef: { current: null },
        bannerUploadBusy: false,
        editDialog: null,
        handleBannerInputChange: () => {},
        handleEditDialogOpenChange: () => {},
        handleEditDialogValueChange: () => {},
        openCreateFolderDialog: () => {},
        openCreateNoteDialog: () => {},
        resetFolderBanner: async () => undefined,
        triggerBannerPicker: () => {},
        applyEditDialog: async () => undefined,
      } as never,
      fileInputRef: { current: null },
      fileOperations: {
        canRedoFileOperation: false,
        canUndoFileOperation: false,
        deleteSelectionItems: async () => undefined,
        downloadStatus: null,
        fileOperationHistoryBusy: false,
        getSelectedActionItems: () => [],
        moveItemsToFolder: async () => undefined,
        redoLatestFileOperation: async () => undefined,
        undoLatestFileOperation: async () => undefined,
      } as never,
      filePresentation: {
        detectFileKind: () => "markdown",
        getFileVisualIcon: () => null,
        getFileVisualIconProps: () => ({}),
        handlePreviewIntentEnd: () => {},
        handlePreviewIntentStart: () => {},
        hoveredPreviewFileId: null,
      } as never,
      focusSearchSignal: 1,
      folderInputRef: { current: null },
      gridRef: { current: null },
      isMobile: false,
      itemActionProps: {
        getFileItemActionProps: () => ({}),
        getFolderItemActionProps: () => ({}),
      } as never,
      itemInteractions: {
        beginMobileItemLongPress: () => {},
        handleItemContextMenu: () => {},
        handleMobileItemClick: () => {},
        handleMobileItemPointerUp: () => {},
        handleOpenOnDoubleClick: () => {},
        shouldIgnoreItemClick: () => false,
        stopItemSelectionEvent: () => {},
      } as never,
      itemRefs: { current: new Map() } as never,
      listMeasureElement: () => undefined,
      listTotalSize: 0,
      listVirtualItems: [],
      loading: false,
      navigation: {
        navigateToFolder: () => {},
        openFileById: () => {},
        openFolderById: () => {},
        selectFile: () => {},
      } as never,
      noteWorkflows: {
        contentDialogProps: null,
        openImportLinkDialog: () => {},
      } as never,
      propertyControls: {
        availablePropertyDefinitions: [],
        cardFieldQuery: "",
        cardPropertyKeys: [],
        clearCardFields: () => {},
        filteredAvailablePropertyDefinitions: [],
        handleCardFieldQueryChange: () => {},
        handleCardFieldToggle: () => {},
        handlePropertyFiltersChange: () => {},
        propertyFilterFields: [],
        propertyFiltersForUi: [],
        resetCardFields: () => {},
        selectedCardPropertyDefinitions: [],
      } as never,
      refreshCurrentFolder: async () => undefined,
      scrollRef: { current: null },
      searchSurface: {
        getSearchBarProps: vi.fn(() => searchBarProps),
        searchableItems: [],
      } as never,
      selection: {
        clearSelection: () => {},
        getSelectedIds: () => new Set(),
        selectedCount: 0,
        selectionRect: null,
      } as never,
      setSortState: () => {},
      shareDialogs: {
        fileShareDialogProps: null,
        folderShareDialogProps: null,
      } as never,
      shell: {
        setViewMode: () => {},
        viewMode: "list",
      } as never,
      sortState: null as never,
      surfaceSummary: {
        folderFileCount: 0,
        folderPreviewKinds: [],
        folderSubfolderCount: 0,
      } as never,
      triggerHapticSuccess: () => {},
      uiState: {
        mobileConfirmAction: null,
        mobileCreateMenuOpen: false,
        openMobileCreateMenu: () => {},
        propertiesItem: null,
        propertiesOpen: false,
        setMobileConfirmAction: () => {},
        setMobileCreateMenuOpen: () => {},
        setPropertiesOpen: () => {},
      } as never,
      uploadWorkflows: {
        queueUploads: () => {},
      } as never,
    });

    expect(result).toEqual({ browse: true });
    expect(buildExplorerBrowsePanePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentFolderId: "folder-1",
        isMobile: false,
        searchBarProps,
      })
    );
  });

  it("builds preview pane props and returns null when no active file exists", () => {
    expect(
      buildExplorerPaneSurfacesPreviewProps({
        activeFile: null,
        allFiles: [],
        allFolders: [],
        fileOperations: {} as never,
        filePreviewRetrievalProps: {} as never,
        navigation: {} as never,
        openRenameFileDialog: () => {},
        propertyDefinitions: [],
        setPropertyDefinitions: () => {},
        shareDialogs: {} as never,
        startBannerUpload: () => {},
        surfaceSummary: {} as never,
        toggleCurrentPinnedItem: () => {},
        wikiLinkableFiles: [],
        workspaceUuid: "workspace-1",
      })
    ).toBeNull();

    const activeFile = { id: "file-1" };
    const result = buildExplorerPaneSurfacesPreviewProps({
      activeFile: activeFile as never,
      allFiles: [],
      allFolders: [],
      fileOperations: {
        deleteContextActionItems: () => {},
        downloadContextActionItems: () => {},
        duplicateContextActionItems: () => {},
        hardReingestContextActionItems: () => {},
        moveContextActionItemsToFolder: () => {},
      } as never,
      filePreviewRetrievalProps: { marker: "retrieval" } as never,
      navigation: { openFileById: () => {} } as never,
      openRenameFileDialog: () => {},
      propertyDefinitions: [],
      setPropertyDefinitions: () => {},
      shareDialogs: {
        fileShareDialogProps: null,
        folderShareDialogProps: null,
        openFileShareDialog: () => {},
      } as never,
      startBannerUpload: () => {},
      surfaceSummary: {
        currentInfoEntries: [],
        isCurrentPinned: false,
      } as never,
      toggleCurrentPinnedItem: () => {},
      wikiLinkableFiles: [],
      workspaceUuid: "workspace-1",
    });

    expect(result).toEqual({ preview: true });
    expect(buildExplorerPreviewPanePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeFile,
        workspaceUuid: "workspace-1",
      })
    );
  });
});
