import {
  formatCardPropertyValue,
  getFileProperties,
} from "@/components/files/explorer/explorer-file-properties-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import {
  formatBytes,
  toUpdatedLabel,
} from "@/components/files/explorer/shared";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";

interface ExplorerFolderListRowModelArgs {
  fileCount: number;
  folderCount: number;
  updatedAt?: string;
}

interface ExplorerFileListRowModelArgs {
  file: FileRecord;
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
}

interface ExplorerListRowPropertyChip {
  label: string;
  value: string;
}

export function buildExplorerFolderListRowModel({
  fileCount,
  folderCount,
  updatedAt,
}: ExplorerFolderListRowModelArgs) {
  return {
    countsLabel: `${folderCount} folders • ${fileCount} files`,
    updatedLabel: updatedAt ? toUpdatedLabel(updatedAt) : "—",
  };
}

export function buildExplorerFileListRowModel({
  file,
  selectedCardPropertyDefinitions,
}: ExplorerFileListRowModelArgs) {
  const fileProperties = getFileProperties(file);
  const propertyChips: ExplorerListRowPropertyChip[] = [];

  selectedCardPropertyDefinitions.forEach((definition) => {
    const property = fileProperties[definition.key];
    const value = property && formatCardPropertyValue(property);
    if (!value) {
      return;
    }
    propertyChips.push({
      label: definition.key,
      value,
    });
  });

  return {
    propertyChips,
    sizeLabel: formatBytes(file.sizeBytes),
    updatedLabel: toUpdatedLabel(file.updatedAt ?? file.createdAt),
  };
}
