"use client";

import { Button } from "@avenire/ui/components/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avenire/ui/components/sidebar";
import {
  Columns,
  FilePlus as FilePlus2,
  Files,
  LinkSimple,
  MagnifyingGlass,
  PushPin as Pin,
  Plus,
  Trash as Trash2,
} from "@phosphor-icons/react";
import Fuse, { type IFuseOptions } from "fuse.js";
import type { Route } from "next";
import Image from "next/image";
import {
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type TreeDataItem, TreeView } from "@/components/ui/tree-view";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { invalidateWorkspaceFolderCache } from "@/lib/workspace-folder-cache";
import { invalidateWorkspaceMarkdownCache } from "@/lib/workspace-markdown-cache";
import {
  setWorkspacePaneDragData,
  useWorkspaceSurfaceNavigation,
} from "@/lib/workspace-panes";
import {
  readWorkspaceTreeCache,
  writeWorkspaceTreeCache,
} from "@/lib/workspace-tree-cache";
import {
  type CommandPaletteFileNode,
  type CommandPaletteFolderNode,
  commandPaletteActions,
} from "@/stores/commandPaletteStore";
import {
  filesPinsActions,
  type PinnedExplorerItem,
  useFilesPinsStore,
} from "@/stores/filesPinsStore";
import { type FilesUiIntent, filesUiActions } from "@/stores/filesUiStore";

interface SidebarFolderNode extends CommandPaletteFolderNode {}

interface SidebarFileNode extends CommandPaletteFileNode {}

interface FilesInvalidationEventPayload {
  fileId?: string | null;
  folderId?: string | null;
  reason?: string | null;
}

interface FilesRealtimeConnectionOptions {
  onConnectedChange: (connected: boolean) => void;
  onInvalidate: (payload: FilesInvalidationEventPayload | null) => void;
  workspaceUuid: string;
}

const SIDEBAR_SEARCH_SCORE_MAX = 0.45;
const SIDEBAR_SEARCH_FUSE_OPTIONS: IFuseOptions<{ name: string }> = {
  includeScore: true,
  ignoreLocation: true,
  keys: ["name"],
  threshold: 0.6,
};

const TREE_FILE_ICON_SRC_BY_EXTENSION: Record<string, string> = {
  astro: "/icons/astro.svg",
  avif: "/icons/image.svg",
  bmp: "/icons/image.svg",
  c: "/icons/c.svg",
  cpp: "/icons/cpp.svg",
  css: "/icons/css.svg",
  csv: "/icons/csv.svg",
  gif: "/icons/image.svg",
  go: "/icons/go.svg",
  html: "/icons/html.svg",
  ico: "/icons/image.svg",
  java: "/icons/java.svg",
  jpeg: "/icons/image.svg",
  jpg: "/icons/image.svg",
  js: "/icons/javascript.svg",
  json: "/icons/json.svg",
  jsx: "/icons/react.svg",
  m4a: "/icons/audio.svg",
  markdown: "/icons/markdown.svg",
  md: "/icons/markdown.svg",
  mkv: "/icons/video.svg",
  mov: "/icons/video.svg",
  mp3: "/icons/audio.svg",
  mp4: "/icons/video.svg",
  pdf: "/icons/pdf.svg",
  php: "/icons/php.svg",
  png: "/icons/image.svg",
  py: "/icons/python.svg",
  rb: "/icons/ruby.svg",
  rs: "/icons/rust.svg",
  scss: "/icons/scss.svg",
  sql: "/icons/database.svg",
  svg: "/icons/svg.svg",
  tar: "/icons/zip.svg",
  ts: "/icons/typescript.svg",
  tsx: "/icons/react-typescript.svg",
  txt: "/icons/text.svg",
  wav: "/icons/audio.svg",
  webm: "/icons/video.svg",
  webp: "/icons/image.svg",
  xls: "/icons/csv.svg",
  xlsx: "/icons/csv.svg",
  xml: "/icons/xml.svg",
  yaml: "/icons/yaml.svg",
  yml: "/icons/yaml.svg",
  zip: "/icons/zip.svg",
};
const treeFileIconComponentCache = new Map<
  string,
  ComponentType<{ className?: string }>
>();

function TreeIconImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className?: string;
  src: string;
}) {
  return (
    <Image
      alt={alt}
      aria-hidden="true"
      className={className}
      height={16}
      src={src}
      unoptimized
      width={16}
    />
  );
}

function TreeFolderClosedIcon({ className }: { className?: string }) {
  return (
    <TreeIconImage alt="" className={className} src="/icons/_folder.svg" />
  );
}

function TreeFolderOpenIcon({ className }: { className?: string }) {
  return (
    <TreeIconImage alt="" className={className} src="/icons/_folder_open.svg" />
  );
}

function getTreeFileIconSrc(name: string) {
  const ext = name.includes(".")
    ? (name.split(".").pop()?.toLowerCase() ?? "")
    : "";
  return TREE_FILE_ICON_SRC_BY_EXTENSION[ext] ?? "/icons/_file.svg";
}

function getTreeFileIconComponent(name: string) {
  const iconSrc = getTreeFileIconSrc(name);
  const cached = treeFileIconComponentCache.get(iconSrc);
  if (cached) {
    return cached;
  }

  const TreeFileIcon = ({ className }: { className?: string }) => (
    <TreeIconImage
      alt=""
      className={cn("size-4 shrink-0", className)}
      src={iconSrc}
    />
  );
  TreeFileIcon.displayName = `TreeFileIcon(${iconSrc})`;
  treeFileIconComponentCache.set(iconSrc, TreeFileIcon);
  return TreeFileIcon;
}

function createFilesRealtimeConnection({
  onConnectedChange,
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
      eventSource.onopen = () => {
        onConnectedChange(true);
      };
      eventSource.onerror = () => {
        onConnectedChange(false);
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
      onConnectedChange(false);
      scheduleReconnect();
    }
  };

  return {
    start() {
      connect();
    },
    stop() {
      closed = true;
      onConnectedChange(false);
      clearRetryTimer();
      cleanupCurrent();
    },
  };
}

function collectDescendantFolderIds(
  folders: SidebarFolderNode[],
  folderId: string
) {
  const descendantIds = new Set<string>([folderId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (
        folder.parentId &&
        descendantIds.has(folder.parentId) &&
        !descendantIds.has(folder.id)
      ) {
        descendantIds.add(folder.id);
        changed = true;
      }
    }
  }

  return descendantIds;
}

function SectionButton({
  contextMenuContent,
  dragHref,
  icon: Icon,
  label,
  onClick,
  onContextMenu: _onContextMenu,
}: {
  contextMenuContent?: ReactNode;
  dragHref?: Route;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const button = (
    <SidebarMenuButton
      draggable={Boolean(dragHref)}
      onClick={onClick}
      onContextMenu={_onContextMenu}
      onDragStart={(event) => {
        if (!dragHref) {
          return;
        }

        setWorkspacePaneDragData(event.dataTransfer, dragHref);
      }}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </SidebarMenuButton>
  );

  if (contextMenuContent) {
    return (
      <SidebarMenuItem>
        <ContextMenu>
          <ContextMenuTrigger render={<div className="contents" />}>
            {button}
          </ContextMenuTrigger>
          <ContextMenuContent>{contextMenuContent}</ContextMenuContent>
        </ContextMenu>
      </SidebarMenuItem>
    );
  }

  return <SidebarMenuItem>{button}</SidebarMenuItem>;
}

export function FilesSidebarPanel({
  currentFileId,
  currentFolderId,
  emitGlobalFileIntent,
  navigateToFilesRoot,
  workspaceUuid,
}: {
  currentFileId?: string;
  currentFolderId?: string;
  emitGlobalFileIntent?: (intent: FilesUiIntent) => void | Promise<void>;
  navigateToFilesRoot: (options?: {
    openInNewPane?: boolean;
    openInNewTab?: boolean;
  }) => Promise<void>;
  workspaceUuid: string | null;
}) {
  const { isMobile } = useSidebar();
  const { navigate } = useWorkspaceSurfaceNavigation({
    panesEnabled: !isMobile,
  });
  const triggerHaptic = useHaptics();
  const pinnedByWorkspace = useFilesPinsStore(
    (state) => state.pinnedByWorkspace
  );
  const [filesNameSearchQuery] = useState("");
  const [folderTree, setFolderTree] = useState<SidebarFolderNode[]>([]);
  const [fileTree, setFileTree] = useState<SidebarFileNode[]>([]);
  const [expandedTreePaths, setExpandedTreePaths] = useState<Set<string>>(
    new Set()
  );
  const [sseConnected, setSseConnected] = useState(false);
  const fileTreePanelRef = useRef<HTMLDivElement | null>(null);
  const fileTreeRef = useRef<SidebarFileNode[]>([]);
  const folderTreeRef = useRef<SidebarFolderNode[]>([]);
  const lastTreeRevealTargetRef = useRef<string | null>(null);
  const lastAutoExpandedTargetRef = useRef<string | null>(null);
  const treeRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handlePaneIntent = useCallback(
    (event: MouseEvent<HTMLElement>, href: Route) => {
      if (isMobile) {
        return false;
      }

      if (event.ctrlKey && event.shiftKey) {
        event.preventDefault();
        navigate(href, { openInNewTab: true });
        return true;
      }

      if (event.type === "contextmenu") {
        event.preventDefault();
        return false;
      }

      if (event.altKey) {
        event.preventDefault();
        navigate(href, { openInNewPane: true });
        return true;
      }

      return false;
    },
    [isMobile, navigate]
  );
  const loadedWorkspaceRef = useRef<string | null>(null);
  const prevWorkspaceUuidRef = useRef<string | null>(null);
  const expandedTreeStorageKey = workspaceUuid
    ? `files-tree-expanded:${workspaceUuid}`
    : null;
  const expandedTreePathIds = useMemo(
    () => Array.from(expandedTreePaths),
    [expandedTreePaths]
  );
  const pinnedItems = useMemo<PinnedExplorerItem[]>(
    () => (workspaceUuid ? (pinnedByWorkspace[workspaceUuid] ?? []) : []),
    [pinnedByWorkspace, workspaceUuid]
  );
  const pinnedFolders = useMemo(
    () =>
      pinnedItems.filter(
        (item) =>
          item.kind === "folder" &&
          folderTree.some((folder) => folder.id === item.id)
      ),
    [folderTree, pinnedItems]
  );
  const pinnedFiles = useMemo(
    () =>
      pinnedItems.filter(
        (item) =>
          item.kind === "file" && fileTree.some((file) => file.id === item.id)
      ),
    [fileTree, pinnedItems]
  );
  const rootFolderId = useMemo(
    () => folderTree.find((folder) => folder.parentId === null)?.id ?? null,
    [folderTree]
  );

  useEffect(() => {
    folderTreeRef.current = folderTree;
  }, [folderTree]);

  useEffect(() => {
    fileTreeRef.current = fileTree;
  }, [fileTree]);

  useEffect(() => {
    commandPaletteActions.setFileIndex({
      workspaceUuid,
      folders: folderTree,
      files: fileTree,
      rootFolderId: rootFolderId ?? null,
    });
  }, [fileTree, folderTree, rootFolderId, workspaceUuid]);

  const loadWorkspaceTree = useCallback(async (workspaceId: string) => {
    const cached = readWorkspaceTreeCache<SidebarFolderNode, SidebarFileNode>(
      workspaceId
    );
    if (cached) {
      setFolderTree(cached.folders);
      setFileTree(cached.files);
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/tree`, {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        folders?: SidebarFolderNode[];
        files?: SidebarFileNode[];
      };
      setFolderTree(payload.folders ?? []);
      setFileTree(
        (payload.files ?? []).map((file) => ({
          folderId: file.folderId,
          id: file.id,
          name: file.name,
          readOnly: file.readOnly,
        }))
      );
      writeWorkspaceTreeCache<SidebarFolderNode, SidebarFileNode>(workspaceId, {
        files: payload.files ?? [],
        folders: payload.folders ?? [],
      });
    } catch {
      // ignore
    }
  }, []);

  const refreshWorkspaceTreeDebounced = useCallback(
    (workspaceId: string) => {
      if (treeRefreshDebounceRef.current) {
        clearTimeout(treeRefreshDebounceRef.current);
      }

      treeRefreshDebounceRef.current = setTimeout(() => {
        loadWorkspaceTree(workspaceId).catch(() => undefined);
      }, 150);
    },
    [loadWorkspaceTree]
  );

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    if (loadedWorkspaceRef.current === workspaceUuid) {
      return;
    }
    loadedWorkspaceRef.current = workspaceUuid;
    loadWorkspaceTree(workspaceUuid).catch(() => undefined);
  }, [loadWorkspaceTree, workspaceUuid]);

  useEffect(() => {
    if (!expandedTreeStorageKey) {
      return;
    }
    if (prevWorkspaceUuidRef.current !== expandedTreeStorageKey) {
      prevWorkspaceUuidRef.current = expandedTreeStorageKey;
      const storedValue = window.localStorage.getItem(expandedTreeStorageKey);
      if (!storedValue) {
        setExpandedTreePaths(new Set());
        return;
      }
      try {
        const parsed = JSON.parse(storedValue) as string[];
        setExpandedTreePaths(new Set(parsed));
      } catch {
        setExpandedTreePaths(new Set());
      }
    }
  }, [expandedTreeStorageKey]);

  useEffect(() => {
    if (!expandedTreeStorageKey) {
      return;
    }
    window.localStorage.setItem(
      expandedTreeStorageKey,
      JSON.stringify(Array.from(expandedTreePaths))
    );
  }, [expandedTreePaths, expandedTreeStorageKey]);

  useEffect(() => {
    if (folderTree.length === 0) {
      return;
    }

    const nextExpanded = new Set(
      folderTree.filter((folder) => !folder.parentId).map((folder) => folder.id)
    );

    setExpandedTreePaths((previous) => {
      const merged = new Set([...previous, ...nextExpanded]);
      if (
        merged.size === previous.size &&
        Array.from(previous).every((id) => merged.has(id))
      ) {
        return previous;
      }
      return merged;
    });
  }, [folderTree]);

  useEffect(() => {
    if (folderTree.length === 0 || !workspaceUuid) {
      return;
    }

    const targetId = currentFileId ?? currentFolderId;
    if (!targetId) {
      lastAutoExpandedTargetRef.current = null;
      return;
    }

    const targetKey = `${workspaceUuid}:${targetId}`;
    if (lastAutoExpandedTargetRef.current === targetKey) {
      return;
    }

    const foldersById = new Map(
      folderTree.map((folder) => [folder.id, folder])
    );
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
        return;
      }
      expandAncestors(currentFolderId);
    } else if (currentFileId) {
      const file = fileTree.find((entry) => entry.id === currentFileId);
      if (!file?.folderId) {
        return;
      }
      expandAncestors(file.folderId);
    }

    lastAutoExpandedTargetRef.current = targetKey;
    setExpandedTreePaths((previous) => new Set([...previous, ...nextExpanded]));
  }, [currentFileId, currentFolderId, fileTree, folderTree, workspaceUuid]);

  const treeItemCount = fileTree.length + folderTree.length;
  useEffect(() => {
    const targetPath = currentFileId ?? currentFolderId;
    if (!targetPath) {
      return;
    }
    if (treeItemCount === 0) {
      return;
    }
    if (lastTreeRevealTargetRef.current === targetPath) {
      return;
    }

    const timer = setTimeout(() => {
      const panel = fileTreePanelRef.current;
      const target = panel?.querySelector<HTMLElement>(
        `[data-tree-id="${targetPath}"]`
      );
      if (!target) {
        return;
      }
      lastTreeRevealTargetRef.current = targetPath;
      target.scrollIntoView({ block: "nearest" });
    }, 180);

    return () => {
      clearTimeout(timer);
    };
  }, [currentFileId, currentFolderId, treeItemCount]);

  useEffect(() => {
    if (!workspaceUuid) {
      setSseConnected(false);
      return;
    }

    const connection = createFilesRealtimeConnection({
      onConnectedChange: setSseConnected,
      onInvalidate: (detail) => {
        invalidateWorkspaceFolderCache(workspaceUuid, detail?.folderId);
        invalidateWorkspaceMarkdownCache(workspaceUuid);
        if (detail?.reason === "file.deleted" && detail.fileId) {
          setFileTree((previous) => {
            const next = previous.filter((file) => file.id !== detail.fileId);
            writeWorkspaceTreeCache<SidebarFolderNode, SidebarFileNode>(
              workspaceUuid,
              {
                files: next,
                folders: folderTreeRef.current,
              }
            );
            return next;
          });
          return;
        }

        if (detail?.reason === "folder.deleted" && detail.folderId) {
          const deletedFolderIds = collectDescendantFolderIds(
            folderTreeRef.current,
            detail.folderId
          );
          const nextFolders = folderTreeRef.current.filter(
            (folder) => !deletedFolderIds.has(folder.id)
          );
          const nextFiles = fileTreeRef.current.filter(
            (file) => !deletedFolderIds.has(file.folderId)
          );

          setFolderTree(nextFolders);
          setFileTree(nextFiles);
          setExpandedTreePaths((previous) => {
            const next = new Set(previous);
            for (const folderId of deletedFolderIds) {
              next.delete(folderId);
            }
            return next;
          });
          writeWorkspaceTreeCache<SidebarFolderNode, SidebarFileNode>(
            workspaceUuid,
            {
              files: nextFiles,
              folders: nextFolders,
            }
          );
          return;
        }

        refreshWorkspaceTreeDebounced(workspaceUuid);
      },
      workspaceUuid,
    });
    connection.start();

    return () => {
      connection.stop();
      if (treeRefreshDebounceRef.current) {
        clearTimeout(treeRefreshDebounceRef.current);
        treeRefreshDebounceRef.current = null;
      }
    };
  }, [refreshWorkspaceTreeDebounced, workspaceUuid]);

  const navigateToFolder = useCallback(
    (folderId: string, routeWorkspaceUuid: string) => {
      const href =
        `/workspace/files/${routeWorkspaceUuid}/folder/${folderId}` as Route;
      navigate(href);
    },
    [navigate]
  );

  const emitFileIntentAfterNavigation = useCallback(
    (intent: FilesUiIntent) => {
      if (workspaceUuid && currentFolderId) {
        navigateToFolder(currentFolderId, workspaceUuid);
        window.setTimeout(() => {
          filesUiActions.emitIntent(intent);
        }, 0);
        return;
      }

      if (emitGlobalFileIntent) {
        void emitGlobalFileIntent(intent);
        return;
      }

      window.setTimeout(() => {
        filesUiActions.emitIntent(intent);
      }, 0);
    },
    [currentFolderId, emitGlobalFileIntent, navigateToFolder, workspaceUuid]
  );

  const navigateToFile = useCallback(
    (fileId: string, folderId: string, routeWorkspaceUuid: string) => {
      const href =
        `/workspace/files/${routeWorkspaceUuid}/folder/${folderId}?file=${fileId}` as Route;
      navigate(href);
    },
    [navigate]
  );

  const isFolderDescendant = useCallback(
    (folderId: string, possibleDescendantId: string) => {
      const byId = new Map(folderTree.map((folder) => [folder.id, folder]));
      let cursor = byId.get(possibleDescendantId);
      while (cursor?.parentId) {
        if (cursor.parentId === folderId) {
          return true;
        }
        cursor = byId.get(cursor.parentId);
      }
      return false;
    },
    [folderTree]
  );

  const moveTreeItem = useCallback(
    async (
      item: { id: string; kind: "file" | "folder" },
      targetFolderId: string
    ) => {
      if (!workspaceUuid) {
        return;
      }
      const targetFolder = folderTree.find(
        (folder) => folder.id === targetFolderId
      );
      if (targetFolder?.readOnly) {
        return;
      }

      if (item.kind === "folder") {
        const sourceFolder = folderTree.find((folder) => folder.id === item.id);
        if (sourceFolder?.readOnly) {
          return;
        }
        if (
          item.id === targetFolderId ||
          isFolderDescendant(item.id, targetFolderId)
        ) {
          return;
        }
        await fetch(`/api/workspaces/${workspaceUuid}/folders/${item.id}`, {
          body: JSON.stringify({ parentId: targetFolderId }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
      } else {
        const sourceFile = fileTree.find((file) => file.id === item.id);
        if (sourceFile?.readOnly) {
          return;
        }
        await fetch(`/api/workspaces/${workspaceUuid}/files/${item.id}`, {
          body: JSON.stringify({ folderId: targetFolderId }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
      }

      if (item.kind === "folder") {
        setFolderTree((previous) => {
          const next = previous.map((folder) =>
            folder.id === item.id
              ? { ...folder, parentId: targetFolderId }
              : folder
          );
          writeWorkspaceTreeCache(workspaceUuid, {
            files: fileTree,
            folders: next,
          });
          return next;
        });
      } else {
        setFileTree((previous) => {
          const next = previous.map((file) =>
            file.id === item.id ? { ...file, folderId: targetFolderId } : file
          );
          writeWorkspaceTreeCache(workspaceUuid, {
            files: next,
            folders: folderTree,
          });
          return next;
        });
      }
      filesUiActions.emitSync(workspaceUuid);
    },
    [fileTree, folderTree, isFolderDescendant, workspaceUuid]
  );

  const deleteTreeItems = useCallback(
    async (items: Array<{ id: string; kind: "file" | "folder" }>) => {
      if (!(workspaceUuid && items.length > 0)) {
        return;
      }

      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/items/bulk`,
        {
          body: JSON.stringify({
            items,
            operation: "delete",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        return;
      }

      if (
        items.some(
          (item) =>
            (item.kind === "file" && item.id === currentFileId) ||
            (item.kind === "folder" && item.id === currentFolderId)
        )
      ) {
        await navigateToFilesRoot();
      }

      const folderIdsToRemove = new Set<string>();
      const childFoldersByParent = new Map<string | null, string[]>();
      for (const folder of folderTree) {
        const siblings =
          childFoldersByParent.get(folder.parentId ?? null) ?? [];
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

      const nextFolders = folderTree.filter(
        (folder) => !folderIdsToRemove.has(folder.id)
      );
      const nextFiles = fileTree.filter(
        (file) =>
          !items.some(
            (item) =>
              (item.kind === "file" && item.id === file.id) ||
              (item.kind === "folder" &&
                folderIdsToRemove.has(file.folderId ?? ""))
          )
      );

      setFolderTree(nextFolders);
      setFileTree(nextFiles);
      writeWorkspaceTreeCache(workspaceUuid, {
        files: nextFiles,
        folders: nextFolders,
      });
      filesUiActions.emitSync(workspaceUuid);
    },
    [
      currentFileId,
      currentFolderId,
      fileTree,
      folderTree,
      navigateToFilesRoot,
      workspaceUuid,
    ]
  );

  const fileSearchNeedle = filesNameSearchQuery.trim().toLowerCase();
  const folderFuse = useMemo(
    () => new Fuse(folderTree, SIDEBAR_SEARCH_FUSE_OPTIONS),
    [folderTree]
  );
  const fileFuse = useMemo(
    () => new Fuse(fileTree, SIDEBAR_SEARCH_FUSE_OPTIONS),
    [fileTree]
  );
  const fuzzyMatchedFolders = useMemo(() => {
    if (!fileSearchNeedle) {
      return folderTree;
    }
    const exactMatches = folderTree.filter((folder) =>
      folder.name.toLowerCase().includes(fileSearchNeedle)
    );
    if (fileSearchNeedle.length < 2) {
      return exactMatches;
    }
    const fuzzyMatches = folderFuse
      .search(fileSearchNeedle)
      .filter((result) => (result.score ?? 1) <= SIDEBAR_SEARCH_SCORE_MAX)
      .map((result) => result.item);
    const unique = new Map<string, SidebarFolderNode>();
    for (const match of exactMatches) {
      unique.set(match.id, match);
    }
    for (const match of fuzzyMatches) {
      unique.set(match.id, match);
    }
    return Array.from(unique.values());
  }, [fileSearchNeedle, folderFuse, folderTree]);
  const fuzzyMatchedFiles = useMemo(() => {
    if (!fileSearchNeedle) {
      return fileTree;
    }
    const exactMatches = fileTree.filter((file) =>
      file.name.toLowerCase().includes(fileSearchNeedle)
    );
    if (fileSearchNeedle.length < 2) {
      return exactMatches;
    }
    const fuzzyMatches = fileFuse
      .search(fileSearchNeedle)
      .filter((result) => (result.score ?? 1) <= SIDEBAR_SEARCH_SCORE_MAX)
      .map((result) => result.item);
    const unique = new Map<string, SidebarFileNode>();
    for (const match of exactMatches) {
      unique.set(match.id, match);
    }
    for (const match of fuzzyMatches) {
      unique.set(match.id, match);
    }
    return Array.from(unique.values());
  }, [fileFuse, fileSearchNeedle, fileTree]);

  const filteredFileTreeState = useMemo(() => {
    if (!fileSearchNeedle) {
      return {
        files: fileTree,
        folders: folderTree,
      };
    }

    const folderById = new Map(folderTree.map((folder) => [folder.id, folder]));
    const allowedFolderIds = new Set<string>();
    const allowedFileIds = new Set<string>();

    for (const folder of fuzzyMatchedFolders) {
      allowedFolderIds.add(folder.id);
      let cursor = folder.parentId;
      while (cursor) {
        allowedFolderIds.add(cursor);
        cursor = folderById.get(cursor)?.parentId ?? null;
      }
    }

    for (const file of fuzzyMatchedFiles) {
      allowedFileIds.add(file.id);
      let cursor: string | null = file.folderId;
      while (cursor) {
        allowedFolderIds.add(cursor);
        cursor = folderById.get(cursor)?.parentId ?? null;
      }
    }

    return {
      files: fileTree.filter((file) => allowedFileIds.has(file.id)),
      folders: folderTree.filter((folder) => allowedFolderIds.has(folder.id)),
    };
  }, [
    fileSearchNeedle,
    fileTree,
    folderTree,
    fuzzyMatchedFiles,
    fuzzyMatchedFolders,
  ]);
  const filteredPinnedFolders = useMemo(() => {
    if (!fileSearchNeedle) {
      return pinnedFolders;
    }
    const folderIdSet = new Set(fuzzyMatchedFolders.map((folder) => folder.id));
    return pinnedFolders.filter((item) => folderIdSet.has(item.id));
  }, [fileSearchNeedle, fuzzyMatchedFolders, pinnedFolders]);
  const filteredPinnedFiles = useMemo(() => {
    if (!fileSearchNeedle) {
      return pinnedFiles;
    }
    const fileIdSet = new Set(fuzzyMatchedFiles.map((file) => file.id));
    return pinnedFiles.filter((item) => fileIdSet.has(item.id));
  }, [fileSearchNeedle, fuzzyMatchedFiles, pinnedFiles]);

  const sidebarTreeData = useMemo<TreeDataItem[]>(() => {
    if (!workspaceUuid) {
      return [];
    }

    const childrenByFolderId = new Map<string | null, TreeDataItem[]>();
    const addChild = (parentId: string | null, item: TreeDataItem) => {
      const existing = childrenByFolderId.get(parentId) ?? [];
      existing.push(item);
      childrenByFolderId.set(parentId, existing);
    };

    for (const folder of [...filteredFileTreeState.folders].sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const folderItem: TreeDataItem = {
        actions: (
          <>
            {folder.readOnly ? null : (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  navigateToFolder(folder.id, workspaceUuid);
                  window.setTimeout(() => {
                    filesUiActions.emitIntent("uploadFile");
                  }, 0);
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <FilePlus2 className="size-3.5" />
                <span className="sr-only">Upload file</span>
              </Button>
            )}
            {folder.readOnly ? null : (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  deleteTreeItems([{ id: folder.id, kind: "folder" }]).catch(
                    () => undefined
                  );
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Delete folder</span>
              </Button>
            )}
          </>
        ),
        draggable: !folder.readOnly,
        droppable: !folder.readOnly,
        icon: TreeFolderClosedIcon,
        id: folder.id,
        name: folder.name,
        onClick: () => {
          navigateToFolder(folder.id, workspaceUuid);
        },
        contextMenuContent: (
          <>
            <ContextMenuItem
              onClick={() =>
                navigate(
                  `/workspace/files/${workspaceUuid}/folder/${folder.id}` as Route
                )
              }
            >
              <Files className="mr-2 size-3.5" />
              Open
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                navigate(
                  `/workspace/files/${workspaceUuid}/folder/${folder.id}` as Route,
                  { openInNewPane: true }
                )
              }
            >
              <Columns className="mr-2 size-3.5" />
              Open in new pane
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                navigate(
                  `/workspace/files/${workspaceUuid}/folder/${folder.id}` as Route,
                  { openInNewTab: true }
                )
              }
            >
              <Plus className="mr-2 size-3.5" />
              Open in new tab
            </ContextMenuItem>
            {folder.readOnly ? null : (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() =>
                    deleteTreeItems([{ id: folder.id, kind: "folder" }]).catch(
                      () => undefined
                    )
                  }
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </ContextMenuItem>
              </>
            )}
          </>
        ),
        openIcon: TreeFolderOpenIcon,
        selectedIcon: TreeFolderOpenIcon,
      };
      addChild(folder.parentId, folderItem);
    }

    for (const file of [...filteredFileTreeState.files].sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      addChild(file.folderId, {
        actions: file.readOnly ? null : (
          <Button
            onClick={(event) => {
              event.stopPropagation();
              deleteTreeItems([{ id: file.id, kind: "file" }]).catch(
                () => undefined
              );
            }}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Delete file</span>
          </Button>
        ),
        draggable: !file.readOnly,
        icon: getTreeFileIconComponent(file.name),
        id: file.id,
        name: file.name,
        onClick: () => {
          navigateToFile(file.id, file.folderId, workspaceUuid);
        },
        contextMenuContent: (
          <>
            <ContextMenuItem
              onClick={() =>
                navigate(
                  `/workspace/files/${workspaceUuid}/folder/${file.folderId}?file=${file.id}` as Route
                )
              }
            >
              <Files className="mr-2 size-3.5" />
              Open
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                navigate(
                  `/workspace/files/${workspaceUuid}/folder/${file.folderId}?file=${file.id}` as Route,
                  { openInNewPane: true }
                )
              }
            >
              <Columns className="mr-2 size-3.5" />
              Open in new pane
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                navigate(
                  `/workspace/files/${workspaceUuid}/folder/${file.folderId}?file=${file.id}` as Route,
                  { openInNewTab: true }
                )
              }
            >
              <Plus className="mr-2 size-3.5" />
              Open in new tab
            </ContextMenuItem>
            {file.readOnly ? null : (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() =>
                    deleteTreeItems([{ id: file.id, kind: "file" }]).catch(
                      () => undefined
                    )
                  }
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </ContextMenuItem>
              </>
            )}
          </>
        ),
      });
    }

    const attachChildren = (parentId: string | null): TreeDataItem[] =>
      (childrenByFolderId.get(parentId) ?? []).map((item) => ({
        ...item,
        children: attachChildren(item.id),
      }));

    return attachChildren(null);
  }, [
    deleteTreeItems,
    filteredFileTreeState.files,
    filteredFileTreeState.folders,
    navigate,
    navigateToFile,
    navigateToFolder,
    workspaceUuid,
  ]);

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      ref={fileTreePanelRef}
    >
      <SidebarGroup>
        <div className="flex items-center justify-between gap-2 px-0.5 md:px-0">
          <SidebarGroupLabel className="sr-only md:not-sr-only">
            {sseConnected ? "Manage Live" : "Manage"}
          </SidebarGroupLabel>
          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 rounded-full border border-border/50 bg-background/45 p-0 text-muted-foreground shadow-none hover:bg-muted md:rounded-md"
              onClick={() => {
                commandPaletteActions.open({ scope: "files" });
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MagnifyingGlass className="size-3.5" />
            </Button>
            <Button
              className="h-7 w-7 rounded-full border border-border/50 bg-background/45 p-0 text-muted-foreground shadow-none hover:bg-muted md:rounded-md"
              onClick={() => {
                emitFileIntentAfterNavigation("newNote");
                triggerHaptic("selection");
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <FilePlus2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <SidebarGroupContent className="hidden md:block">
          <SidebarMenu>
            <SectionButton
              icon={FilePlus2}
              label="New Note"
              onClick={(event) => {
                if (event.ctrlKey && event.shiftKey) {
                  emitFileIntentAfterNavigation("newNote");
                  return;
                }
                emitFileIntentAfterNavigation("newNote");
                triggerHaptic("selection");
              }}
            />
            <SectionButton
              icon={LinkSimple}
              label="Import Link"
              onClick={(event) => {
                if (event.ctrlKey && event.shiftKey) {
                  emitFileIntentAfterNavigation("importLink");
                  return;
                }
                emitFileIntentAfterNavigation("importLink");
                triggerHaptic("selection");
              }}
            />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="min-h-0 flex-1">
        {workspaceUuid &&
        (filteredPinnedFolders.length > 0 || filteredPinnedFiles.length > 0) ? (
          <>
            <SidebarGroupLabel>Pinned</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredPinnedFolders.map((item) => {
                  const folderHref =
                    `/workspace/files/${item.workspaceId}/folder/${item.id}` as Route;
                  return (
                    <SidebarMenuItem key={`pinned-folder-${item.id}`}>
                      <ContextMenu>
                        <ContextMenuTrigger
                          render={<div className="contents" />}
                        >
                          <SidebarMenuButton
                            draggable
                            onClick={(event) => {
                              if (handlePaneIntent(event, folderHref)) {
                                return;
                              }
                              navigateToFolder(item.id, item.workspaceId);
                            }}
                            onDragStart={(event) => {
                              setWorkspacePaneDragData(
                                event.dataTransfer,
                                folderHref
                              );
                            }}
                          >
                            <Pin className="size-4" />
                            <span className="truncate">{item.name}</span>
                          </SidebarMenuButton>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => navigate(folderHref)}>
                            <Files className="mr-2 size-3.5" />
                            Open
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() =>
                              navigate(folderHref, { openInNewPane: true })
                            }
                          >
                            <Columns className="mr-2 size-3.5" />
                            Open in new pane
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() =>
                              navigate(folderHref, { openInNewTab: true })
                            }
                          >
                            <Plus className="mr-2 size-3.5" />
                            Open in new tab
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() =>
                              filesPinsActions.togglePinnedItem(
                                item.workspaceId,
                                item
                              )
                            }
                          >
                            <Pin className="mr-2 size-3.5" />
                            Unpin
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </SidebarMenuItem>
                  );
                })}
                {filteredPinnedFiles.map((item) => {
                  const fileHref = item.folderId
                    ? (`/workspace/files/${item.workspaceId}/folder/${item.folderId}?file=${item.id}` as Route)
                    : undefined;
                  return (
                    <SidebarMenuItem key={`pinned-file-${item.id}`}>
                      <ContextMenu>
                        <ContextMenuTrigger
                          render={<div className="contents" />}
                        >
                          <SidebarMenuButton
                            draggable={Boolean(item.folderId)}
                            onClick={(event) => {
                              if (!fileHref) {
                                return;
                              }
                              if (handlePaneIntent(event, fileHref)) {
                                return;
                              }
                              navigateToFile(
                                item.id,
                                item.folderId!,
                                item.workspaceId
                              );
                            }}
                            onDragStart={(event) => {
                              if (!fileHref) {
                                return;
                              }
                              setWorkspacePaneDragData(
                                event.dataTransfer,
                                fileHref
                              );
                            }}
                          >
                            <Pin className="size-4" />
                            <span className="truncate">{item.name}</span>
                          </SidebarMenuButton>
                        </ContextMenuTrigger>
                        {fileHref ? (
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => navigate(fileHref)}>
                              <Files className="mr-2 size-3.5" />
                              Open
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() =>
                                navigate(fileHref, { openInNewPane: true })
                              }
                            >
                              <Columns className="mr-2 size-3.5" />
                              Open in new pane
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() =>
                                navigate(fileHref, { openInNewTab: true })
                              }
                            >
                              <Plus className="mr-2 size-3.5" />
                              Open in new tab
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() =>
                                filesPinsActions.togglePinnedItem(
                                  item.workspaceId,
                                  item
                                )
                              }
                            >
                              <Pin className="mr-2 size-3.5" />
                              Unpin
                            </ContextMenuItem>
                          </ContextMenuContent>
                        ) : null}
                      </ContextMenu>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </>
        ) : null}
        <SidebarGroupLabel className="mt-1 md:mt-0">
          Your Files
        </SidebarGroupLabel>
        <SidebarGroupContent className="min-h-0">
          {workspaceUuid && folderTree.length > 0 ? (
            <div className="h-full min-w-0 pr-1">
              <TreeView
                className="h-full min-w-0 overflow-y-auto rounded-xl"
                data={sidebarTreeData}
                expandedItemIds={expandedTreePathIds}
                onExpandedChange={(itemIds) => {
                  setExpandedTreePaths(new Set(itemIds));
                }}
                onMoveItem={(draggedItemId, targetItemId) => {
                  const draggedFolder = folderTree.find(
                    (item) => item.id === draggedItemId
                  );
                  if (draggedFolder) {
                    moveTreeItem(
                      { id: draggedItemId, kind: "folder" },
                      targetItemId
                    ).catch(() => undefined);
                    return;
                  }
                  const draggedFile = fileTree.find(
                    (item) => item.id === draggedItemId
                  );
                  if (draggedFile) {
                    moveTreeItem(
                      { id: draggedItemId, kind: "file" },
                      targetItemId
                    ).catch(() => undefined);
                  }
                }}
                selectedItemId={currentFileId ?? currentFolderId}
              />
            </div>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <ContextMenu>
                  <ContextMenuTrigger render={<div className="contents" />}>
                    <SidebarMenuButton
                      draggable
                      onClick={(event) => {
                        if (
                          handlePaneIntent(event, "/workspace/files" as Route)
                        ) {
                          return;
                        }
                        navigateToFilesRoot().catch(() => undefined);
                      }}
                      onDragStart={(event) => {
                        setWorkspacePaneDragData(
                          event.dataTransfer,
                          "/workspace/files" as Route
                        );
                      }}
                    >
                      <Files className="size-4" />
                      <span>Workspace</span>
                    </SidebarMenuButton>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() =>
                        navigate("/workspace/files" as Route, {
                          openInNewPane: true,
                        })
                      }
                    >
                      <Columns className="mr-2 size-3.5" />
                      Open in new pane
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        navigate("/workspace/files" as Route, {
                          openInNewTab: true,
                        })
                      }
                    >
                      <Plus className="mr-2 size-3.5" />
                      Open in new tab
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
