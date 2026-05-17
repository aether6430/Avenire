"use client";

import type { ExplorerCardFileType } from "@/components/files/explorer/explorer-cards-shared";
import type { ExplorerItemActionsProps } from "@/components/files/explorer/explorer-item-actions";
import type { SelectionControlCaptureProps } from "@/components/files/explorer/explorer-list-rows-shared";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import type { ExplorerEntry } from "@/components/files/explorer/workspace-folder-browse-model";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

export interface ExplorerBrowseSelectionApi {
  handleItemClick: (
    event: React.MouseEvent<HTMLDivElement>,
    itemId: string,
    visibleItemIds: string[]
  ) => void;
  selectedIds: Set<string>;
  setItemSelected: (itemId: string, selected: boolean) => void;
  toggleSelection: (itemId: string) => void;
}

export interface ExplorerBrowseInteractionsApi {
  beginMobileItemLongPress: (itemId: string) => void;
  handleItemContextMenu: (
    event: React.MouseEvent<HTMLElement>,
    itemId: string
  ) => void;
  handleMobileItemClick: (itemId: string, openItem: () => void) => void;
  handleMobileItemPointerUp: React.PointerEventHandler<HTMLDivElement>;
  handleOpenOnDoubleClick: (
    event: React.MouseEvent<HTMLElement>,
    open: () => void
  ) => void;
  shouldIgnoreItemClick: (event: React.MouseEvent<HTMLElement>) => boolean;
  stopItemSelectionEvent: (event: React.SyntheticEvent<HTMLElement>) => void;
}

export interface ExplorerBrowseVirtualItem {
  index: number;
  key: React.Key;
  start: number;
}

export interface ExplorerBrowseSurfaceProps {
  allFolders: FolderRecord[];
  contextMenuSurfaceClass: string;
  dropTargetId: string | null;
  explorerEntries: ExplorerEntry[];
  folderFileCount: Map<string, number>;
  folderPreviewKinds: Map<string, string[]>;
  folderSubfolderCount: Map<string, number>;
  getFileDragProps: (
    fileId: string,
    readOnly?: boolean
  ) => React.HTMLAttributes<HTMLDivElement> | undefined;
  getFileIcon: (
    file: Pick<FileRecord, "page">,
    kind: ExplorerCardFileType
  ) => React.ReactNode;
  getFileItemActionProps: (file: FileRecord) => ExplorerItemActionsProps;
  getFileKind: (file: FileRecord) => ExplorerCardFileType;
  getFolderDragProps: (
    folderId: string,
    readOnly?: boolean
  ) => React.HTMLAttributes<HTMLDivElement> | undefined;
  getFolderItemActionProps: (
    folder: FolderRecord,
    counts: {
      fileCount: number;
      folderCount: number;
    }
  ) => ExplorerItemActionsProps;
  hoveredPreviewFileId: string | null;
  interactions: ExplorerBrowseInteractionsApi;
  isMobile: boolean;
  itemActionTargetSelector: string;
  listMeasureElement: React.RefCallback<HTMLDivElement>;
  listTotalSize: number;
  listVirtualItems: ExplorerBrowseVirtualItem[];
  onChangeFolderBanner: (folderId: string) => void;
  onCreateFolderHere: (folderId: string) => void;
  onOpenFile: (fileId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onPreviewIntentEnd: (file: FileRecord) => void;
  onPreviewIntentStart: (file: FileRecord) => void;
  onResetFolderBanner: (folderId: string) => void;
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
  selection: ExplorerBrowseSelectionApi;
  setItemRowRef: (itemId: string, node: HTMLDivElement | null) => void;
  sortedFiles: FileRecord[];
  sortedFolders: FolderRecord[];
  viewMode: "cards" | "list";
  visibleItemIds: string[];
}

export function buildSelectionControlCaptureProps(
  interactions: ExplorerBrowseInteractionsApi
): SelectionControlCaptureProps {
  return {
    onClickCapture: interactions.stopItemSelectionEvent,
    onMouseDownCapture: interactions.stopItemSelectionEvent,
    onPointerDownCapture: interactions.stopItemSelectionEvent,
  };
}
