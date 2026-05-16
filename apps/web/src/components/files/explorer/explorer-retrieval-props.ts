import type { ComponentProps } from "react";
import type { FilePreviewPanel } from "@/components/files/explorer/file-preview-panel";
import type { StylizedSearchBar } from "@/components/files/stylized-search-bar";

type SearchBarProps = ComponentProps<typeof StylizedSearchBar>;
type FilePreviewPanelProps = ComponentProps<typeof FilePreviewPanel>;

export type ExplorerSearchBarProps = SearchBarProps;
export type ExplorerFilePreviewRetrievalProps = Pick<
  FilePreviewPanelProps,
  "activeRetrievalChunkId" | "query" | "retrievalResults"
>;

interface BuildExplorerSearchBarPropsOptions {
  activeRetrievalChunkId: SearchBarProps["selectedResultChunkId"];
  focusSearchSignal: SearchBarProps["focusSignal"];
  handleApplyWorkspaceFilter: NonNullable<
    SearchBarProps["onApplyWorkspaceFilter"]
  >;
  handleSearch: NonNullable<SearchBarProps["onSearch"]>;
  handleSelectResult: NonNullable<SearchBarProps["onSelectResult"]>;
  onOpenFileById: NonNullable<SearchBarProps["onOpenFileById"]>;
  onOpenFolderById: NonNullable<SearchBarProps["onOpenFolderById"]>;
  query: SearchBarProps["initialQuery"];
  retrievalResults: SearchBarProps["initialResults"];
  searchableItems: SearchBarProps["items"];
  workspaceUuid: SearchBarProps["workspaceUuid"];
}

interface BuildExplorerFilePreviewRetrievalPropsOptions
  extends ExplorerFilePreviewRetrievalProps {}

export function buildExplorerSearchBarProps({
  activeRetrievalChunkId,
  focusSearchSignal,
  handleApplyWorkspaceFilter,
  handleSearch,
  handleSelectResult,
  onOpenFileById,
  onOpenFolderById,
  query,
  retrievalResults,
  searchableItems,
  workspaceUuid,
}: BuildExplorerSearchBarPropsOptions): ExplorerSearchBarProps {
  return {
    focusSignal: focusSearchSignal,
    initialQuery: query,
    initialResults: retrievalResults,
    items: searchableItems,
    maxWidth: "max-w-none",
    onApplyWorkspaceFilter: handleApplyWorkspaceFilter,
    onOpenFileById,
    onOpenFolderById,
    onSearch: handleSearch,
    onSelectResult: handleSelectResult,
    placeholder: "Search anything...",
    selectedResultChunkId: activeRetrievalChunkId,
    workspaceUuid,
  };
}

export function buildExplorerFilePreviewRetrievalProps({
  activeRetrievalChunkId,
  query,
  retrievalResults,
}: BuildExplorerFilePreviewRetrievalPropsOptions): ExplorerFilePreviewRetrievalProps {
  return {
    activeRetrievalChunkId,
    query,
    retrievalResults,
  };
}
