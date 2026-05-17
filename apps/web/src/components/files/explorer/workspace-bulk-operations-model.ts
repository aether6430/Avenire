import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";

export type BulkItemKind = "file" | "folder";

export interface BulkActionItem {
  id: string;
  kind: BulkItemKind;
}

export interface BulkMutationResult {
  error?: string;
  id: string;
  kind: BulkItemKind;
  status: "failed" | "ok";
}

export interface BulkMutationResponse {
  results?: BulkMutationResult[];
  summary?: {
    failed?: number;
    succeeded?: number;
    total?: number;
  };
}

export interface TrashMutationResponse {
  results?: Array<{
    id: string;
    kind: BulkItemKind;
    ok: boolean;
  }>;
}

export interface FileMutationHistoryItem extends BulkActionItem {}

export interface MoveMutationHistoryItem extends FileMutationHistoryItem {
  fromFolderId: string;
  toFolderId: string;
}

export type FileMutationHistoryEntry =
  | {
      operation: "delete";
      items: FileMutationHistoryItem[];
    }
  | {
      operation: "move";
      items: MoveMutationHistoryItem[];
    };

interface WorkspaceBulkData {
  files: FileRecord[];
  folders: FolderRecord[];
}

function findFolder(folders: FolderRecord[], folderId: string) {
  return folders.find((folder) => folder.id === folderId) ?? null;
}

function findFile(files: FileRecord[], fileId: string) {
  return files.find((file) => file.id === fileId) ?? null;
}

export function resolveBulkItemKind(
  itemId: string,
  { files, folders }: WorkspaceBulkData
): BulkItemKind | null {
  if (folders.some((folder) => folder.id === itemId)) {
    return "folder";
  }
  if (files.some((file) => file.id === itemId)) {
    return "file";
  }
  return null;
}

export function resolveBulkActionItemsFromSelection({
  files,
  folders,
  selectedIds,
}: WorkspaceBulkData & {
  selectedIds: Iterable<string>;
}): BulkActionItem[] {
  return Array.from(selectedIds)
    .map((id) => {
      const kind = resolveBulkItemKind(id, { files, folders });
      return kind ? { id, kind } : null;
    })
    .filter((item): item is BulkActionItem => Boolean(item));
}

export function resolveBulkActionItemsFromContext({
  fallbackKind,
  files,
  folders,
  itemId,
  selectedIds,
  snapshottedIds,
}: WorkspaceBulkData & {
  fallbackKind: BulkItemKind;
  itemId: string;
  selectedIds: ReadonlySet<string>;
  snapshottedIds: string[] | null;
}): BulkActionItem[] {
  const actionIds =
    snapshottedIds ??
    (selectedIds.has(itemId) ? Array.from(selectedIds) : [itemId]);

  return actionIds
    .map((id) => ({
      id,
      kind:
        resolveBulkItemKind(id, { files, folders }) ??
        (id === itemId ? fallbackKind : null),
    }))
    .filter((item): item is BulkActionItem => Boolean(item.kind));
}

export function filterWritableBulkActionItems({
  files,
  folders,
  items,
}: WorkspaceBulkData & {
  items: BulkActionItem[];
}): BulkActionItem[] {
  return items.filter((item) => {
    if (item.kind === "folder") {
      return !findFolder(folders, item.id)?.readOnly;
    }
    return !findFile(files, item.id)?.readOnly;
  });
}

export function buildMoveBulkActionItems({
  files,
  folders,
  itemIds,
  targetFolderId,
}: WorkspaceBulkData & {
  itemIds: string[];
  targetFolderId: string;
}): BulkActionItem[] {
  const targetFolder = findFolder(folders, targetFolderId);
  if (targetFolder?.readOnly) {
    return [];
  }

  return filterWritableBulkActionItems({
    files,
    folders,
    items: itemIds
      .filter((itemId) => itemId !== targetFolderId)
      .map((itemId) => {
        const kind = resolveBulkItemKind(itemId, { files, folders });
        return kind ? { id: itemId, kind } : null;
      })
      .filter((item): item is BulkActionItem => Boolean(item)),
  });
}

export function buildMoveMutationHistoryItems({
  files,
  folders,
  items,
  targetFolderId,
}: WorkspaceBulkData & {
  items: BulkActionItem[];
  targetFolderId: string;
}): MoveMutationHistoryItem[] {
  return items
    .map((item) => {
      if (item.kind === "folder") {
        const folder = findFolder(folders, item.id);
        if (!folder?.parentId) {
          return null;
        }
        return {
          fromFolderId: folder.parentId,
          id: item.id,
          kind: item.kind,
          toFolderId: targetFolderId,
        } satisfies MoveMutationHistoryItem;
      }

      const file = findFile(files, item.id);
      if (!file?.folderId) {
        return null;
      }
      return {
        fromFolderId: file.folderId,
        id: item.id,
        kind: item.kind,
        toFolderId: targetFolderId,
      } satisfies MoveMutationHistoryItem;
    })
    .filter((item): item is MoveMutationHistoryItem => Boolean(item));
}

export function getMutationHistoryItemKey(item: FileMutationHistoryItem) {
  return `${item.kind}:${item.id}`;
}

export function getSuccessfulBulkMutationKeys(
  response: BulkMutationResponse | null
) {
  return new Set(
    (response?.results ?? [])
      .filter((result) => result.status === "ok")
      .map((result) => getMutationHistoryItemKey(result))
  );
}

export function getSuccessfulTrashMutationKeys(
  response: TrashMutationResponse | null
) {
  return new Set(
    (response?.results ?? [])
      .filter((result) => result.ok)
      .map((result) => getMutationHistoryItemKey(result))
  );
}

export function countMutationHistoryItems(entry: FileMutationHistoryEntry) {
  return entry.items.length;
}

export function filterMutationHistoryEntry(
  entry: FileMutationHistoryEntry,
  keys: Set<string>
): FileMutationHistoryEntry | null {
  const items = entry.items.filter((item) =>
    keys.has(getMutationHistoryItemKey(item))
  );
  if (items.length === 0) {
    return null;
  }

  if (entry.operation === "delete") {
    return {
      items,
      operation: "delete",
    };
  }

  return {
    items: items as MoveMutationHistoryItem[],
    operation: "move",
  };
}

export function subtractMutationHistoryKeys(
  entry: FileMutationHistoryEntry,
  keysToRemove: Set<string>
) {
  const remainingKeys = new Set(
    entry.items
      .map((item) => getMutationHistoryItemKey(item))
      .filter((key) => !keysToRemove.has(key))
  );
  return filterMutationHistoryEntry(entry, remainingKeys);
}

function formatMutationItemCount(count: number, totalCount = count) {
  if (totalCount !== count) {
    return `${count} of ${totalCount} items`;
  }

  return `${count} item${count === 1 ? "" : "s"}`;
}

export function describeMutationHistoryEntry(
  entry: FileMutationHistoryEntry,
  mode: "normal" | "redo" | "undo",
  count = countMutationHistoryItems(entry),
  totalCount = count
) {
  const itemCount = formatMutationItemCount(count, totalCount);

  if (mode === "undo") {
    return entry.operation === "delete"
      ? `Undid delete of ${itemCount}.`
      : `Undid move of ${itemCount}.`;
  }

  if (mode === "redo") {
    return entry.operation === "delete"
      ? `Redid delete of ${itemCount}.`
      : `Redid move of ${itemCount}.`;
  }

  return entry.operation === "delete"
    ? `Deleted ${itemCount}.`
    : `Moved ${itemCount}.`;
}
