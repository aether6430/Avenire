"use client";

import {
  Building as Building2,
  FilePlus as FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  LinkSimple,
  ListChecks,
  ChatText as MessageSquareText,
  Moon,
  Gear as Settings,
  Sparkle as Sparkles,
  Sun,
  Warning as TriangleAlert,
} from "@phosphor-icons/react";
import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useTheme } from "next-themes";
import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  useCallback,
  useMemo,
} from "react";
import type {
  PaletteCommandItem,
  WorkspaceSummary,
} from "@/components/dashboard/command-palette-model";
import { useCommandPaletteFileActions } from "@/components/dashboard/use-command-palette-file-actions";
import { buildSettingsOverlayRoute } from "@/lib/settings-overlay-route";
import { commandPaletteActions } from "@/stores/commandPaletteStore";
import { quickCaptureActions } from "@/stores/quickCaptureStore";

export interface CommandPaletteNavigationState {
  commandItems: PaletteCommandItem[];
  handleOpenFile: ReturnType<
    typeof useCommandPaletteFileActions
  >["handleOpenFile"];
  handleOpenFolder: ReturnType<
    typeof useCommandPaletteFileActions
  >["handleOpenFolder"];
  openChatRoute: (path: string) => void;
  openFlashcardRoute: (path: string) => void;
  openSearchResult: ReturnType<
    typeof useCommandPaletteFileActions
  >["openSearchResult"];
  openTaskRoute: (taskId: string) => void;
}

export function useCommandPaletteNavigation({
  currentFilesFolderId,
  currentFilesWorkspaceUuid,
  currentRoute,
  resolvedWorkspaceUuid,
  router,
  setPendingRoute,
  workspaces,
}: {
  currentFilesFolderId: string | null;
  currentFilesWorkspaceUuid: string | null;
  currentRoute: string;
  resolvedWorkspaceUuid: string | null;
  router: AppRouterInstance;
  setPendingRoute: Dispatch<SetStateAction<string | null>>;
  workspaces: WorkspaceSummary[];
}): CommandPaletteNavigationState {
  const { resolvedTheme, setTheme } = useTheme();
  const fileActions = useCommandPaletteFileActions({
    currentFilesFolderId,
    currentFilesWorkspaceUuid,
    currentRoute,
    resolvedWorkspaceUuid,
    router,
    setPendingRoute,
    workspaces,
  });
  const {
    handleFileIntent,
    handleOpenFile,
    handleOpenFolder,
    openFilesRoute,
    openSearchResult,
  } = fileActions;

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
      const currentUrl = new URL(currentRoute, "http://localhost");
      const targetRoute = buildSettingsOverlayRoute({
        pathname: currentUrl.pathname,
        searchParams: currentUrl.searchParams,
        tab: tab ?? "account",
      }) as Route;
      commandPaletteActions.close();
      startTransition(() => {
        router.replace(targetRoute);
      });
    },
    [currentRoute, router]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    commandPaletteActions.close();
  }, [resolvedTheme, setTheme]);

  const openChatRoute = useCallback(
    (path: string) => {
      startTransition(() => {
        router.push(path as Route);
      });
      commandPaletteActions.close();
    },
    [router]
  );

  const openFlashcardRoute = useCallback(
    (path: string) => {
      startTransition(() => {
        router.push(path as Route);
      });
      commandPaletteActions.close();
    },
    [router]
  );

  const openTaskRoute = useCallback(
    (taskId: string) => {
      startTransition(() => {
        router.push(`/workspace/tasks?task=${taskId}` as Route);
      });
      commandPaletteActions.close();
    },
    [router]
  );

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
        key: "open-files",
        label: "Open Files",
        description: "Open the workspace files view",
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
        description: "Start a new method",
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
        label: "New Mindset Set",
        description: "Create a workspace Mindset Set",
        icon: Sparkles,
        group: "Create",
        searchTerms: ["study", "cards", "flashcards", "mindset"],
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

  return {
    commandItems,
    handleOpenFile,
    handleOpenFolder,
    openChatRoute,
    openFlashcardRoute,
    openSearchResult,
    openTaskRoute,
  };
}
