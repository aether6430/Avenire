"use client";

import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import type { WorkspaceSearchResult } from "@/components/files/stylized-search-bar";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import type { ExplorerSurfaceInfoEntry } from "./explorer-surface-summary-model";

export interface FilePreviewPanelProps {
  activeFile: FileRecord;
  activeRetrievalChunkId: string | null;
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  currentInfoEntries: ExplorerSurfaceInfoEntry[];
  deleteContextActionItems: (itemId: string, kind: "file" | "folder") => void;
  downloadContextActionItems: (
    itemId: string,
    kind: "file" | "folder",
    fallbackName: string
  ) => void;
  duplicateContextActionItems: (
    itemId: string,
    kind: "file" | "folder"
  ) => void;
  hardReingestContextActionItems: (itemId: string) => void;
  isCurrentPinned: boolean;
  moveContextActionItemsToFolder: (
    itemId: string,
    kind: "file" | "folder",
    targetFolderId: string
  ) => void;
  openFileById: (fileId: string) => void;
  openFileShareDialog: (file: FileRecord) => void;
  openRenameFileDialog: (file: FileRecord) => void;
  propertyDefinitions: WorkspacePropertyDefinition[];
  query: string;
  retrievalResults: WorkspaceSearchResult[];
  setPropertyDefinitions: (definitions: WorkspacePropertyDefinition[]) => void;
  startBannerUpload: (files: File[], input?: unknown) => Promise<unknown>;
  toggleCurrentPinnedItem: () => void;
  wikiLinkableFiles: Array<{
    id: string;
    title: string;
    excerpt: string;
    content: string;
  }>;
  workspaceUuid: string;
}
