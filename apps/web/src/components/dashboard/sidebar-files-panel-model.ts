import type {
  CommandPaletteFileNode,
  CommandPaletteFolderNode,
} from "@/stores/commandPaletteStore";

export interface SidebarFolderNode extends CommandPaletteFolderNode {}

export interface SidebarFileNode extends CommandPaletteFileNode {}

export interface FilesInvalidationEventPayload {
  folderId?: string | null;
}

interface FilesRealtimeConnectionOptions {
  onInvalidate: (payload: FilesInvalidationEventPayload | null) => void;
  workspaceUuid: string;
}

export interface SidebarTreeMutationItem {
  id: string;
  kind: "file" | "folder";
}

export function getSidebarFilesTreeState(input: {
  filteredFolderCount: number;
  folderCount: number;
  loadFailed: boolean;
  loading: boolean;
  searchActive: boolean;
  workspaceUuid: string | null;
}) {
  if (!input.workspaceUuid) {
    return {
      label: "Workspace",
      showTree: false,
    };
  }

  if (input.loading && input.folderCount === 0) {
    return {
      label: "Loading files...",
      showTree: false,
    };
  }

  if (input.loadFailed && input.folderCount === 0) {
    return {
      label: "Unable to load files.",
      showTree: false,
    };
  }

  if (input.searchActive && input.filteredFolderCount === 0) {
    return {
      label: "No matching files.",
      showTree: false,
    };
  }

  if (input.folderCount === 0) {
    return {
      label: "Workspace",
      showTree: false,
    };
  }

  return {
    label: null,
    showTree: true,
  };
}

export function filterSidebarTreeBySearchQuery({
  fileTree,
  folderTree,
  searchQuery,
}: {
  fileTree: SidebarFileNode[];
  folderTree: SidebarFolderNode[];
  searchQuery: string;
}) {
  const needle = searchQuery.trim().toLowerCase();
  if (!needle) {
    return { files: fileTree, folders: folderTree };
  }

  const foldersById = new Map(folderTree.map((folder) => [folder.id, folder]));
  const childFoldersByParent = new Map<string | null, string[]>();
  for (const folder of folderTree) {
    const children = childFoldersByParent.get(folder.parentId ?? null) ?? [];
    children.push(folder.id);
    childFoldersByParent.set(folder.parentId ?? null, children);
  }

  const matchingFolderIds = new Set(
    folderTree
      .filter((folder) => folder.name.toLowerCase().includes(needle))
      .map((folder) => folder.id)
  );
  const matchingFileIds = new Set(
    fileTree
      .filter((file) => file.name.toLowerCase().includes(needle))
      .map((file) => file.id)
  );

  const visibleFolderIds = new Set<string>();
  const folderIdsShowingDescendantFiles = new Set<string>();

  const addAncestors = (folderId: string | null) => {
    let cursor = folderId ? foldersById.get(folderId) : null;
    while (cursor) {
      visibleFolderIds.add(cursor.id);
      cursor = cursor.parentId ? foldersById.get(cursor.parentId) : null;
    }
  };

  const addDescendants = (folderId: string) => {
    visibleFolderIds.add(folderId);
    folderIdsShowingDescendantFiles.add(folderId);
    for (const childId of childFoldersByParent.get(folderId) ?? []) {
      addDescendants(childId);
    }
  };

  for (const folderId of matchingFolderIds) {
    addAncestors(folderId);
    addDescendants(folderId);
  }

  for (const file of fileTree) {
    if (matchingFileIds.has(file.id)) {
      addAncestors(file.folderId);
    }
  }

  return {
    files: fileTree.filter(
      (file) =>
        matchingFileIds.has(file.id) ||
        (file.folderId
          ? folderIdsShowingDescendantFiles.has(file.folderId)
          : false)
    ),
    folders: folderTree.filter((folder) => visibleFolderIds.has(folder.id)),
  };
}

export function createFilesRealtimeConnection({
  onInvalidate,
  workspaceUuid,
}: FilesRealtimeConnectionOptions) {
  let closed = false;
  let eventSource: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanupCurrent = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) {
      return;
    }

    clearRetryTimer();
    retryTimer = setTimeout(() => {
      connect();
    }, 3000);
  };

  const connect = () => {
    if (closed) {
      return;
    }

    try {
      cleanupCurrent();

      const url = new URL("/api/realtime/events", window.location.origin);
      url.searchParams.set("eventType", "files.invalidate");
      url.searchParams.set("limit", "100");
      url.searchParams.set("workspaceUuid", workspaceUuid);

      eventSource = new EventSource(url.toString());
      eventSource.onerror = () => {
        cleanupCurrent();
        scheduleReconnect();
      };
      eventSource.addEventListener("files.invalidate", (event) => {
        const detail = (() => {
          try {
            return JSON.parse(
              (event as MessageEvent<string>).data
            ) as FilesInvalidationEventPayload | null;
          } catch {
            return null;
          }
        })();

        onInvalidate(detail);
      });
    } catch {
      scheduleReconnect();
    }
  };

  return {
    start() {
      connect();
    },
    stop() {
      closed = true;
      clearRetryTimer();
      cleanupCurrent();
    },
  };
}

export function resolveSidebarRootFolderId(folderTree: SidebarFolderNode[]) {
  return folderTree.find((folder) => folder.parentId === null)?.id ?? null;
}

export function buildSidebarRootExpandedIds(folderTree: SidebarFolderNode[]) {
  return new Set(
    folderTree.filter((folder) => !folder.parentId).map((folder) => folder.id)
  );
}

export function buildSidebarAutoExpandedAncestorIds({
  currentFileId,
  currentFolderId,
  fileTree,
  folderTree,
}: {
  currentFileId?: string;
  currentFolderId?: string;
  fileTree: SidebarFileNode[];
  folderTree: SidebarFolderNode[];
}) {
  if (folderTree.length === 0) {
    return null;
  }

  const targetId = currentFileId ?? currentFolderId;
  if (!targetId) {
    return null;
  }

  const foldersById = new Map(folderTree.map((folder) => [folder.id, folder]));
  const nextExpanded = new Set<string>();

  const expandAncestors = (folderId: string) => {
    let cursor = foldersById.get(folderId);
    while (cursor) {
      nextExpanded.add(cursor.id);
      if (!cursor.parentId) {
        break;
      }
      cursor = foldersById.get(cursor.parentId);
    }
  };

  if (currentFolderId) {
    if (!foldersById.has(currentFolderId)) {
      return null;
    }
    expandAncestors(currentFolderId);
    return nextExpanded;
  }

  if (currentFileId) {
    const file = fileTree.find((entry) => entry.id === currentFileId);
    if (!file?.folderId) {
      return null;
    }
    expandAncestors(file.folderId);
    return nextExpanded;
  }

  return null;
}

export function isSidebarFolderDescendant(
  folderTree: SidebarFolderNode[],
  folderId: string,
  possibleDescendantId: string
) {
  const byId = new Map(folderTree.map((folder) => [folder.id, folder]));
  let cursor = byId.get(possibleDescendantId);
  while (cursor?.parentId) {
    if (cursor.parentId === folderId) {
      return true;
    }
    cursor = byId.get(cursor.parentId);
  }
  return false;
}

export function collectSidebarDeletedFolderIds(
  folderTree: SidebarFolderNode[],
  items: SidebarTreeMutationItem[]
) {
  const folderIdsToRemove = new Set<string>();
  const childFoldersByParent = new Map<string | null, string[]>();

  for (const folder of folderTree) {
    const siblings = childFoldersByParent.get(folder.parentId ?? null) ?? [];
    siblings.push(folder.id);
    childFoldersByParent.set(folder.parentId ?? null, siblings);
  }

  const collectFolderIds = (folderId: string) => {
    if (folderIdsToRemove.has(folderId)) {
      return;
    }

    folderIdsToRemove.add(folderId);
    for (const childId of childFoldersByParent.get(folderId) ?? []) {
      collectFolderIds(childId);
    }
  };

  for (const item of items) {
    if (item.kind === "folder") {
      collectFolderIds(item.id);
    }
  }

  return folderIdsToRemove;
}

export function filterSidebarTreeAfterDelete({
  fileTree,
  folderIdsToRemove,
  folderTree,
  items,
}: {
  fileTree: SidebarFileNode[];
  folderIdsToRemove: Set<string>;
  folderTree: SidebarFolderNode[];
  items: SidebarTreeMutationItem[];
}) {
  return {
    files: fileTree.filter(
      (file) =>
        !items.some(
          (item) =>
            (item.kind === "file" && item.id === file.id) ||
            (item.kind === "folder" &&
              folderIdsToRemove.has(file.folderId ?? ""))
        )
    ),
    folders: folderTree.filter((folder) => !folderIdsToRemove.has(folder.id)),
  };
}
