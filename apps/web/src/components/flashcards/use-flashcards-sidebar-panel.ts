"use client";

import { useSidebar } from "@avenire/ui/components/sidebar";
import type { Route } from "next";
import {
  type DragEvent,
  type MouseEvent,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createFlashcardsSidebarSet,
  loadFlashcardsSidebarSets,
} from "@/components/flashcards/flashcards-sidebar-panel-client";
import {
  type FlashcardsSidebarPanelProps,
  filterFlashcardsSidebarSets,
  findFlashcardsSidebarReviewTarget,
} from "@/components/flashcards/flashcards-sidebar-panel-model";
import {
  readCachedFlashcardSets,
  writeCachedFlashcardSets,
} from "@/lib/dashboard-browser-cache";
import { prefetchFlashcardSet } from "@/lib/flashcard-browser-cache";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import {
  setWorkspacePaneDragData,
  useWorkspaceSurfaceNavigation,
} from "@/lib/workspace-panes";
import { commandPaletteActions } from "@/stores/commandPaletteStore";

export function useFlashcardsSidebarPanel({
  active,
  activeSetId,
  workspaceUuid,
}: FlashcardsSidebarPanelProps) {
  const { isMobile } = useSidebar();
  const { navigate } = useWorkspaceSurfaceNavigation({
    panesEnabled: !isMobile,
  });
  const setsWorkspaceRef = useRef<string | null>(workspaceUuid ?? null);
  const [sets, setSets] = useState<FlashcardSetSummary[]>(() =>
    workspaceUuid ? (readCachedFlashcardSets(workspaceUuid) ?? []) : []
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [setsLoadFailed, setSetsLoadFailed] = useState(false);
  const [setsLoading, setSetsLoading] = useState(false);

  const loadSets = useCallback(
    async (signal?: AbortSignal) => {
      if (!workspaceUuid) {
        return;
      }

      setSetsLoading(true);
      setSetsLoadFailed(false);
      try {
        const nextSets = await loadFlashcardsSidebarSets(signal);
        if (!nextSets) {
          setSets([]);
          setSetsLoadFailed(true);
          return;
        }

        setSets(nextSets);
        setSetsLoadFailed(false);
        if (setsWorkspaceRef.current === workspaceUuid) {
          writeCachedFlashcardSets(workspaceUuid, nextSets);
        }
      } catch {
        setSets([]);
        setSetsLoadFailed(true);
      } finally {
        setSetsLoading(false);
      }
    },
    [workspaceUuid]
  );

  useEffect(() => {
    if (!(active && workspaceUuid)) {
      return;
    }

    setsWorkspaceRef.current = workspaceUuid;
    const cachedSets = readCachedFlashcardSets(workspaceUuid);
    setSets(cachedSets ?? []);

    const controller = new AbortController();
    loadSets(controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [active, loadSets, workspaceUuid]);

  useEffect(() => {
    if (!workspaceUuid) {
      return;
    }
    if (setsWorkspaceRef.current !== workspaceUuid) {
      return;
    }
    writeCachedFlashcardSets(workspaceUuid, sets);
  }, [sets, workspaceUuid]);

  useEffect(() => {
    const onWorkspaceInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind?: string;
          workspaceUuid?: string;
        }>
      ).detail;
      if (!detail?.workspaceUuid || detail.workspaceUuid !== workspaceUuid) {
        return;
      }
      if (detail.kind !== "flashcards") {
        return;
      }

      loadSets().catch(() => undefined);
    };

    window.addEventListener(
      "avenire:workspace-data-invalidated",
      onWorkspaceInvalidated
    );
    return () => {
      window.removeEventListener(
        "avenire:workspace-data-invalidated",
        onWorkspaceInvalidated
      );
    };
  }, [loadSets, workspaceUuid]);

  const navigateToFlashcards = useCallback(
    (href: Route, options?: { openInNewPane?: boolean }) => {
      navigate(href, options);
    },
    [navigate]
  );

  const handlePaneIntent = useCallback(
    (event: MouseEvent<HTMLElement>, href: Route) => {
      if (isMobile) {
        return false;
      }

      if (event.type === "contextmenu") {
        event.preventDefault();
        navigateToFlashcards(href, { openInNewPane: true });
        return true;
      }

      if (event.altKey) {
        event.preventDefault();
        navigateToFlashcards(href, { openInNewPane: true });
        return true;
      }

      return false;
    },
    [isMobile, navigateToFlashcards]
  );

  const reviewTarget = useMemo(
    () => findFlashcardsSidebarReviewTarget(sets),
    [sets]
  );
  const filteredSets = useMemo(
    () => filterFlashcardsSidebarSets(sets, searchQuery),
    [searchQuery, sets]
  );

  const openCommandPalette = useCallback(() => {
    commandPaletteActions.open();
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((current) => {
      if (current) {
        setSearchQuery("");
        return false;
      }

      return true;
    });
  }, []);

  const createSet = useCallback(async () => {
    setBusy(true);
    setCreateStatus(null);
    try {
      const result = await createFlashcardsSidebarSet({
        description,
        title,
      });
      if (!result.setId) {
        setCreateStatus(result.status);
        return;
      }

      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setCreateStatus(null);
      startTransition(() => {
        navigate(`/workspace/flashcards/${result.setId}` as Route);
      });
    } finally {
      setBusy(false);
    }
  }, [description, navigate, title]);

  const getReviewHref = useCallback(() => {
    return reviewTarget
      ? (`/workspace/flashcards/${reviewTarget.id}` as Route)
      : ("/workspace/flashcards" as Route);
  }, [reviewTarget]);

  const getSetHref = useCallback((setId: string) => {
    return `/workspace/flashcards/${setId}` as Route;
  }, []);

  const handleEntryClick = useCallback(
    (event: MouseEvent<HTMLElement>, href: Route) => {
      if (handlePaneIntent(event, href)) {
        return;
      }
      navigateToFlashcards(href);
    },
    [handlePaneIntent, navigateToFlashcards]
  );

  const handleEntryContextMenu = useCallback(
    (event: MouseEvent<HTMLElement>, href: Route) => {
      handlePaneIntent(event, href);
    },
    [handlePaneIntent]
  );

  const handleEntryDragStart = useCallback(
    (event: DragEvent<HTMLElement>, href: Route) => {
      setWorkspacePaneDragData(event.dataTransfer, href);
    },
    []
  );

  const prefetchSet = useCallback((setId: string) => {
    prefetchFlashcardSet(setId).catch(() => undefined);
  }, []);

  return {
    activeSetId,
    busy,
    createOpen,
    createSet,
    createStatus,
    description,
    filteredSets,
    getReviewHref,
    getSetHref,
    handleEntryClick,
    handleEntryContextMenu,
    handleEntryDragStart,
    isSearchOpen,
    openCommandPalette,
    prefetchSet,
    reviewTarget,
    searchQuery,
    setCreateOpen,
    setDescription,
    setSearchQuery,
    setsLoadFailed,
    setsLoading,
    setTitle,
    sets,
    title,
    toggleSearch,
  };
}

export type FlashcardsSidebarPanelRuntime = ReturnType<
  typeof useFlashcardsSidebarPanel
>;
