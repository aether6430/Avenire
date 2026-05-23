"use client";

import { memo } from "react";
import type {
  WorkspaceSearchItem,
  WorkspaceSearchResult,
} from "@/components/files/search-model";
import { StylizedSearchBarSurface } from "@/components/files/stylized-search-bar-surface";
import { useStylizedSearchBar } from "@/components/files/use-stylized-search-bar";

export interface StylizedSearchBarProps {
  focusSignal?: number;
  initialQuery?: string;
  initialResults?: WorkspaceSearchResult[];
  items: WorkspaceSearchItem[];
  maxWidth?: string;
  onApplyWorkspaceFilter?: (itemIds: string[] | null) => void;
  onSearch?: (query: string, results: WorkspaceSearchResult[]) => void;
  placeholder?: string;
  workspaceUuid: string;
}

const StylizedSearchBar = memo(function StylizedSearchBar({
  focusSignal,
  initialQuery = "",
  initialResults = [],
  items,
  maxWidth = "max-w-5xl",
  onApplyWorkspaceFilter,
  onSearch,
  placeholder = "Search anything...",
  workspaceUuid,
}: StylizedSearchBarProps) {
  const runtime = useStylizedSearchBar({
    focusSignal,
    initialQuery,
    initialResults,
    items,
    onApplyWorkspaceFilter,
    onSearch,
    workspaceUuid,
  });

  return (
    <StylizedSearchBarSurface
      maxWidth={maxWidth}
      placeholder={placeholder}
      runtime={runtime}
    />
  );
});

export { StylizedSearchBar };
export default StylizedSearchBar;
export type { WorkspaceSearchItem, WorkspaceSearchResult };
