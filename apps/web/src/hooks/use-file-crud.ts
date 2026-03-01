import { useCallback, useMemo, useState } from "react";

export type ExplorerItemType = "file" | "folder";

export interface ExplorerItem {
  id: string;
  name: string;
  type: ExplorerItemType;
  parentId: string | null;
  updatedLabel: string;
  sizeLabel?: string;
  url?: string;
  contentType?: string;
}

function listToMap(items: ExplorerItem[]): Record<string, ExplorerItem> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function isDescendant(
  itemsById: Record<string, ExplorerItem>,
  folderId: string,
  possibleDescendantId: string,
): boolean {
  let cursor = itemsById[possibleDescendantId];
  while (cursor && cursor.parentId) {
    if (cursor.parentId === folderId) {
      return true;
    }
    cursor = itemsById[cursor.parentId];
  }
  return false;
}

function pruneDraggedSet(itemsById: Record<string, ExplorerItem>, draggedIds: string[]): string[] {
  const draggedSet = new Set(draggedIds);
  return draggedIds.filter((id) => {
    let cursor = itemsById[id];
    while (cursor && cursor.parentId) {
      if (draggedSet.has(cursor.parentId)) {
        return false;
      }
      cursor = itemsById[cursor.parentId];
    }
    return true;
  });
}

function collectDescendants(itemsById: Record<string, ExplorerItem>, rootId: string): Set<string> {
  const descendants = new Set<string>([rootId]);
  let found = true;

  while (found) {
    found = false;
    Object.values(itemsById).forEach((item) => {
      if (!descendants.has(item.id) && item.parentId && descendants.has(item.parentId)) {
        descendants.add(item.id);
        found = true;
      }
    });
  }

  return descendants;
}

export function useFileCrud(initialItems: ExplorerItem[]) {
  const [itemsById, setItemsById] = useState<Record<string, ExplorerItem>>(() => listToMap(initialItems));

  const getVisibleItems = useCallback(
    (parentId: string) => {
      return Object.values(itemsById)
        .filter((item) => item.parentId === parentId)
        .sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === "folder" ? -1 : 1;
        });
    },
    [itemsById],
  );

  const getAncestors = useCallback(
    (folderId: string) => {
      const chain: ExplorerItem[] = [];
      let current = itemsById[folderId];

      while (current) {
        chain.unshift(current);
        if (!current.parentId) {
          break;
        }
        current = itemsById[current.parentId];
      }

      return chain;
    },
    [itemsById],
  );

  const moveItemsToFolder = useCallback(
    (sourceIds: string[], targetFolderId: string) => {
      if (!itemsById[targetFolderId] || itemsById[targetFolderId].type !== "folder") {
        return [] as string[];
      }

      const prunedIds = pruneDraggedSet(itemsById, sourceIds);
      const movableIds = prunedIds.filter((itemId) => {
        const item = itemsById[itemId];
        if (!item || item.parentId === targetFolderId || itemId === targetFolderId) {
          return false;
        }

        if (item.type === "folder" && isDescendant(itemsById, itemId, targetFolderId)) {
          return false;
        }

        return true;
      });

      if (movableIds.length === 0) {
        return [] as string[];
      }

      setItemsById((previous) => {
        const next = { ...previous };

        movableIds.forEach((itemId) => {
          const item = next[itemId];
          if (item) {
            next[itemId] = { ...item, parentId: targetFolderId, updatedLabel: "now" };
          }
        });

        return next;
      });

      return movableIds;
    },
    [itemsById],
  );

  const createItem = useCallback((item: Omit<ExplorerItem, "updatedLabel">) => {
    setItemsById((previous) => ({
      ...previous,
      [item.id]: { ...item, updatedLabel: "now" },
    }));
  }, []);

  const upsertItems = useCallback(
    (incomingItems: Array<Omit<ExplorerItem, "updatedLabel"> & { updatedLabel?: string }>) => {
      if (incomingItems.length === 0) {
        return;
      }

      setItemsById((previous) => {
        const next = { ...previous };

        for (const incoming of incomingItems) {
          const existing = next[incoming.id];
          next[incoming.id] = {
            ...existing,
            ...incoming,
            updatedLabel: incoming.updatedLabel ?? existing?.updatedLabel ?? "now",
          };
        }

        return next;
      });
    },
    [],
  );

  const renameItem = useCallback((itemId: string, name: string) => {
    setItemsById((previous) => {
      const item = previous[itemId];
      if (!item) {
        return previous;
      }

      return {
        ...previous,
        [itemId]: { ...item, name, updatedLabel: "now" },
      };
    });
  }, []);

  const deleteItems = useCallback((itemIds: string[]) => {
    setItemsById((previous) => {
      const next = { ...previous };
      const toDelete = new Set<string>();

      itemIds.forEach((itemId) => {
        if (!next[itemId]) {
          return;
        }

        collectDescendants(next, itemId).forEach((descendantId) => {
          toDelete.add(descendantId);
        });
      });

      toDelete.forEach((itemId) => {
        delete next[itemId];
      });

      return next;
    });
  }, []);

  const items = useMemo(() => Object.values(itemsById), [itemsById]);

  return {
    itemsById,
    items,
    getVisibleItems,
    getAncestors,
    moveItemsToFolder,
    createItem,
    upsertItems,
    renameItem,
    deleteItems,
  };
}
