import type { ExplorerPropertiesItem } from "@/components/files/explorer/explorer-content-dialog-model";

interface ExplorerFolderActionDetailOptions {
  fileCount: number;
  folderCount: number;
}

interface ExplorerFileActionDetailOptions {
  isIngested: boolean;
  mimeType: string | null;
  sizeLabel: string;
}

export function buildExplorerFolderActionDetail({
  fileCount,
  folderCount,
}: ExplorerFolderActionDetailOptions) {
  return `Folder • ${folderCount} folders • ${fileCount} files`;
}

export function buildExplorerFileActionDetail({
  isIngested,
  mimeType,
  sizeLabel,
}: ExplorerFileActionDetailOptions) {
  return `${sizeLabel} • ${mimeType ?? "unknown"} • ${isIngested ? "Ingested" : "Pending"}`;
}

export function buildExplorerPropertiesItem(
  item: ExplorerPropertiesItem
): ExplorerPropertiesItem {
  return item;
}
