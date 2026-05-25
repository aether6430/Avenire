import type { FolderRecord } from "@/components/files/explorer/shared";

export type ExplorerItemActionKind = "file" | "folder";
type ExplorerItemActionMoveTarget = Pick<
  FolderRecord,
  "id" | "name" | "readOnly"
>;

interface ExplorerItemMoveTargetsOptions {
  folders: ExplorerItemActionMoveTarget[];
  kind: ExplorerItemActionKind;
  targetId: string;
}

interface ExplorerItemMetadataRowsOptions {
  detail?: string;
  kind: ExplorerItemActionKind;
  targetId: string;
}

export function getExplorerItemActionMoveTargets({
  folders,
  kind,
  targetId,
}: ExplorerItemMoveTargetsOptions) {
  return folders.filter((folder) => {
    if (kind === "folder") {
      return folder.id !== targetId && !folder.readOnly;
    }

    return !folder.readOnly;
  });
}

export function getExplorerItemMetadataRows({
  detail,
  kind,
  targetId,
}: ExplorerItemMetadataRowsOptions) {
  return [
    { label: "Type", value: kind === "file" ? "File" : "Folder" },
    { label: "ID", value: targetId },
    ...(detail ? [{ label: "Detail", value: detail }] : []),
  ];
}
