"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { ExplorerBrowseCardsMock, ExplorerBrowseListMock } = vi.hoisted(() => ({
  ExplorerBrowseCardsMock: vi.fn(() => <div>EXPLORER_BROWSE_CARDS</div>),
  ExplorerBrowseListMock: vi.fn(() => <div>EXPLORER_BROWSE_LIST</div>),
}));

vi.mock("@/components/files/explorer/explorer-browse-cards", () => ({
  ExplorerBrowseCards: ExplorerBrowseCardsMock,
}));

vi.mock("@/components/files/explorer/explorer-browse-list", () => ({
  ExplorerBrowseList: ExplorerBrowseListMock,
}));

import { ExplorerBrowseSurface } from "@/components/files/explorer/explorer-browse-surface";

describe("ExplorerBrowseSurface", () => {
  it("wires shared browse props into the cards and list owners", () => {
    const props = {
      allFolders: [],
      contextMenuSurfaceClass: "surface",
      dropTargetId: null,
      explorerEntries: [],
      folderFileCount: new Map(),
      folderPreviewKinds: new Map(),
      folderSubfolderCount: new Map(),
      getFileDragProps: () => undefined,
      getFileIcon: () => null,
      getFileItemActionProps: () => ({}) as never,
      getFileKind: () => "document" as never,
      getFolderDragProps: () => undefined,
      getFolderItemActionProps: () => ({}) as never,
      hoveredPreviewFileId: null,
      interactions: {
        beginMobileItemLongPress: () => {},
        handleItemContextMenu: () => {},
        handleMobileItemClick: (_itemId: string, openItem: () => void) =>
          openItem(),
        handleMobileItemPointerUp: () => {},
        handleOpenOnDoubleClick: (_event: never, open: () => void) => open(),
        shouldIgnoreItemClick: () => false,
        stopItemSelectionEvent: () => {},
      },
      isMobile: false,
      itemActionTargetSelector: "[data-item-actions]",
      listMeasureElement: () => {},
      listTotalSize: 0,
      listVirtualItems: [],
      onChangeFolderBanner: () => {},
      onCreateFolderHere: () => {},
      onOpenFile: () => {},
      onOpenFolder: () => {},
      onPreviewIntentEnd: () => {},
      onPreviewIntentStart: () => {},
      onResetFolderBanner: () => {},
      selectedCardPropertyDefinitions: [],
      selection: {
        handleItemClick: () => {},
        selectedIds: new Set(),
        setItemSelected: () => {},
        toggleSelection: () => {},
      },
      setItemRowRef: () => {},
      sortedFiles: [],
      sortedFolders: [],
      viewMode: "cards" as const,
      visibleItemIds: [],
    };

    const html = renderToStaticMarkup(<ExplorerBrowseSurface {...props} />);

    expect(ExplorerBrowseCardsMock).toHaveBeenCalledTimes(1);
    expect(ExplorerBrowseListMock).toHaveBeenCalledTimes(1);
    expect(html).toContain("EXPLORER_BROWSE_CARDS");
    expect(html).toContain("EXPLORER_BROWSE_LIST");
  });
});
