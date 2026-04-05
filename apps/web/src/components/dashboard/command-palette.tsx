"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@avenire/ui/components/command";
import { Spinner } from "@avenire/ui/components/spinner";
import type { Icon } from "@phosphor-icons/react";
import {
  Building as Building2,
  ClockCounterClockwise,
  FilePlus as FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  ListChecks,
  ChatText as MessageSquareText,
  Moon,
  Gear as Settings,
  Sparkle as Sparkles,
  Sun,
  Warning as TriangleAlert,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { WorkspaceSearchResult } from "@/components/files/stylized-search-bar";
import { warmWorkspaceSurface } from "@/lib/dashboard-warmup";
import {
  getTaskStoreSnapshot,
  primeWorkspaceTaskStore,
  reloadWorkspaceTasks,
  subscribeToTaskStore,
} from "@/lib/task-client-store";
import { formatTaskDueDate } from "@/lib/tasks";
import {
  commandPaletteActions,
  useCommandPaletteStore,
} from "@/stores/commandPaletteStore";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";
import { filesUiActions } from "@/stores/filesUiStore";
import { quickCaptureActions } from "@/stores/quickCaptureStore";
import { readCachedChats, readCachedFlashcardSets } from "@/lib/dashboard-browser-cache";
import type { ChatSummary } from "@/lib/chat-data";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import {
  readWorkspaceTreeCache,
  writeWorkspaceTreeCache,
} from "@/lib/workspace-tree-cache";

type PaletteItemType = "file" | "folder";
type PaletteSearchType = "chat" | "flashcard";

interface PaletteItem {
  folderId?: string;
  id: string;
  name: string;
  path: string;
  type: PaletteItemType;
  workspaceName: string;
  workspaceUuid: string;
}

interface PaletteSearchItem {
  description: string;
  id: string;
  label: string;
  meta: string;
  path: string;
  type: PaletteSearchType;
}

interface PaletteCommandItem {
  description: string;
  group: "General" | "Create";
  icon: Icon;
  key: string;
  label: string;
  onSelect: () => void;
  searchTerms: string[];
  shortcut?: string;
}

const FILE_FUSE_OPTIONS = {
  includeScore: true,
  ignoreLocation: true,
  keys: ["name", "path", "workspaceName"],
  threshold: 0.45,
};

const FILE_RESULTS_LIMIT = 8;
const FILES_ROUTE_PATTERN = /^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)$/;

type WorkspaceSummary = {
  logo?: string | null;
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
};

type WorkspaceTreePayload = {
  files?: Array<{
    folderId: string;
    id: string;
    name: string;
    readOnly?: boolean;
  }>;
  folders?: Array<{
    id: string;
    name: string;
    parentId: string | null;
    readOnly?: boolean;
  }>;
};

async function hydrateWorkspaceIndex(workspace: WorkspaceSummary) {
  const cached = readWorkspaceTreeCache<
    {
      id: string;
      name: string;
      parentId: string | null;
      readOnly?: boolean;
    },
    {
      folderId: string;
      id: string;
      name: string;
      readOnly?: boolean;
    }
  >(workspace.workspaceId);

  if (cached) {
    commandPaletteActions.setFileIndex({
      workspaceUuid: workspace.workspaceId,
      workspaceName: workspace.name,
      rootFolderId: workspace.rootFolderId,
      folders: cached.folders,
      files: cached.files,
    });
  }

  const response = await fetch(`/api/workspaces/${workspace.workspaceId}/tree`, {
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return;
  }

  const payload = (await response.json()) as WorkspaceTreePayload;
  const folders = payload.folders ?? [];
  const files = (payload.files ?? []).map((file) => ({
    folderId: file.folderId,
    id: file.id,
    name: file.name,
    readOnly: file.readOnly,
  }));

  writeWorkspaceTreeCache(workspace.workspaceId, {
    files,
    folders,
  });
  commandPaletteActions.setFileIndex({
    workspaceUuid: workspace.workspaceId,
    workspaceName: workspace.name,
    rootFolderId: workspace.rootFolderId,
    folders,
    files,
  });
}

async function queryWorkspaceRetrieval(input: {
  files: Array<{
    folderId?: string;
    id: string;
    name: string;
  }>;
  query: string;
  signal: AbortSignal;
  workspaceUuid: string;
}): Promise<WorkspaceSearchResult[]> {
  const response = await fetch("/api/ai/retrieval/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: input.signal,
    body: JSON.stringify({
      workspaceUuid: input.workspaceUuid,
      query: input.query,
      limit: FILE_RESULTS_LIMIT,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    results?: Array<{
      chunkId?: string;
      content: string;
      endMs?: number | null;
      fileId?: string | null;
      page?: number | null;
      rerankScore?: number;
      score?: number;
      sourceType?: "audio" | "image" | "link" | "markdown" | "pdf" | "video";
      startMs?: number | null;
      title?: string | null;
    }>;
  };

  const fileById = new Map(input.files.map((file) => [file.id, file]));
  const mapped: WorkspaceSearchResult[] = [];

  for (const result of payload.results ?? []) {
    const fileId = result.fileId ?? null;
    if (!fileId) {
      continue;
    }

    const file = fileById.get(fileId);
    if (!file) {
      continue;
    }

    const snippet = (result.content || "").replace(/\s+/g, " ").trim();
    mapped.push({
      chunkId: result.chunkId,
      id: fileId,
      fileId,
      description: file.name,
      snippet:
        snippet.length > 220
          ? `${snippet.slice(0, 220)}...`
          : snippet || "Match in file content",
      title: result.title ?? file.name,
      type: "file",
      sourceType: result.sourceType,
      score: result.rerankScore ?? result.score ?? 0,
      page: result.page ?? null,
      startMs: result.startMs ?? null,
      endMs: result.endMs ?? null,
    });
  }

  mapped.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return mapped.slice(0, FILE_RESULTS_LIMIT);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (tagName !== "input") {
    return false;
  }

  const input = target as HTMLInputElement;
  const ignoredInputTypes = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ]);

  return !ignoredInputTypes.has(input.type.toLowerCase());
}

function shouldIgnoreGlobalHotkey(event: KeyboardEvent): boolean {
  const activeElement = document.activeElement;

  return (
    isTypingTarget(event.target) ||
    isTypingTarget(activeElement)
  );
}

function commandMatches(item: PaletteCommandItem, needle: string) {
  const haystack = [item.label, item.description, ...item.searchTerms]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function matchesNeedle(value: string, needle: string) {
  return value.toLowerCase().includes(needle);
}

export function CommandPalette({
  workspaceUuid: activeWorkspaceUuid,
  workspaces = [],
}: {
  workspaceUuid?: string;
  workspaces?: WorkspaceSummary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setSettingsOpen = useDashboardOverlayStore(
    (state) => state.setSettingsOpen
  );
  const setSettingsTab = useDashboardOverlayStore(
    (state) => state.setSettingsTab
  );
  const { resolvedTheme, setTheme } = useTheme();
  const open = useCommandPaletteStore((state) => state.open);
  const workspaceUuid = useCommandPaletteStore((state) => state.workspaceUuid);
  const fileIndexByWorkspace = useCommandPaletteStore(
    (state) => state.fileIndexByWorkspace
  );
  const recentFileIdsByWorkspace = useCommandPaletteStore(
    (state) => state.recentFileIdsByWorkspace
  );
  const { tasks: cachedTasks } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const resolvedWorkspaceUuid = activeWorkspaceUuid ?? workspaceUuid ?? null;

  const currentRoute = useMemo(() => {
    const nextQuery = searchParams.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    useCommandPaletteStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) {
        return;
      }

      if (shouldIgnoreGlobalHotkey(event)) {
        return;
      }

      if (event.key.toLowerCase() !== "p") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      commandPaletteActions.open();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (open) {
      return;
    }

    setQuery("");
    setDebouncedQuery("");
    setPendingRoute(null);
  }, [open]);

  useEffect(() => {
    if (!pendingRoute || currentRoute !== pendingRoute) {
      return;
    }

    setPendingRoute(null);
    commandPaletteActions.close();
  }, [currentRoute, pendingRoute]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    if (!(open && resolvedWorkspaceUuid)) {
      return;
    }

    primeWorkspaceTaskStore(resolvedWorkspaceUuid);
    void reloadWorkspaceTasks(resolvedWorkspaceUuid, { background: true });
  }, [open, resolvedWorkspaceUuid]);

  const currentFilesRouteMatch = pathname.match(FILES_ROUTE_PATTERN);
  const currentFilesWorkspaceUuid = currentFilesRouteMatch?.[1] ?? null;
  const currentFilesFolderId = currentFilesRouteMatch?.[2] ?? null;
  const activeFileId = searchParams.get("file");

  useEffect(() => {
    if (!(currentFilesWorkspaceUuid && activeFileId)) {
      return;
    }

    commandPaletteActions.recordRecentFile(
      currentFilesWorkspaceUuid,
      activeFileId
    );
  }, [activeFileId, currentFilesWorkspaceUuid]);

  useEffect(() => {
    if (!open) {
      return;
    }

    for (const workspace of workspaces) {
      const existingIndex = fileIndexByWorkspace[workspace.workspaceId];
      if (existingIndex?.files.length || existingIndex?.folders.length) {
        continue;
      }
      void hydrateWorkspaceIndex(workspace);
    }
  }, [fileIndexByWorkspace, open, workspaces]);

  const workspaceItems = useMemo(() => {
    const folderPathMaps = new Map<string, Map<string, string>>();
    const files: PaletteItem[] = [];
    const folders: PaletteItem[] = [];

    for (const workspace of workspaces) {
      const index = fileIndexByWorkspace[workspace.workspaceId];
      if (!index) {
        continue;
      }

      const folderById = new Map(index.folders.map((folder) => [folder.id, folder]));
      const cache = new Map<string, string>();
      const resolvePath = (folderId: string | null): string => {
        if (!folderId) {
          return "";
        }

        const cached = cache.get(folderId);
        if (cached !== undefined) {
          return cached;
        }

        const segments: string[] = [];
        const seen = new Set<string>();
        let cursor: string | null = folderId;

        while (cursor) {
          if (seen.has(cursor)) {
            break;
          }
          seen.add(cursor);
          const folder = folderById.get(cursor);
          if (!folder) {
            break;
          }
          if (folder.parentId === null) {
            break;
          }
          segments.push(folder.name);
          cursor = folder.parentId;
        }

        const resolved = segments.reverse().join("/");
        cache.set(folderId, resolved);
        return resolved;
      };

      const folderPathById = new Map<string, string>();
      for (const folder of index.folders) {
        const path = resolvePath(folder.id);
        folderPathById.set(folder.id, path || folder.name);
        folders.push({
          id: folder.id,
          name: folder.name,
          path: path || folder.name,
          type: "folder",
          workspaceName: workspace.name,
          workspaceUuid: workspace.workspaceId,
        });
      }

      folderPathMaps.set(workspace.workspaceId, folderPathById);

      for (const file of index.files) {
        const folderPath = folderPathById.get(file.folderId) ?? "";
        files.push({
          folderId: file.folderId,
          id: file.id,
          name: file.name,
          path: folderPath ? `${folderPath}/${file.name}` : file.name,
          type: "file",
          workspaceName: workspace.name,
          workspaceUuid: workspace.workspaceId,
        });
      }
    }

    return { files, folderPathMaps, folders };
  }, [fileIndexByWorkspace, workspaces]);

  const fileItems = workspaceItems.files;
  const folderItems = workspaceItems.folders;

  const recentItems = useMemo(() => {
    const targetWorkspaceIds = resolvedWorkspaceUuid
      ? [resolvedWorkspaceUuid]
      : workspaces.map((workspace) => workspace.workspaceId);
    const fileByWorkspaceAndId = new Map(
      fileItems.map((file) => [`${file.workspaceUuid}:${file.id}`, file])
    );
    const items: PaletteItem[] = [];

    for (const targetWorkspaceId of targetWorkspaceIds) {
      const recentIds = recentFileIdsByWorkspace[targetWorkspaceId] ?? [];
      for (const fileId of recentIds) {
        const item = fileByWorkspaceAndId.get(`${targetWorkspaceId}:${fileId}`);
        if (item) {
          items.push(item);
        }
      }
    }

    return items.slice(0, 8);
  }, [fileItems, recentFileIdsByWorkspace, resolvedWorkspaceUuid, workspaces]);

  const searchItems = useMemo(
    () => [...fileItems, ...folderItems],
    [fileItems, folderItems]
  );

  const fuse = useMemo(
    () => new Fuse(searchItems, FILE_FUSE_OPTIONS),
    [searchItems]
  );

  const workspaceTasks = useMemo(
    () =>
      cachedTasks
        .filter((task) => task.workspaceId === resolvedWorkspaceUuid)
        .slice(0, 8),
    [cachedTasks, resolvedWorkspaceUuid]
  );
  const cachedChats = useMemo<ChatSummary[]>(
    () => (resolvedWorkspaceUuid ? readCachedChats(resolvedWorkspaceUuid) ?? [] : []),
    [resolvedWorkspaceUuid]
  );
  const cachedFlashcardSets = useMemo<FlashcardSetSummary[]>(
    () =>
      resolvedWorkspaceUuid
        ? readCachedFlashcardSets(resolvedWorkspaceUuid) ?? []
        : [],
    [resolvedWorkspaceUuid]
  );

  const openFilesRoute = useCallback(() => {
    const targetWorkspace = workspaces.find(
      (entry) => entry.workspaceId === resolvedWorkspaceUuid
    );
    const targetRoute =
      targetWorkspace?.workspaceId && targetWorkspace.rootFolderId
        ? (`/workspace/files/${targetWorkspace.workspaceId}/folder/${targetWorkspace.rootFolderId}` as Route)
        : targetWorkspace?.workspaceId
          ? (`/workspace/files/${targetWorkspace.workspaceId}` as Route)
          : ("/workspace/files" as Route);

    router.prefetch(targetRoute);
    setPendingRoute(targetRoute);

    startTransition(() => {
      if (currentRoute === targetRoute) {
        commandPaletteActions.close();
        return;
      }

      router.push(targetRoute);
    });
  }, [currentRoute, resolvedWorkspaceUuid, router, workspaces]);

  const handleFileIntent = useCallback(
    (intent: Parameters<typeof filesUiActions.emitIntent>[0]) => {
      filesUiActions.emitIntent(intent);
      openFilesRoute();
    },
    [openFilesRoute]
  );

  const openSettings = useCallback(
    (
      tab?:
        | "account"
        | "preferences"
        | "workspace"
        | "data"
        | "billing"
        | "security"
        | "shortcuts"
    ) => {
      setSettingsTab(tab ?? null);
      setSettingsOpen(true);
      commandPaletteActions.close();
    },
    [setSettingsOpen, setSettingsTab]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    commandPaletteActions.close();
  }, [resolvedTheme, setTheme]);

  const commandItems = useMemo<PaletteCommandItem[]>(
    () => [
      {
        key: "settings",
        label: "Settings",
        description: "Open workspace settings",
        icon: Settings,
        group: "General",
        searchTerms: ["preferences", "workspace settings", "account"],
        onSelect: () => {
          openSettings();
        },
      },
      {
        key: "toggle-theme",
        label: "Toggle light/dark mode",
        description: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode.`,
        icon: resolvedTheme === "dark" ? Sun : Moon,
        group: "General",
        searchTerms: ["theme", "appearance", "mode"],
        onSelect: () => {
          toggleTheme();
        },
      },
      {
        key: "manage-workspace",
        label: "Manage workspace",
        description: "Open the workspace files manager",
        icon: Folder,
        group: "General",
        searchTerms: ["files", "explorer", "folders", "workspace"],
        onSelect: () => {
          openFilesRoute();
        },
      },
      {
        key: "open-tasks",
        label: "Open Tasks",
        description: "Open the dedicated task workspace",
        icon: ListChecks,
        group: "General",
        searchTerms: ["tasks", "todo", "planner", "upcoming"],
        shortcut: "Ctrl+3",
        onSelect: () => {
          startTransition(() => {
            router.push("/workspace/tasks" as Route);
          });
          commandPaletteActions.close();
        },
      },
      {
        key: "change-workspace",
        label: "Change workspace",
        description: "Open the workspace switcher",
        icon: Building2,
        group: "General",
        searchTerms: ["switch workspace", "workspace list", "team"],
        onSelect: () => {
          openSettings("workspace");
        },
      },
      {
        key: "new-chat",
        label: "New Method",
        description: "Start a new method thread",
        icon: MessageSquareText,
        group: "Create",
        searchTerms: ["chat", "thread", "method"],
        shortcut: "Ctrl+N",
        onSelect: () => {
          startTransition(() => {
            router.push("/workspace/chats/new" as Route);
          });
          commandPaletteActions.close();
        },
      },
      {
        key: "new-task",
        label: "New Task",
        description: "Capture a task and push it into the calendar",
        icon: FilePlus2,
        group: "Create",
        searchTerms: ["todo", "capture", "task"],
        shortcut: "Ctrl+Shift+T",
        onSelect: () => {
          quickCaptureActions.open("task");
          commandPaletteActions.close();
        },
      },
      {
        key: "new-misconception",
        label: "New Misconception",
        description: "Record a misconception for later review",
        icon: TriangleAlert,
        group: "Create",
        searchTerms: ["mistake", "note", "review"],
        shortcut: "Ctrl+Shift+M",
        onSelect: () => {
          quickCaptureActions.open("misconception");
          commandPaletteActions.close();
        },
      },
      {
        key: "new-flashcard",
        label: "New Flashcard Set",
        description: "Create a workspace flashcard set",
        icon: Sparkles,
        group: "Create",
        searchTerms: ["study", "cards", "flashcards"],
        onSelect: () => {
          startTransition(() => {
            router.push("/workspace/flashcards?create=1" as Route);
          });
          commandPaletteActions.close();
        },
      },
      {
        key: "new-note",
        label: "Create new note",
        description: "Create a workspace note",
        icon: FileText,
        group: "Create",
        searchTerms: ["note", "document", "markdown"],
        shortcut: "Ctrl+Shift+O",
        onSelect: () => {
          handleFileIntent("newNote");
        },
      },
      {
        key: "new-file",
        label: "Upload File",
        description: "Add a new file to the workspace",
        icon: FilePlus2,
        group: "Create",
        searchTerms: ["upload", "import", "file"],
        shortcut: "Ctrl+U",
        onSelect: () => {
          handleFileIntent("uploadFile");
        },
      },
      {
        key: "new-folder",
        label: "Create new folder",
        description: "Create a folder in the workspace",
        icon: FolderPlus,
        group: "Create",
        searchTerms: ["folder", "directory", "workspace"],
        shortcut: "Ctrl+Shift+N",
        onSelect: () => {
          handleFileIntent("createFolder");
        },
      },
    ],
    [
      handleFileIntent,
      openFilesRoute,
      openSettings,
      resolvedTheme,
      router,
      toggleTheme,
    ]
  );

  const trimmedQuery = debouncedQuery.trim().toLowerCase();
  const searchQuery = trimmedQuery;

  const filteredCommands = useMemo(() => {
    if (!searchQuery) {
      return {
        create: commandItems.filter((item) => item.group === "Create"),
        general: commandItems.filter((item) => item.group === "General"),
      };
    }

    const matches = commandItems.filter((item) =>
      commandMatches(item, searchQuery)
    );
    return {
      create: matches.filter((item) => item.group === "Create"),
      general: matches.filter((item) => item.group === "General"),
    };
  }, [commandItems, searchQuery]);

  const hasCommandMatches =
    filteredCommands.general.length > 0 || filteredCommands.create.length > 0;
  const chatResults = useMemo<PaletteSearchItem[]>(() => {
    if (!searchQuery) {
      return [];
    }

    return cachedChats
      .filter((chat) =>
        matchesNeedle(`${chat.title} ${chat.slug} ${chat.workspaceId}`, searchQuery)
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
      .map((chat) => ({
        description: chat.slug,
        id: chat.id,
        label: chat.title,
        meta: new Date(chat.updatedAt).toLocaleDateString(),
        path: `/workspace/chats/${chat.slug}`,
        type: "chat",
      }));
  }, [cachedChats, searchQuery]);
  const flashcardResults = useMemo<PaletteSearchItem[]>(() => {
    if (!searchQuery) {
      return [];
    }

    return cachedFlashcardSets
      .filter((set) => matchesNeedle(`${set.title} ${set.id}`, searchQuery))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
      .map((set) => ({
        description: `${set.dueCount} due · ${set.newCount} new`,
        id: set.id,
        label: set.title,
        meta: new Date(set.updatedAt).toLocaleDateString(),
        path: `/workspace/flashcards/${set.id}`,
        type: "flashcard",
      }));
  }, [cachedFlashcardSets, searchQuery]);
  const shouldSearchFiles =
    Boolean(searchQuery) &&
    !hasCommandMatches &&
    chatResults.length === 0 &&
    flashcardResults.length === 0 &&
    searchItems.length > 0;

  const fuzzyResults = useMemo(() => {
    if (!shouldSearchFiles) {
      return [];
    }

    return fuse
      .search(searchQuery)
      .filter((result) => (result.score ?? 1) <= FILE_FUSE_OPTIONS.threshold)
      .slice(0, FILE_RESULTS_LIMIT)
      .map((result) => result.item);
  }, [fuse, searchQuery, shouldSearchFiles]);

  const fileSearchFingerprint = useMemo(
    () =>
      fileItems
        .map(
          (file) =>
            `${file.workspaceUuid}:${file.id}:${file.name}:${file.folderId ?? ""}`
        )
        .join("\u0001"),
    [fileItems]
  );

  const retrievalQuery = useQuery({
    queryFn: ({ signal }) =>
      resolvedWorkspaceUuid && searchQuery
        ? queryWorkspaceRetrieval({
            files: fileItems
              .filter((file) => file.workspaceUuid === resolvedWorkspaceUuid)
              .map((file) => ({
                folderId: file.folderId,
                id: file.id,
                name: file.name,
              })),
            query: searchQuery,
            signal,
            workspaceUuid: resolvedWorkspaceUuid,
          })
        : Promise.resolve([]),
    queryKey: [
      "command-palette",
      "retrieval",
      resolvedWorkspaceUuid,
      searchQuery,
      fileSearchFingerprint,
    ],
    enabled: Boolean(
      open &&
        shouldSearchFiles &&
        fuzzyResults.length === 0 &&
        resolvedWorkspaceUuid
    ),
  });

  const retrievalResults =
    fuzzyResults.length > 0 || hasCommandMatches
      ? []
      : (retrievalQuery.data ?? []);
  const isRetrieving = retrievalQuery.isFetching;

  useEffect(() => {
    if (!(open && resolvedWorkspaceUuid)) {
      return;
    }

    const currentWorkspace = workspaces.find(
      (entry) => entry.workspaceId === resolvedWorkspaceUuid
    );
    const targetRoute =
      currentFilesWorkspaceUuid === resolvedWorkspaceUuid && currentFilesFolderId
        ? (`/workspace/files/${resolvedWorkspaceUuid}/folder/${currentFilesFolderId}` as Route)
        : currentWorkspace?.rootFolderId
          ? (`/workspace/files/${resolvedWorkspaceUuid}/folder/${currentWorkspace.rootFolderId}` as Route)
          : (`/workspace/files/${resolvedWorkspaceUuid}` as Route);

    router.prefetch(targetRoute);
    warmWorkspaceSurface("files", {
      currentFolderId: currentFilesFolderId,
      rootFolderId: currentWorkspace?.rootFolderId ?? null,
      workspaceUuid: resolvedWorkspaceUuid,
    }).catch(() => undefined);
  }, [
    currentFilesFolderId,
    currentFilesWorkspaceUuid,
    open,
    resolvedWorkspaceUuid,
    router,
    workspaces,
  ]);

  const handleOpenFolder = useCallback(
    (item: PaletteItem) => {
      const targetRoute =
        `/workspace/files/${item.workspaceUuid}/folder/${item.id}` as Route;
      router.prefetch(targetRoute);
      setPendingRoute(targetRoute);

      startTransition(() => {
        router.push(targetRoute);
      });
    },
    [router]
  );

  const handleOpenFile = useCallback(
    (
      workspaceId: string,
      fileId: string,
      folderId: string | undefined,
      options?: { retrievalChunkId?: string | null }
    ) => {
      commandPaletteActions.recordRecentFile(workspaceId, fileId);
      const workspace = workspaces.find((entry) => entry.workspaceId === workspaceId);

      if (!folderId) {
        const fallbackRoute = workspace?.rootFolderId
          ? (`/workspace/files/${workspaceId}/folder/${workspace.rootFolderId}` as Route)
          : (`/workspace/files/${workspaceId}` as Route);
        router.prefetch(fallbackRoute);
        setPendingRoute(fallbackRoute);
        startTransition(() => {
          router.push(fallbackRoute);
        });
        return;
      }

      const params = new URLSearchParams();
      params.set("file", fileId);
      if (options?.retrievalChunkId) {
        params.set("retrievalChunk", options.retrievalChunkId);
      }

      const targetRoute =
        `/workspace/files/${workspaceId}/folder/${folderId}?${params.toString()}` as Route;
      router.prefetch(targetRoute);
      setPendingRoute(targetRoute);

      startTransition(() => {
        if (
          currentFilesWorkspaceUuid === workspaceId &&
          currentFilesFolderId === folderId
        ) {
          router.replace(targetRoute);
        } else {
          router.push(targetRoute);
        }
      });
    },
    [
      currentFilesFolderId,
      currentFilesWorkspaceUuid,
      router,
      workspaces,
    ]
  );

  const openSearchResult = useCallback(
    (result: WorkspaceSearchResult) => {
      if (!resolvedWorkspaceUuid) {
        return;
      }

      const targetFileId = result.fileId ?? result.id;
      const targetFile = fileItems.find(
        (file) =>
          file.workspaceUuid === resolvedWorkspaceUuid && file.id === targetFileId
      );
      const targetFolderId = targetFile?.folderId ?? currentFilesFolderId ?? undefined;

      handleOpenFile(resolvedWorkspaceUuid, targetFileId, targetFolderId, {
        retrievalChunkId: result.chunkId ?? null,
      });
    },
    [currentFilesFolderId, fileItems, handleOpenFile, resolvedWorkspaceUuid]
  );

  const renderCommandGroups = () => (
    <>
      {filteredCommands.general.length > 0 ? (
        <CommandGroup heading="General">
          {filteredCommands.general.map((item) => (
            <CommandItem
              key={item.key}
              onSelect={() => item.onSelect()}
              value={[item.label, item.description, ...item.searchTerms].join(
                " "
              )}
            >
              <item.icon className="size-3.5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium text-foreground text-xs">
                  {item.label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {item.description}
                </p>
              </div>
              {item.shortcut ? (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {filteredCommands.general.length > 0 &&
      filteredCommands.create.length > 0 ? (
        <CommandSeparator />
      ) : null}
      {filteredCommands.create.length > 0 ? (
        <CommandGroup heading="Create">
          {filteredCommands.create.map((item) => (
            <CommandItem
              key={item.key}
              onSelect={() => item.onSelect()}
              value={[item.label, item.description, ...item.searchTerms].join(
                " "
              )}
            >
              <item.icon className="size-3.5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium text-foreground text-xs">
                  {item.label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {item.description}
                </p>
              </div>
              {item.shortcut ? (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
    </>
  );

  return (
    <CommandDialog
      className="sm:max-w-6xl lg:max-w-[88rem]"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          commandPaletteActions.close();
          return;
        }

        commandPaletteActions.open();
      }}
      open={open}
    >
      <Command
        className="h-[min(34rem,calc(100dvh-4rem))] min-h-0 p-0"
        shouldFilter={false}
      >
        <CommandInput
          onValueChange={setQuery}
          placeholder="Run a command, open a file, or search workspace content..."
          value={query}
        />
        {pendingRoute ? (
          <div className="flex items-center gap-2 border-border/60 border-t px-4 py-3 text-muted-foreground text-xs">
            <Spinner className="size-3.5" />
            Opening selection...
          </div>
        ) : null}
        <div className="grid min-h-0 flex-1 grid-cols-1 border-border/60 border-t">
          <div className="min-h-0">
            <CommandList className="max-h-none min-h-0">
              {!searchQuery ? (
                <>
                  {workspaceTasks.length > 0 ? (
                    <CommandGroup heading="Upcoming tasks">
                      {workspaceTasks.map((task) => (
                        <CommandItem
                          key={`task-${task.id}`}
                          onSelect={() => {
                            startTransition(() => {
                              router.push(
                                `/workspace/tasks?task=${task.id}` as Route
                              );
                            });
                            commandPaletteActions.close();
                          }}
                          value={`${task.title} ${task.description ?? ""} ${task.assignee?.name ?? ""} task`}
                        >
                          <ListChecks className="size-3.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground text-xs">
                              {task.title}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {formatTaskDueDate(task.dueAt)}
                              {task.assignee?.name ? ` • ${task.assignee.name}` : ""}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                  {workspaceTasks.length > 0 ? <CommandSeparator /> : null}
                  {recentItems.length > 0 ? (
                    <CommandGroup heading="Recent files">
                      {recentItems.map((item) => (
                        <CommandItem
                          key={`recent-${item.id}`}
                          onSelect={() => {
                            handleOpenFile(
                              item.workspaceUuid,
                              item.id,
                              item.folderId
                            );
                          }}
                          value={`${item.name} ${item.path} recent`}
                        >
                          <ClockCounterClockwise className="size-3.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground text-xs">
                              {item.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.path}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                  {recentItems.length > 0 ? <CommandSeparator /> : null}
                  {cachedChats.length > 0 ? (
                    <>
                      <CommandGroup heading="Recent chats">
                        {cachedChats
                          .slice()
                          .sort((left, right) =>
                            right.updatedAt.localeCompare(left.updatedAt)
                          )
                          .slice(0, 6)
                          .map((chat) => (
                            <CommandItem
                              key={`recent-chat-${chat.slug}`}
                              onSelect={() => {
                                startTransition(() => {
                                  router.push(
                                    `/workspace/chats/${chat.slug}` as Route
                                  );
                                });
                                commandPaletteActions.close();
                              }}
                              value={`${chat.title} ${chat.slug} chat`}
                            >
                              <MessageSquareText className="size-3.5 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground text-xs">
                                  {chat.title}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {chat.slug}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  ) : null}
                  {cachedFlashcardSets.length > 0 ? (
                    <>
                      <CommandGroup heading="Recent flashcards">
                        {cachedFlashcardSets
                          .slice()
                          .sort((left, right) =>
                            right.updatedAt.localeCompare(left.updatedAt)
                          )
                          .slice(0, 6)
                          .map((set) => (
                            <CommandItem
                              key={`recent-flashcard-${set.id}`}
                              onSelect={() => {
                                startTransition(() => {
                                  router.push(
                                    `/workspace/flashcards/${set.id}` as Route
                                  );
                                });
                                commandPaletteActions.close();
                              }}
                              value={`${set.title} ${set.id} flashcard`}
                            >
                              <Sparkles className="size-3.5 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground text-xs">
                                  {set.title}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {set.dueCount + set.newCount} ready
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  ) : null}
                  {renderCommandGroups()}
                </>
              ) : hasCommandMatches ? (
                renderCommandGroups()
              ) : searchItems.length > 0 || resolvedWorkspaceUuid ? (
                <>
                  {chatResults.length > 0 ? (
                    <CommandGroup heading="Chats">
                      {chatResults.map((chat) => (
                        <CommandItem
                          key={`chat-${chat.id}`}
                          onSelect={() => {
                            startTransition(() => {
                              router.push(chat.path as Route);
                            });
                            commandPaletteActions.close();
                          }}
                          value={`${chat.label} ${chat.description} chat`}
                        >
                          <MessageSquareText className="size-3.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground text-xs">
                              {chat.label}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {chat.description}
                            </p>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {chat.meta}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                  {flashcardResults.length > 0 ? (
                    <>
                      {chatResults.length > 0 ? <CommandSeparator /> : null}
                      <CommandGroup heading="Flashcards">
                        {flashcardResults.map((set) => (
                          <CommandItem
                            key={`flashcard-${set.id}`}
                            onSelect={() => {
                              startTransition(() => {
                                router.push(set.path as Route);
                              });
                              commandPaletteActions.close();
                            }}
                            value={`${set.label} ${set.description} flashcard`}
                          >
                            <Sparkles className="size-3.5 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground text-xs">
                                {set.label}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {set.description}
                              </p>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {set.meta}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {fuzzyResults.length > 0 || isRetrieving || retrievalResults.length > 0 ? (
                        <CommandSeparator />
                      ) : null}
                    </>
                  ) : null}
                  {fuzzyResults.length > 0 ? (
                    <CommandGroup heading="Files and folders">
                      {fuzzyResults.map((item) => (
                        <CommandItem
                          key={`${item.type}-${item.id}`}
                          onSelect={() => {
                            if (item.type === "folder") {
                              handleOpenFolder(item);
                              return;
                            }

                            handleOpenFile(item.workspaceUuid, item.id, item.folderId);
                          }}
                          value={`${item.workspaceName} ${item.name} ${item.path} ${item.type}`}
                        >
                          {item.type === "folder" ? (
                            <Folder className="size-3.5 text-muted-foreground" />
                          ) : (
                            <FileText className="size-3.5 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground text-xs">
                              {item.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.path}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.workspaceName}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {fuzzyResults.length === 0 &&
                  (isRetrieving || retrievalResults.length > 0) ? (
                    <CommandGroup heading="Content search">
                      {isRetrieving ? (
                        <CommandItem
                          disabled
                          value="searching workspace content"
                        >
                          <Spinner className="size-3.5" />
                          <span className="text-muted-foreground text-xs">
                            Searching workspace content...
                          </span>
                        </CommandItem>
                      ) : null}
                      {retrievalResults.map((result) => {
                        const file = fileItems.find(
                          (entry) =>
                            entry.workspaceUuid === resolvedWorkspaceUuid &&
                            entry.id === result.id
                        );
                        const folderPath = file
                          ? (workspaceItems.folderPathMaps
                              .get(file.workspaceUuid)
                              ?.get(file.folderId ?? "") ?? "")
                          : "";
                        const filePath = file
                          ? folderPath
                            ? `${folderPath}/${file.name}`
                            : file.name
                          : result.title;

                        return (
                          <CommandItem
                            key={`retrieval-${result.id}-${result.chunkId ?? "main"}`}
                            onSelect={() => {
                              openSearchResult(result);
                            }}
                            value={`${result.title} ${filePath} ${result.snippet}`}
                          >
                            <FileText className="size-3.5 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground text-xs">
                                {result.title}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {filePath}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {result.snippet}
                              </p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ) : null}

                  {fuzzyResults.length === 0 &&
                  !isRetrieving &&
                  retrievalResults.length === 0 ? (
                    <CommandEmpty>
                      No matching commands, files, or content found.
                    </CommandEmpty>
                  ) : null}
                </>
              ) : (
                <CommandEmpty>
                  No matching commands found. Workspace files are still indexing.
                </CommandEmpty>
              )}
            </CommandList>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
