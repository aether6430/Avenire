"use client";

import { memo } from "react";
import type {
  WorkspaceSearchItem,
  WorkspaceSearchResult,
} from "@/components/files/search-model";
import { StylizedSearchBarSurface } from "@/components/files/stylized-search-bar-surface";
import { useStylizedSearchBar } from "@/components/files/use-stylized-search-bar";

export interface StylizedSearchBarProps {
  filePathById?: Map<string, string>;
  focusSignal?: number;
  initialQuery?: string;
  initialResults?: WorkspaceSearchResult[];
  items: WorkspaceSearchItem[];
  maxWidth?: string;
  onApplyWorkspaceFilter?: (itemIds: string[] | null) => void;
  onOpenFileById?: (fileId: string) => void;
  onOpenFolderById?: (folderId: string) => void;
  onSearch?: (query: string, results: WorkspaceSearchResult[]) => void;
  onSelectResult?: (result: WorkspaceSearchResult) => void;
  placeholder?: string;
  selectedResultChunkId?: string | null;
  workspaceUuid: string;
}

const StylizedSearchBar = memo(function StylizedSearchBar({
  filePathById,
  focusSignal,
  initialQuery = "",
  initialResults = [],
  items,
  maxWidth = "max-w-5xl",
  onApplyWorkspaceFilter,
  onOpenFileById,
  onOpenFolderById,
  onSearch,
  onSelectResult,
  placeholder = "Search anything...",
  selectedResultChunkId,
  workspaceUuid,
}: StylizedSearchBarProps) {
  const runtime = useStylizedSearchBar({
    focusSignal,
    initialQuery,
    initialResults,
    items,
    onApplyWorkspaceFilter,
    onOpenFileById,
    onOpenFolderById,
    onSearch,
    onSelectResult,
    selectedResultChunkId,
    workspaceUuid,
  });

  return (
    <StylizedSearchBarSurface
      filePathById={filePathById}
      maxWidth={maxWidth}
      placeholder={placeholder}
      runtime={runtime}
    />
  );
});

export { StylizedSearchBar };
export default StylizedSearchBar;
export type { WorkspaceSearchItem, WorkspaceSearchResult };
