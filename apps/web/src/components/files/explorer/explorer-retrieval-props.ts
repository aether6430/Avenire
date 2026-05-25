import type { ComponentProps } from "react";
import type { FilePreviewPanelProps } from "@/components/files/explorer/file-preview-panel-types";
import type { StylizedSearchBar } from "@/components/files/stylized-search-bar";

type SearchBarProps = ComponentProps<typeof StylizedSearchBar>;

export type ExplorerSearchBarProps = SearchBarProps;
export type ExplorerFilePreviewRetrievalProps = Pick<
  FilePreviewPanelProps,
  "activeRetrievalChunkId" | "query" | "retrievalResults"
>;

interface BuildExplorerSearchBarPropsOptions {
  focusSearchSignal: SearchBarProps["focusSignal"];
  handleApplyWorkspaceFilter: NonNullable<
    SearchBarProps["onApplyWorkspaceFilter"]
  >;
  handleSearch: NonNullable<SearchBarProps["onSearch"]>;
  query: SearchBarProps["initialQuery"];
  retrievalResults: SearchBarProps["initialResults"];
  searchableItems: SearchBarProps["items"];
  workspaceUuid: SearchBarProps["workspaceUuid"];
}

interface BuildExplorerFilePreviewRetrievalPropsOptions
  extends ExplorerFilePreviewRetrievalProps {}

export function buildExplorerSearchBarProps({
  focusSearchSignal,
  handleApplyWorkspaceFilter,
  handleSearch,
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
    onSearch: handleSearch,
    placeholder: "Search anything...",
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
