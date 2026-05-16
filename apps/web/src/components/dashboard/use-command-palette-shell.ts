"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FILES_ROUTE_PATTERN,
  shouldIgnoreGlobalHotkey,
} from "@/components/dashboard/command-palette-model";
import {
  commandPaletteActions,
  useCommandPaletteStore,
} from "@/stores/commandPaletteStore";

export interface CommandPaletteShellState {
  activeFileId: string | null;
  currentFilesFolderId: string | null;
  currentFilesWorkspaceUuid: string | null;
  currentRoute: string;
  handleDialogOpenChange: (nextOpen: boolean) => void;
  open: boolean;
  pendingRoute: string | null;
  query: string;
  resolvedWorkspaceUuid: string | null;
  searchQuery: string;
  setPendingRoute: Dispatch<SetStateAction<string | null>>;
  setQuery: Dispatch<SetStateAction<string>>;
}

export function useCommandPaletteShell({
  activeWorkspaceUuid,
  open,
  workspaceUuid,
}: {
  activeWorkspaceUuid?: string;
  open: boolean;
  workspaceUuid: string | null;
}): CommandPaletteShellState {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const currentFilesRouteMatch = pathname.match(FILES_ROUTE_PATTERN);
  const currentFilesWorkspaceUuid = currentFilesRouteMatch?.[1] ?? null;
  const currentFilesFolderId = currentFilesRouteMatch?.[2] ?? null;
  const activeFileId = searchParams.get("file");

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      commandPaletteActions.close();
      return;
    }

    commandPaletteActions.open();
  }, []);

  return {
    activeFileId,
    currentFilesFolderId,
    currentFilesWorkspaceUuid,
    currentRoute,
    handleDialogOpenChange,
    open,
    pendingRoute,
    query,
    resolvedWorkspaceUuid,
    searchQuery: debouncedQuery.trim().toLowerCase(),
    setPendingRoute,
    setQuery,
  };
}
