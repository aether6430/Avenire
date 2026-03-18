"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PinnedExplorerItem = {
  folderId: string | null;
  id: string;
  kind: "file" | "folder";
  name: string;
  workspaceId: string;
};

interface FilesPinsState {
  pinnedByWorkspace: Record<string, PinnedExplorerItem[]>;
}

function nextPinnedItems(
  currentItems: PinnedExplorerItem[],
  nextItem: PinnedExplorerItem
) {
  const exists = currentItems.some(
    (item) => item.kind === nextItem.kind && item.id === nextItem.id
  );

  if (exists) {
    return currentItems.filter(
      (item) => !(item.kind === nextItem.kind && item.id === nextItem.id)
    );
  }

  return [nextItem, ...currentItems];
}

export const useFilesPinsStore = create<FilesPinsState>()(
  persist(
    () => ({
      pinnedByWorkspace: {},
    }),
    {
      name: "files-pins",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ pinnedByWorkspace: state.pinnedByWorkspace }),
      skipHydration: true,
    }
  )
);

export const filesPinsActions = {
  togglePinnedItem: (workspaceId: string, item: PinnedExplorerItem) =>
    useFilesPinsStore.setState((state) => ({
      pinnedByWorkspace: {
        ...state.pinnedByWorkspace,
        [workspaceId]: nextPinnedItems(
          state.pinnedByWorkspace[workspaceId] ?? [],
          item
        ),
      },
    })),
  isPinned: (
    workspaceId: string,
    kind: PinnedExplorerItem["kind"],
    id: string
  ) =>
    (useFilesPinsStore.getState().pinnedByWorkspace[workspaceId] ?? []).some(
      (item) => item.kind === kind && item.id === id
    ),
};
