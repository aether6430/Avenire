"use client";

import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@avenire/ui/components/command";
import { Kbd, KbdGroup } from "@avenire/ui/components/kbd";
import { Spinner } from "@avenire/ui/components/spinner";
import type { Icon } from "@phosphor-icons/react";
import {
  Building as Building2,
  CaretRight as ChevronRight,
  ClockCounterClockwise,
  FilePlus as FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Funnel as ListFilter,
  LinkSimple,
  ListChecks,
  MagnifyingGlass as Search,
  ChatText as MessageSquareText,
  Moon,
  SidebarSimple,
  Gear as Settings,
  Sparkle as Sparkles,
  Sun,
  Warning as TriangleAlert,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceSurfaceNavigation } from "@/lib/workspace-panes";
import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ElementType, ReactNode } from "react";
import type { WorkspaceSearchResult } from "@/components/files/stylized-search-bar";
import type { ChatSummary } from "@/lib/chat-data";
import {
  readCachedChats,
  readCachedFlashcardSets,
} from "@/lib/dashboard-browser-cache";
import { warmWorkspaceSurface } from "@/lib/dashboard-warmup";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import {
  getTaskStoreSnapshot,
  primeWorkspaceTaskStore,
  reloadWorkspaceTasks,
  subscribeToTaskStore,
} from "@/lib/task-client-store";
import { formatTaskDueDate } from "@/lib/tasks";
import {
  readWorkspaceTreeCache,
  writeWorkspaceTreeCache,
} from "@/lib/workspace-tree-cache";
import {
  commandPaletteActions,
  useCommandPaletteStore,
} from "@/stores/commandPaletteStore";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";
import { Markdown } from "@/components/chat/markdown";
import { filesUiActions } from "@/stores/filesUiStore";
import { quickCaptureActions } from "@/stores/quickCaptureStore";
import { cn } from "@/lib/utils";

type PaletteItemType = "file" | "folder";
type PaletteSearchType = "chat" | "flashcard";

interface PaletteItem {
  folderId?: string;
  id: string;
  name: string;
  page?: {
    bannerUrl: string | null;
  } | null;
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
  threshold: 0.34,
  useExtendedSearch: true,
};

const FILE_RESULTS_LIMIT = 8;
const FILES_ROUTE_PATTERN = /^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)$/;

interface WorkspaceSummary {
  logo?: string | null;
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
}

interface WorkspaceTreePayload {
  files?: Array<{
    folderId: string;
    id: string;
    name: string;
    page?: {
      bannerUrl: string | null;
    } | null;
    readOnly?: boolean;
  }>;
  folders?: Array<{
    id: string;
    name: string;
    parentId: string | null;
    readOnly?: boolean;
  }>;
}

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
        page?: { bannerUrl: string | null } | null;
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

  const response = await fetch(
    `/api/workspaces/${workspace.workspaceId}/tree`,
    {
      cache: "no-store",
    }
  ).catch(() => null);

  if (!response?.ok) {
    return;
  }

  const payload = (await response.json()) as WorkspaceTreePayload;
  const folders = payload.folders ?? [];
  const files = (payload.files ?? []).map((file) => ({
    folderId: file.folderId,
    id: file.id,
    name: file.name,
    page: file.page ?? null,
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

  return isTypingTarget(event.target) || isTypingTarget(activeElement);
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

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatShortcut(shortcut: string) {
  return shortcut
    .replace(/Cmd|Meta/gi, "⌘")
    .replace(/Ctrl/gi, "Ctrl")
    .replace(/Shift/gi, "Shift")
    .replace(/Alt|Option/gi, "Alt")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
}

function renderPaletteIcon(icon: unknown, className: string) {
  const IconComponent = icon as ElementType;
  return <IconComponent className={className} />;
}

const PALETTE_ITEM_CLASS =
  "min-h-8 rounded-lg px-2 text-[0.8125rem] text-zinc-300 data-selected:bg-white/12 data-selected:text-zinc-50 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50";

const PALETTE_ICON_CLASS = "mt-0.5 size-[0.95rem] shrink-0 text-zinc-400";

const PALETTE_CHEVRON_CLASS =
  "mt-0.5 ml-auto size-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-data-[selected=true]:opacity-100 group-hover:opacity-100 text-muted-foreground/45";

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
  const { navigate: paneNavigate } = useWorkspaceSurfaceNavigation({
    panesEnabled: true,
  });
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
  const [selectedValue, setSelectedValue] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMode, setFilterMode] = useState<"All" | "Commands" | "Files">(
    "All"
  );
  const resolvedWorkspaceUuid = activeWorkspaceUuid ?? workspaceUuid ?? null;
  const ctrlHeldRef = useRef(false);

  const currentRoute = useMemo(() => {
    const nextQuery = searchParams.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    useCommandPaletteStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!((event.metaKey || event.ctrlKey) && event.shiftKey)) {
        return;
      }

      if (shouldIgnoreGlobalHotkey(event)) {
        return;
      }

      if (event.key.toLowerCase() !== "k") {
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
    setSelectedValue("");
    hydratedWorkspacesRef.current.clear();
  }, [open]);

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

  const hydratedWorkspacesRef = useRef(new Set<string>());

  useEffect(() => {
    if (!open) {
      return;
    }

    for (const workspace of workspaces) {
      if (!hydratedWorkspacesRef.current.has(workspace.workspaceId)) {
        hydratedWorkspacesRef.current.add(workspace.workspaceId);
        void hydrateWorkspaceIndex(workspace);
      }
    }
  }, [open, workspaces]);

  const workspaceItems = useMemo(() => {
    const folderPathMaps = new Map<string, Map<string, string>>();
    const files: PaletteItem[] = [];
    const folders: PaletteItem[] = [];

    for (const workspace of workspaces) {
      const index = fileIndexByWorkspace[workspace.workspaceId];
      if (!index) {
        continue;
      }

      const folderById = new Map(
        index.folders.map((folder) => [folder.id, folder])
      );
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
          page: file.page ?? null,
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
    () =>
      resolvedWorkspaceUuid
        ? (readCachedChats(resolvedWorkspaceUuid) ?? [])
        : [],
    [resolvedWorkspaceUuid]
  );
  const cachedFlashcardSets = useMemo<FlashcardSetSummary[]>(
    () =>
      resolvedWorkspaceUuid
        ? (readCachedFlashcardSets(resolvedWorkspaceUuid) ?? [])
        : [],
    [resolvedWorkspaceUuid]
  );

  const openFilesRoute = useCallback(
    (options?: { openInNewPane?: boolean }) => {
      const targetWorkspace = workspaces.find(
        (entry) => entry.workspaceId === resolvedWorkspaceUuid
      );
      const targetRoute =
        targetWorkspace?.workspaceId && targetWorkspace.rootFolderId
          ? (`/workspace/files/${targetWorkspace.workspaceId}/folder/${targetWorkspace.rootFolderId}` as Route)
          : targetWorkspace?.workspaceId
            ? (`/workspace/files/${targetWorkspace.workspaceId}` as Route)
            : ("/workspace/files" as Route);

      if (!options?.openInNewPane && currentRoute === targetRoute) {
        commandPaletteActions.close();
        return;
      }

      router.prefetch(targetRoute);
      paneNavigate(targetRoute, { openInNewPane: options?.openInNewPane });
      commandPaletteActions.close();
    },
    [currentRoute, paneNavigate, resolvedWorkspaceUuid, router, workspaces]
  );

  const navigateTo = useCallback(
    (route: Route, options?: { openInNewPane?: boolean }) => {
      const href = typeof route === "string" ? route : String(route);

      if (!options?.openInNewPane && currentRoute === href) {
        commandPaletteActions.close();
        return;
      }

      router.prefetch(route);
      paneNavigate(href, { openInNewPane: options?.openInNewPane });
      commandPaletteActions.close();
    },
    [currentRoute, paneNavigate, router]
  );

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
          openFilesRoute({ openInNewPane: ctrlHeldRef.current });
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
          navigateTo("/workspace/tasks" as Route, { openInNewPane: ctrlHeldRef.current });
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
          navigateTo("/workspace/chats/new" as Route, { openInNewPane: ctrlHeldRef.current });
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
          navigateTo("/workspace/flashcards?create=1" as Route, { openInNewPane: ctrlHeldRef.current });
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
        key: "import-link",
        label: "Import link",
        description: "Save and ingest a link resource",
        icon: LinkSimple,
        group: "Create",
        searchTerms: ["link", "url", "web", "article"],
        shortcut: "Ctrl+Shift+L",
        onSelect: () => {
          handleFileIntent("importLink");
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

  const trimmedQuery = normalizeSearch(debouncedQuery);
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
        matchesNeedle(
          `${chat.title} ${chat.slug} ${chat.workspaceId}`,
          searchQuery
        )
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
  const shouldSearchFiles = Boolean(searchQuery) && searchItems.length > 0;

  const fuzzyResults = useMemo(() => {
    if (!shouldSearchFiles) {
      return [];
    }

    const seen = new Set<string>();
    const directMatches = searchItems.filter((item) =>
      matchesNeedle(
        `${item.name} ${item.path} ${item.workspaceName} ${item.type}`,
        searchQuery
      )
    );
    const fuzzyMatches = fuse
      .search(searchQuery)
      .filter((result) => (result.score ?? 1) <= FILE_FUSE_OPTIONS.threshold)
      .map((result) => result.item);

    return [...directMatches, ...fuzzyMatches]
      .filter((item) => {
        const key = `${item.workspaceUuid}:${item.type}:${item.id}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, FILE_RESULTS_LIMIT);
  }, [fuse, searchItems, searchQuery, shouldSearchFiles]);

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
    enabled: Boolean(open && shouldSearchFiles && resolvedWorkspaceUuid),
  });

  const retrievalResults =
    fuzzyResults.length > 0 ? [] : (retrievalQuery.data ?? []);
  const isRetrieving = retrievalQuery.isFetching;

  useEffect(() => {
    if (!(open && resolvedWorkspaceUuid)) {
      return;
    }

    const currentWorkspace = workspaces.find(
      (entry) => entry.workspaceId === resolvedWorkspaceUuid
    );
    const targetRoute =
      currentFilesWorkspaceUuid === resolvedWorkspaceUuid &&
      currentFilesFolderId
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
    (item: PaletteItem, openInNewPane?: boolean) => {
      const targetRoute =
        `/workspace/files/${item.workspaceUuid}/folder/${item.id}` as Route;
      router.prefetch(targetRoute);
      paneNavigate(targetRoute, { openInNewPane });
      commandPaletteActions.close();
    },
    [paneNavigate, router]
  );

  const handleOpenFile = useCallback(
    (
      workspaceId: string,
      fileId: string,
      folderId: string | undefined,
      options?: { retrievalChunkId?: string | null; openInNewPane?: boolean }
    ) => {
      commandPaletteActions.recordRecentFile(workspaceId, fileId);
      const workspace = workspaces.find(
        (entry) => entry.workspaceId === workspaceId
      );
      const alreadyOnTarget =
        currentFilesWorkspaceUuid === workspaceId &&
        currentFilesFolderId === folderId;
      const replace = alreadyOnTarget && !options?.openInNewPane;

      if (!folderId) {
        const fallbackRoute = workspace?.rootFolderId
          ? (`/workspace/files/${workspaceId}/folder/${workspace.rootFolderId}` as Route)
          : (`/workspace/files/${workspaceId}` as Route);
        router.prefetch(fallbackRoute);
        paneNavigate(fallbackRoute, { openInNewPane: options?.openInNewPane });
        commandPaletteActions.close();
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
      paneNavigate(targetRoute, { openInNewPane: options?.openInNewPane, replace });
      commandPaletteActions.close();
    },
    [currentFilesFolderId, currentFilesWorkspaceUuid, paneNavigate, router, workspaces]
  );

  const openSearchResult = useCallback(
    (result: WorkspaceSearchResult, openInNewPane?: boolean) => {
      if (!resolvedWorkspaceUuid) {
        return;
      }

      const targetFileId = result.fileId ?? result.id;
      const targetFile = fileItems.find(
        (file) =>
          file.workspaceUuid === resolvedWorkspaceUuid &&
          file.id === targetFileId
      );
      const targetFolderId =
        targetFile?.folderId ?? currentFilesFolderId ?? undefined;

      handleOpenFile(resolvedWorkspaceUuid, targetFileId, targetFolderId, {
        openInNewPane,
        retrievalChunkId: result.chunkId ?? null,
      });
    },
    [currentFilesFolderId, fileItems, handleOpenFile, resolvedWorkspaceUuid]
  );

  const previewItems = useMemo(() => {
    const items: Array<
      | { kind: "command"; value: string; item: PaletteCommandItem }
      | { kind: "file"; value: string; item: PaletteItem }
      | { kind: "chat"; value: string; item: PaletteSearchItem }
      | { kind: "flashcard"; value: string; item: PaletteSearchItem }
      | { kind: "content"; value: string; item: WorkspaceSearchResult }
      | { kind: "task"; value: string; item: (typeof workspaceTasks)[number] }
    > = [];

    if (searchQuery) {
      for (const item of filteredCommands.general) {
        items.push({ kind: "command", value: `command-${item.key}`, item });
      }
      for (const item of filteredCommands.create) {
        items.push({ kind: "command", value: `command-${item.key}`, item });
      }
      for (const item of chatResults) {
        items.push({ kind: "chat", value: `chat-${item.id}`, item });
      }
      for (const item of flashcardResults) {
        items.push({ kind: "flashcard", value: `flashcard-${item.id}`, item });
      }
      for (const item of fuzzyResults) {
        items.push({ kind: "file", value: `${item.type}-${item.id}`, item });
      }
      for (const item of retrievalResults) {
        items.push({
          kind: "content",
          value: `retrieval-${item.id}-${item.chunkId ?? "main"}`,
          item,
        });
      }
      return items;
    }

    for (const item of workspaceTasks) {
      items.push({ kind: "task", value: `task-${item.id}`, item });
    }
    for (const item of recentItems) {
      items.push({ kind: "file", value: `recent-${item.id}`, item });
    }
    for (const item of cachedChats.slice(0, 6)) {
      items.push({
        kind: "chat",
        value: `recent-chat-${item.slug}`,
        item: {
          description: item.slug,
          id: item.id,
          label: item.title,
          meta: new Date(item.updatedAt).toLocaleDateString(),
          path: `/workspace/chats/${item.slug}`,
          type: "chat",
        },
      });
    }
    for (const item of cachedFlashcardSets.slice(0, 6)) {
      items.push({
        kind: "flashcard",
        value: `recent-flashcard-${item.id}`,
        item: {
          description: `${item.dueCount + item.newCount} ready`,
          id: item.id,
          label: item.title,
          meta: new Date(item.updatedAt).toLocaleDateString(),
          path: `/workspace/flashcards/${item.id}`,
          type: "flashcard",
        },
      });
    }
    for (const item of filteredCommands.general) {
      items.push({ kind: "command", value: `command-${item.key}`, item });
    }
    for (const item of filteredCommands.create) {
      items.push({ kind: "command", value: `command-${item.key}`, item });
    }
    return items;
  }, [
    cachedChats,
    cachedFlashcardSets,
    chatResults,
    filteredCommands.create,
    filteredCommands.general,
    flashcardResults,
    fuzzyResults,
    recentItems,
    retrievalResults,
    searchQuery,
    workspaceTasks,
  ]);

  const hasResults = previewItems.length > 0;

  useEffect(() => {
    if (previewItems.length === 0) {
      setSelectedValue("");
      return;
    }
    if (!previewItems.some((item) => item.value === selectedValue)) {
      setSelectedValue(previewItems[0].value);
    }
  }, [previewItems, selectedValue]);

  const selectedPreview =
    previewItems.find((item) => item.value === selectedValue) ??
    previewItems[0] ??
    null;

  const renderCommandGroups = () => (
    <>
      {filteredCommands.general.length > 0 ? (
        <CommandGroup heading="General">
          {filteredCommands.general.map((item) => (
            <CommandItem
              className={PALETTE_ITEM_CLASS}
              key={item.key}
              onSelect={() => item.onSelect()}
              value={`command-${item.key}`}
            >
              {renderPaletteIcon(item.icon, PALETTE_ICON_CLASS)}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-100/90">
                  {item.label}
                </p>
                <p className="truncate text-[0.6875rem] text-zinc-500">
                  {item.description}
                </p>
              </div>
              {item.shortcut ? (
                <span className="ml-auto flex shrink-0 items-center gap-0.5">
                  <KbdGroup>
                    {formatShortcut(item.shortcut).map((key) => (
                      <Kbd
                        className="h-5 min-w-5 rounded bg-black/20 px-1.5 text-[10px] font-medium text-zinc-400"
                        key={key}
                      >
                        {key}
                      </Kbd>
                    ))}
                  </KbdGroup>
                </span>
              ) : null}
              <CommandShortcut>
                {renderPaletteIcon(ChevronRight, PALETTE_CHEVRON_CLASS)}
              </CommandShortcut>
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
              className={PALETTE_ITEM_CLASS}
              key={item.key}
              onSelect={() => item.onSelect()}
              value={`command-${item.key}`}
            >
              {renderPaletteIcon(item.icon, PALETTE_ICON_CLASS)}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-100/90">
                  {item.label}
                </p>
                <p className="truncate text-[0.6875rem] text-zinc-500">
                  {item.description}
                </p>
              </div>
              {item.shortcut ? (
                <span className="ml-auto flex shrink-0 items-center gap-0.5">
                  <KbdGroup>
                    {formatShortcut(item.shortcut).map((key) => (
                      <Kbd
                        className="h-5 min-w-5 rounded bg-black/20 px-1.5 text-[10px] font-medium text-zinc-400"
                        key={key}
                      >
                        {key}
                      </Kbd>
                    ))}
                  </KbdGroup>
                </span>
              ) : null}
              <CommandShortcut>
                {renderPaletteIcon(ChevronRight, PALETTE_CHEVRON_CLASS)}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
    </>
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          commandPaletteActions.close();
          return;
        }
        commandPaletteActions.open();
      }}
      title="Command Palette"
      description="Search commands, projects, and threads..."
      showCloseButton={false}
      className={cn(
        "top-[4.5vh]! h-[min(78vh,39.5rem)] translate-y-0! gap-0! border-0! bg-transparent! p-0! shadow-none! ring-0!",
        open && "transition-[width,height,max-width] duration-200 ease-out",
        showPreview
          ? "w-[min(calc(100vw-2rem),56.75rem)]! max-w-[56.75rem]!"
          : "w-[min(calc(100vw-2rem),34rem)]! max-w-[34rem]!"
      )}
    >
      <Command
        label="Command Palette"
        value={selectedValue}
        onValueChange={setSelectedValue}
        shouldFilter={false}
        loop
        onKeyDown={(e) => {
          ctrlHeldRef.current = e.ctrlKey || e.metaKey;
        }}
        onKeyUp={(e) => {
          if (e.key === "Control" || e.key === "Meta") {
            ctrlHeldRef.current = false;
          }
        }}
        className="h-full w-full rounded-[1.05rem]! border-zinc-700/70 bg-[#161616]/94 p-3 text-zinc-100 shadow-[0_24px_90px_rgba(0,0,0,0.48)]"
      >
        <div className="flex h-10 items-center gap-3 px-2 text-zinc-300">
          {renderPaletteIcon(Search, "size-[1.05rem] text-zinc-400")}
          <CommandInput
            placeholder="Search or ask a question in Avenire's Space..."
            value={query}
            onValueChange={setQuery}
            spellCheck={false}
            showSearchIcon={false}
            wrapperClassName="flex-1 p-0!"
            inputGroupClassName="h-9! rounded-none! border-0! bg-transparent! p-0! shadow-none! ring-0! dark:bg-transparent!"
            className="h-9 bg-transparent! text-[0.9rem] text-zinc-100 placeholder:text-zinc-500"
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Toggle filters"
              aria-pressed={showFilters}
              onClick={() => setShowFilters((visible) => !visible)}
              className={cn(
                "grid size-7 place-items-center rounded-full border border-white/12 text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-100",
                showFilters && "border-blue-500/30 bg-blue-500/15 text-blue-300"
              )}
            >
              {renderPaletteIcon(ListFilter, "size-4")}
            </button>
            <button
              type="button"
              aria-label="Toggle preview"
              aria-pressed={showPreview}
              onClick={() => setShowPreview((visible) => !visible)}
              className={cn(
                "grid size-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-100",
                showPreview && "text-blue-400"
              )}
            >
              {renderPaletteIcon(SidebarSimple, "size-4")}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            showFilters ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-2 pb-4 pt-2 text-xs text-zinc-400">
              {(["All", "Commands", "Files"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={cn(
                    "rounded-md border border-white/10 px-2.5 py-1 transition-colors hover:bg-white/8 hover:text-zinc-100",
                    filterMode === mode && "border-blue-500/30 bg-blue-500/15 text-blue-300"
                  )}
                >
                  {mode}
                </button>
              ))}
              {filterMode !== "All" || query ? (
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode("All");
                    setQuery("");
                  }}
                  className="ml-auto rounded-md px-2.5 py-1 text-zinc-500 transition-colors hover:bg-white/8 hover:text-zinc-200"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {hasResults ? (
          <Command.Split
            className={cn(
              "transition-[grid-template-columns,gap] duration-200 ease-out",
              !showPreview && "md:grid-cols-[minmax(0,1fr)]"
            )}
          >
            <CommandList className="max-h-none pr-2">
              {searchQuery ? (
                searchItems.length > 0 ||
                resolvedWorkspaceUuid ||
                hasCommandMatches ? (
                  <>
                    {hasCommandMatches ? (
                      <>
                        {renderCommandGroups()}
                        {chatResults.length > 0 ||
                        flashcardResults.length > 0 ||
                        fuzzyResults.length > 0 ||
                        isRetrieving ||
                        retrievalResults.length > 0 ? (
                          <CommandSeparator />
                        ) : null}
                      </>
                    ) : null}
                    {chatResults.length > 0 ? (
                      <CommandGroup heading="Chats">
                        {chatResults.map((chat) => (
                          <CommandItem
                            className={PALETTE_ITEM_CLASS}
                            key={`chat-${chat.id}`}
                            onSelect={() => navigateTo(chat.path as Route, { openInNewPane: ctrlHeldRef.current })}
                            value={`chat-${chat.id}`}
                          >
                            {renderPaletteIcon(
                              MessageSquareText,
                              PALETTE_ICON_CLASS
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-zinc-100/90">
                                {chat.label}
                              </p>
                              <p className="truncate text-[0.6875rem] text-zinc-500">
                                {chat.description}
                              </p>
                            </div>
                            <span className="mt-0.5 shrink-0 whitespace-nowrap text-[0.6875rem] text-zinc-500">
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
                              className={PALETTE_ITEM_CLASS}
                              key={`flashcard-${set.id}`}
                               onSelect={() => navigateTo(set.path as Route, { openInNewPane: ctrlHeldRef.current })}
                               value={`flashcard-${set.id}`}
                            >
                              {renderPaletteIcon(
                                Sparkles,
                                PALETTE_ICON_CLASS
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-100/90">
                                  {set.label}
                                </p>
                                <p className="truncate text-[0.6875rem] text-zinc-500">
                                  {set.description}
                                </p>
                              </div>
                              <span className="mt-0.5 shrink-0 whitespace-nowrap text-[0.6875rem] text-zinc-500">
                                {set.meta}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {fuzzyResults.length > 0 ||
                        isRetrieving ||
                        retrievalResults.length > 0 ? (
                          <CommandSeparator />
                        ) : null}
                      </>
                    ) : null}
                    {fuzzyResults.length > 0 ? (
                      <CommandGroup heading="Files and folders">
                        {fuzzyResults.map((item) => (
                          <CommandItem
                            className={PALETTE_ITEM_CLASS}
                            key={`${item.type}-${item.id}`}
                            onSelect={() => {
                              if (item.type === "folder") {
                                handleOpenFolder(item, ctrlHeldRef.current);
                                return;
                              }
                              handleOpenFile(
                                item.workspaceUuid,
                                item.id,
                                item.folderId,
                                { openInNewPane: ctrlHeldRef.current }
                              );
                            }}
                            value={`${item.type}-${item.id}`}
                          >
                            {renderPaletteIcon(
                              item.type === "folder" ? Folder : FileText,
                              PALETTE_ICON_CLASS
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-zinc-100/90">
                                {item.name}
                              </p>
                              <p className="truncate text-[0.6875rem] text-zinc-500">
                                {item.path}
                              </p>
                              <p className="truncate text-[0.6875rem] text-zinc-500">
                                {item.workspaceName}
                              </p>
                            </div>
                            <CommandShortcut>
                              {renderPaletteIcon(
                                ChevronRight,
                                PALETTE_CHEVRON_CLASS
                              )}
                            </CommandShortcut>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : null}

                    {fuzzyResults.length === 0 &&
                    (isRetrieving || retrievalResults.length > 0) ? (
                      <CommandGroup heading="Content search">
                        {isRetrieving ? (
                          <CommandItem
                            className={PALETTE_ITEM_CLASS}
                            disabled
                            value="searching-workspace-content"
                          >
                            <Spinner className={PALETTE_ICON_CLASS} />
                            <span className="text-zinc-500 text-sm">
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
                              className={PALETTE_ITEM_CLASS}
                              key={`retrieval-${result.id}-${result.chunkId ?? "main"}`}
                              onSelect={() => {
                                openSearchResult(result, ctrlHeldRef.current);
                              }}
                              value={`retrieval-${result.id}-${result.chunkId ?? "main"}`}
                            >
                              {renderPaletteIcon(
                                FileText,
                                PALETTE_ICON_CLASS
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-100/90">
                                  {result.title}
                                </p>
                                <p className="truncate text-[0.6875rem] text-zinc-500">
                                  {filePath}
                                </p>
                                <p className="truncate text-[0.6875rem] text-zinc-500">
                                  {result.snippet}
                                </p>
                              </div>
                              <CommandShortcut>
                                {renderPaletteIcon(
                                  ChevronRight,
                                  PALETTE_CHEVRON_CLASS
                                )}
                              </CommandShortcut>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    ) : null}

                    {fuzzyResults.length === 0 &&
                    !isRetrieving &&
                    retrievalResults.length === 0 &&
                    !hasCommandMatches &&
                    chatResults.length === 0 &&
                    flashcardResults.length === 0 ? null : null}
                  </>
                ) : null
              ) : (
                <>
                  {workspaceTasks.length > 0 ? (
                    <CommandGroup heading="Upcoming tasks">
                      {workspaceTasks.map((task) => (
                        <CommandItem
                          className={PALETTE_ITEM_CLASS}
                          key={`task-${task.id}`}
                          onSelect={() => navigateTo(`/workspace/tasks?task=${task.id}` as Route, { openInNewPane: ctrlHeldRef.current })}
                          value={`task-${task.id}`}
                        >
                          {renderPaletteIcon(
                            ListChecks,
                            PALETTE_ICON_CLASS
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-zinc-100/90">
                              {task.title}
                            </p>
                            <p className="truncate text-[0.6875rem] text-zinc-500">
                              {formatTaskDueDate(task.dueAt)}
                              {task.assignee?.name
                                ? ` • ${task.assignee.name}`
                                : ""}
                            </p>
                          </div>
                          <CommandShortcut>
                            {renderPaletteIcon(
                              ChevronRight,
                              PALETTE_CHEVRON_CLASS
                            )}
                          </CommandShortcut>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                  {workspaceTasks.length > 0 ? <CommandSeparator /> : null}
                  {recentItems.length > 0 ? (
                    <CommandGroup heading="Recent files">
                      {recentItems.map((item) => (
                        <CommandItem
                          className={PALETTE_ITEM_CLASS}
                          key={`recent-${item.id}`}
                          onSelect={() => {
                            handleOpenFile(
                              item.workspaceUuid,
                              item.id,
                              item.folderId,
                              { openInNewPane: ctrlHeldRef.current }
                            );
                          }}
                          value={`recent-${item.id}`}
                        >
                          {renderPaletteIcon(
                            ClockCounterClockwise,
                            PALETTE_ICON_CLASS
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-zinc-100/90">
                              {item.name}
                            </p>
                            <p className="truncate text-[0.6875rem] text-zinc-500">
                              {item.path}
                            </p>
                          </div>
                          <CommandShortcut>
                            {renderPaletteIcon(
                              ChevronRight,
                              PALETTE_CHEVRON_CLASS
                            )}
                          </CommandShortcut>
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
                              className={PALETTE_ITEM_CLASS}
                              key={`recent-chat-${chat.slug}`}
                              onSelect={() => navigateTo(`/workspace/chats/${chat.slug}` as Route, { openInNewPane: ctrlHeldRef.current })}
                               value={`recent-chat-${chat.slug}`}
                            >
                              {renderPaletteIcon(
                                MessageSquareText,
                                PALETTE_ICON_CLASS
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-100/90">
                                  {chat.title}
                                </p>
                                <p className="truncate text-[0.6875rem] text-zinc-500">
                                  {chat.slug}
                                </p>
                              </div>
                              <CommandShortcut>
                                {renderPaletteIcon(
                                  ChevronRight,
                                  PALETTE_CHEVRON_CLASS
                                )}
                              </CommandShortcut>
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
                              className={PALETTE_ITEM_CLASS}
                              key={`recent-flashcard-${set.id}`}
                              onSelect={() => navigateTo(`/workspace/flashcards/${set.id}` as Route, { openInNewPane: ctrlHeldRef.current })}
                               value={`recent-flashcard-${set.id}`}
                            >
                              {renderPaletteIcon(
                                Sparkles,
                                PALETTE_ICON_CLASS
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-100/90">
                                  {set.title}
                                </p>
                                <p className="truncate text-[0.6875rem] text-zinc-500">
                                  {set.dueCount + set.newCount} ready
                                </p>
                              </div>
                              <CommandShortcut>
                                {renderPaletteIcon(
                                  ChevronRight,
                                  PALETTE_CHEVRON_CLASS
                                )}
                              </CommandShortcut>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  ) : null}
                  {renderCommandGroups()}
                </>
              )}
            </CommandList>
            {showPreview ? (
              <Command.Preview className="bg-[#161616]/85">
                <PalettePreview item={selectedPreview} workspaceUuid={resolvedWorkspaceUuid} />
              </Command.Preview>
            ) : null}
          </Command.Split>
        ) : (
          <div className="grid min-h-0 flex-1 place-items-center px-4 text-center">
            <div className="space-y-1 text-sm">
              <p className="font-medium text-zinc-400">No results</p>
              <p className="text-zinc-500">
                {query
                  ? "No matching commands, files, or content found."
                  : "No recent items yet."}
              </p>
              {query && resolvedWorkspaceUuid ? (
                <button
                  type="button"
                  onClick={() => {
                    if (retrievalQuery.refetch) {
                      retrievalQuery.refetch();
                    }
                  }}
                  className="text-blue-400 transition-colors hover:text-blue-300"
                >
                  Retrieve from Workspace instead?
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-3 flex h-6 items-center justify-between border-t border-white/10 px-2 pt-2 text-xs text-zinc-500">
          <span>Ctrl+Enter Open in new tab</span>
          <button
            type="button"
            aria-label="Open settings"
            onClick={() => openSettings("shortcuts")}
            className="grid size-6 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-white/8 hover:text-zinc-200"
          >
            {renderPaletteIcon(Settings, "size-4")}
          </button>
        </div>
      </Command>
    </CommandDialog>
  );
}

function MarkdownFilePreview({
  fileUrl,
  item,
}: {
  fileUrl: string;
  item: PaletteItem;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["command-palette-preview-markdown", item.id],
    queryFn: async ({ signal }) => {
      const response = await fetch(fileUrl, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) return null;
      const text = await response.text();
      return text;
    },
    enabled: true,
  });

  const bannerUrl = item.page?.bannerUrl?.trim() || null;

  return (
    <div className="flex h-full flex-col">
      {bannerUrl ? (
        <div className="relative h-24 w-full flex-shrink-0 overflow-hidden bg-white/[0.015]">
          <img
            alt={`${item.name} cover`}
            className="h-full w-full object-cover"
            src={bannerUrl}
          />
        </div>
      ) : (
        <div className="relative flex h-[4.5rem] flex-shrink-0 items-start border-white/[0.05] border-b bg-white/[0.015] px-5 pt-3">
          {renderPaletteIcon(
            FileText,
            "absolute bottom-[-1rem] left-5 size-8 text-zinc-200"
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-5 pt-3">
          <p className="truncate text-[0.6875rem] text-zinc-500">
            {item.path}
          </p>
          <h2 className="line-clamp-2 text-sm font-semibold tracking-normal text-zinc-50">
            {item.name}
          </h2>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Spinner className="size-3" />
              Loading content...
            </div>
          ) : data ? (
            <Markdown
              content={data}
              id={item.id}
              minimal
              textSize="small"
              workspaceUuid={item.workspaceUuid}
            />
          ) : (
            <p className="text-xs text-zinc-500">
              {isError ? "Failed to load content" : "No content available"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PalettePreview({
  item,
  workspaceUuid,
}: {
  item:
    | { kind: "command"; item: PaletteCommandItem; value: string }
    | { kind: "file"; item: PaletteItem; value: string }
    | { kind: "chat"; item: PaletteSearchItem; value: string }
    | { kind: "flashcard"; item: PaletteSearchItem; value: string }
    | { kind: "content"; item: WorkspaceSearchResult; value: string }
    | {
        kind: "task";
        item: ReturnType<typeof getTaskStoreSnapshot>["tasks"][number];
        value: string;
      }
    | null;
  workspaceUuid?: string | null;
}) {
  if (!item) {
    return (
      <div className="grid h-full place-items-center p-6 text-center text-zinc-500 text-sm">
        No selection
      </div>
    );
  }

  if (item.kind === "file") {
    const nameLower = item.item.name.toLowerCase();
    const isMarkdown =
      item.item.type === "file" &&
      (nameLower.endsWith(".md") ||
        nameLower.endsWith(".markdown") ||
        nameLower.endsWith(".txt"));
    const isImage =
      item.item.type === "file" &&
      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(nameLower);
    const isPdf = item.item.type === "file" && nameLower.endsWith(".pdf");
    const isVideo =
      item.item.type === "file" &&
      /\.(mp4|webm|mov)$/i.test(nameLower);

    const fileUrl =
      item.item.type === "file" && workspaceUuid
        ? `/api/workspaces/${workspaceUuid}/files/${item.item.id}/stream`
        : null;

    if (isImage && fileUrl) {
      return (
        <PreviewShell
          icon={FileText}
          label={item.item.type === "folder" ? "Folder" : "Image"}
          title={item.item.name}
        >
          <div className="overflow-hidden rounded-lg border border-white/10">
            <img
              alt={item.item.name}
              className="max-h-48 w-full object-contain"
              src={fileUrl}
            />
          </div>
          <p className="mt-3 truncate text-[0.6875rem] text-zinc-500">
            {item.item.path}
          </p>
        </PreviewShell>
      );
    }

    if (isPdf || isVideo) {
      return (
        <PreviewShell
          icon={FileText}
          label={isPdf ? "PDF" : "Video"}
          title={item.item.name}
        >
          <p className="text-sm leading-6 text-zinc-400">
            {item.item.path}
          </p>
          <p className="mt-3 text-[0.6875rem] text-zinc-500">
            {item.item.workspaceName}
          </p>
        </PreviewShell>
      );
    }

    if (isMarkdown && fileUrl) {
      return <MarkdownFilePreview fileUrl={fileUrl} item={item.item} />;
    }

    const bannerUrl = item.item.page?.bannerUrl?.trim() || null;

    return (
      <div className="flex h-full flex-col">
        {bannerUrl ? (
          <div className="relative h-24 w-full flex-shrink-0 overflow-hidden bg-white/[0.015]">
            <img
              alt={`${item.item.name} cover`}
              className="h-full w-full object-cover"
              src={bannerUrl}
            />
          </div>
        ) : (
          <div className="relative flex h-[4.5rem] flex-shrink-0 items-start justify-between border-white/[0.05] border-b bg-white/[0.015] px-5 pt-3">
            {renderPaletteIcon(
              item.item.type === "folder" ? Folder : FileText,
              "absolute bottom-[-1rem] left-5 size-8 text-zinc-200"
            )}
            <span className="ml-auto rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-500">
              {item.item.type === "folder" ? "Folder" : "File"}
            </span>
          </div>
        )}
        <div className="flex flex-1 flex-col px-5 pt-9">
          <p className="mb-3 truncate text-[0.6875rem] text-zinc-500">
            {item.item.path}
          </p>
          <h2 className="line-clamp-3 text-lg font-semibold tracking-normal text-zinc-50">
            {item.item.name}
          </h2>
          <p className="mt-auto pb-5 text-xs text-zinc-500">
            {item.item.workspaceName}
          </p>
        </div>
      </div>
    );
  }

  if (item.kind === "content") {
    return (
      <PreviewShell
        icon={FileText}
        label="Content match"
        title={item.item.title}
      >
        <p className="line-clamp-6 text-sm leading-6 text-zinc-400">
          {item.item.snippet}
        </p>
      </PreviewShell>
    );
  }

  if (item.kind === "command") {
    const Icon = item.item.icon;
    return (
      <PreviewShell icon={Icon} label={item.item.group} title={item.item.label}>
        <p className="text-sm leading-6 text-zinc-400">
          {item.item.description}
        </p>
        {item.item.shortcut ? (
          <KbdGroup className="mt-4">
            {formatShortcut(item.item.shortcut).map((key) => (
              <Kbd className="bg-white/8 text-zinc-300" key={key}>
                {key}
              </Kbd>
            ))}
          </KbdGroup>
        ) : null}
      </PreviewShell>
    );
  }

  if (item.kind === "task") {
    const task = item.item;
    return (
      <PreviewShell icon={ListChecks} label="Task" title={task.title}>
        <div className="space-y-2 text-sm text-zinc-400">
          {task.dueAt ? (
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-zinc-500">Due</span>
              <span>{formatTaskDueDate(task.dueAt)}</span>
            </div>
          ) : null}
          {task.assignee?.name ? (
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-zinc-500">Assignee</span>
              <span>{task.assignee.name}</span>
            </div>
          ) : null}
          {task.priority ? (
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-zinc-500">Priority</span>
              <span className="capitalize">{task.priority.toLowerCase()}</span>
            </div>
          ) : null}
          {task.resources && task.resources.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-zinc-500">Resources</span>
              <span>{task.resources.length}</span>
            </div>
          ) : null}
          {task.status ? (
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-zinc-500">Status</span>
              <span className="capitalize">{task.status.toLowerCase()}</span>
            </div>
          ) : null}
          {task.description ? (
            <p className="line-clamp-3 pt-1 text-[0.8125rem] text-zinc-400">
              {task.description}
            </p>
          ) : null}
        </div>
      </PreviewShell>
    );
  }

  const Icon = item.kind === "chat" ? MessageSquareText : Sparkles;
  const label = item.kind === "chat" ? "Chat" : "Flashcard set";
  return (
    <PreviewShell icon={Icon} label={label} title={item.item.label}>
      <p className="text-sm leading-6 text-zinc-400">
        {item.item.description}
      </p>
      <p className="mt-2 text-[0.6875rem] text-zinc-500">
        {item.item.meta}
      </p>
    </PreviewShell>
  );
}

function PreviewShell({
  children,
  icon: Icon,
  label,
  title,
}: {
  children: ReactNode;
  icon: ElementType;
  label: string;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex h-[4.5rem] items-start border-white/[0.05] border-b bg-white/[0.015] px-5 pt-3">
        {renderPaletteIcon(
          Icon,
          "absolute bottom-[-1rem] left-5 size-8 text-zinc-300"
        )}
      </div>
      <div className="flex flex-1 flex-col px-5 pt-9">
        <p className="mb-3 text-[0.6875rem] text-zinc-500">{label}</p>
        <h2 className="line-clamp-3 text-lg font-semibold tracking-normal text-zinc-50">
          {title}
        </h2>
        <div className="mt-5 min-h-0">{children}</div>
      </div>
    </div>
  );
}
