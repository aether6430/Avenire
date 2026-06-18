"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  WorkspacePaneRecord,
  WorkspacePaneRouteState,
  WorkspacePaneSplitDirection,
} from "@/lib/workspace-panes";

interface WorkspacePaneRowRecord {
  id: string;
  size: number;
}

interface WorkspacePaneTabRecord {
  activePaneId: string | null;
  customTitle?: boolean;
  id: string;
  panes: WorkspacePaneRecord[];
  title: string;
}

interface WorkspacePaneStoreState {
  activePaneId: string | null;
  activeTabId: string | null;
  closePane: (paneId: string) => void;
  closeTab: (tabId: string) => void;
  ensureInitialized: (route: WorkspacePaneRouteState) => void;
  focusPane: (paneId: string) => void;
  initialized: boolean;
  movePaneToSplit: (
    draggedPaneId: string,
    targetPaneId: string,
    options: {
      splitDirection: WorkspacePaneSplitDirection;
      splitPlacement?: "after" | "before";
    }
  ) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: WorkspacePaneSplitDirection;
      splitPlacement?: "after" | "before";
    }
  ) => void;
  openTab: (href?: string) => void;
  panes: WorkspacePaneRecord[];
  renameTab: (tabId: string, title: string) => void;
  reorderPanes: (draggedPaneId: string, targetPaneId: string) => void;
  reorderTabs: (draggedTabId: string, targetTabId: string) => void;
  rows: WorkspacePaneRowRecord[];
  setPaneRoute: (
    paneId: string,
    route: WorkspacePaneRouteState,
    options?: { replace?: boolean }
  ) => void;
  setPaneSizes: (rowId: string, sizes: number[]) => void;
  setRowSizes: (sizes: number[]) => void;
  switchTab: (tabId: string) => void;
  syncActivePaneFromBrowser: (route: WorkspacePaneRouteState) => void;
  tabs: WorkspacePaneTabRecord[];
}

const STORAGE_KEY = "workspace-pane-layout-v5";
const DEFAULT_ROW_ID = "workspace-row";

function createPaneId() {
  return (
    crypto?.randomUUID?.() ??
    `pane-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function buildRoute(href: string): WorkspacePaneRouteState {
  const [pathname, search = ""] = href.split("?");
  return {
    pathname: pathname || "/workspace",
    search: search ? `?${search}` : "",
  };
}

function titleForRoute(route: WorkspacePaneRouteState) {
  if (route.pathname === "/workspace") {
    return "Home";
  }
  if (route.pathname === "/workspace/tasks") {
    return "Tasks";
  }
  if (route.pathname.startsWith("/workspace/chats")) {
    return "Chats";
  }
  if (route.pathname.startsWith("/workspace/flashcards")) {
    return "Flashcards";
  }
  if (route.pathname.startsWith("/workspace/files")) {
    return "Files";
  }
  return "Workspace";
}

function normalizeTabTitle(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

function normalizeSizes<T extends { size: number }>(items: T[]) {
  if (items.length === 0) {
    return items;
  }

  const safe = items.map((item) =>
    Number.isFinite(item.size) && item.size > 0 ? item.size : 1
  );
  const total = safe.reduce((sum, size) => sum + size, 0) || items.length;

  return items.map((item, index) => ({
    ...item,
    size: (safe[index]! / total) * 100,
  }));
}

function sanitizePanes(panes: WorkspacePaneRecord[]) {
  const seen = new Set<string>();
  const valid = panes.filter((pane) => {
    if (!(pane.id && pane.route?.pathname) || seen.has(pane.id)) {
      return false;
    }
    seen.add(pane.id);
    return true;
  });

  return normalizeSizes(
    valid.map((pane) => ({
      ...pane,
      rowId: DEFAULT_ROW_ID,
    }))
  );
}

function sanitizeState(state: {
  activePaneId: string | null;
  initialized: boolean;
  panes: WorkspacePaneRecord[];
}) {
  const panes = sanitizePanes(state.panes);
  return {
    activePaneId: panes.some((pane) => pane.id === state.activePaneId)
      ? state.activePaneId
      : (panes[0]?.id ?? null),
    initialized: state.initialized || panes.length > 0,
    panes,
    rows: panes.length > 0 ? [{ id: DEFAULT_ROW_ID, size: 100 }] : [],
  };
}

function createTab(route: WorkspacePaneRouteState): WorkspacePaneTabRecord {
  const paneId = createPaneId();
  return {
    activePaneId: paneId,
    id: createPaneId(),
    panes: [{ id: paneId, route, rowId: DEFAULT_ROW_ID, size: 100 }],
    title: titleForRoute(route),
  };
}

function sanitizeTab(
  tab: WorkspacePaneTabRecord
): WorkspacePaneTabRecord | null {
  const panes = sanitizePanes(tab.panes);
  if (panes.length === 0) {
    return null;
  }

  const activePaneId = panes.some((pane) => pane.id === tab.activePaneId)
    ? tab.activePaneId
    : (panes[0]?.id ?? null);
  const activePane = panes.find((pane) => pane.id === activePaneId) ?? panes[0];

  return {
    activePaneId,
    customTitle: Boolean(tab.customTitle),
    id: tab.id || createPaneId(),
    panes,
    title:
      tab.title || (activePane ? titleForRoute(activePane.route) : "Workspace"),
  };
}

function activeTabFromState(state: WorkspacePaneStoreState) {
  return (
    state.tabs.find((tab) => tab.id === state.activeTabId) ??
    state.tabs[0] ??
    null
  );
}

function rowsForPanes(panes: WorkspacePaneRecord[]) {
  return panes.length > 0 ? [{ id: DEFAULT_ROW_ID, size: 100 }] : [];
}

function mirrorActiveTab(state: WorkspacePaneStoreState) {
  const activeTab = activeTabFromState(state);
  return {
    activePaneId: activeTab?.activePaneId ?? null,
    activeTabId: activeTab?.id ?? null,
    panes: activeTab?.panes ?? [],
    rows: rowsForPanes(activeTab?.panes ?? []),
  };
}

function updateActiveTab(
  state: WorkspacePaneStoreState,
  update: (tab: WorkspacePaneTabRecord) => WorkspacePaneTabRecord
) {
  const activeTab = activeTabFromState(state);
  if (!activeTab) {
    return state;
  }

  const nextTab = sanitizeTab(update(activeTab));
  if (!nextTab) {
    return state;
  }

  const tabs = state.tabs.map((tab) =>
    tab.id === activeTab.id ? nextTab : tab
  );
  return {
    tabs,
    initialized: true,
    ...mirrorActiveTab({ ...state, tabs, activeTabId: nextTab.id }),
  };
}

function insertPane(
  panes: WorkspacePaneRecord[],
  pane: WorkspacePaneRecord,
  sourcePaneId: string | undefined,
  placement: "after" | "before"
) {
  const next = [...panes];
  const sourceIndex = sourcePaneId
    ? next.findIndex((candidate) => candidate.id === sourcePaneId)
    : next.length - 1;
  const insertIndex =
    sourceIndex >= 0
      ? sourceIndex + (placement === "after" ? 1 : 0)
      : next.length;
  next.splice(insertIndex, 0, pane);
  return next;
}

function chooseActiveAfterClose(
  panesBeforeClose: WorkspacePaneRecord[],
  paneId: string,
  activePaneId: string | null
) {
  if (activePaneId !== paneId) {
    return activePaneId;
  }

  const index = panesBeforeClose.findIndex((pane) => pane.id === paneId);
  return (
    panesBeforeClose[index + 1]?.id ??
    panesBeforeClose[index - 1]?.id ??
    panesBeforeClose.find((pane) => pane.id !== paneId)?.id ??
    null
  );
}

export const useWorkspacePaneStore = create<WorkspacePaneStoreState>()(
  persist(
    (set) => ({
      activePaneId: null,
      activeTabId: null,
      initialized: false,
      panes: [],
      rows: [],
      tabs: [],
      ensureInitialized: (route) =>
        set((state) => {
          if (state.initialized && state.tabs.length > 0) {
            return state;
          }

          const tab = createTab(route);
          return {
            activePaneId: tab.activePaneId,
            activeTabId: tab.id,
            initialized: true,
            panes: tab.panes,
            rows: [{ id: DEFAULT_ROW_ID, size: 100 }],
            tabs: [tab],
          };
        }),
      focusPane: (paneId) =>
        set((state) => {
          const activeTab = activeTabFromState(state);
          if (!activeTab?.panes.some((pane) => pane.id === paneId)) {
            return state;
          }

          return updateActiveTab(state, (tab) => ({
            ...tab,
            activePaneId: paneId,
          }));
        }),
      openPane: (href, options) =>
        set((state) => {
          const pane: WorkspacePaneRecord = {
            id: createPaneId(),
            route: buildRoute(href),
            rowId: DEFAULT_ROW_ID,
            size: 100,
          };

          return updateActiveTab(state, (tab) => {
            const next = sanitizeState({
              activePaneId: pane.id,
              initialized: true,
              panes: insertPane(
                tab.panes,
                pane,
                options?.sourcePaneId ?? tab.activePaneId ?? undefined,
                options?.splitPlacement ?? "after"
              ),
            });
            return {
              ...tab,
              activePaneId: next.activePaneId,
              panes: next.panes,
              title: tab.customTitle ? tab.title : titleForRoute(pane.route),
            };
          });
        }),
      openTab: (href) =>
        set((state) => {
          const activeTab = activeTabFromState(state);
          const activePane = activeTab?.panes.find(
            (pane) => pane.id === activeTab.activePaneId
          );
          const route = href
            ? buildRoute(href)
            : (activePane?.route ?? buildRoute("/workspace"));
          const tab = createTab(route);
          const tabs = [...state.tabs, tab];

          return {
            activePaneId: tab.activePaneId,
            activeTabId: tab.id,
            initialized: true,
            panes: tab.panes,
            rows: rowsForPanes(tab.panes),
            tabs,
          };
        }),
      movePaneToSplit: (draggedPaneId, targetPaneId, options) =>
        set((state) => {
          const activeTab = activeTabFromState(state);
          if (!activeTab) {
            return state;
          }

          const draggedPane = activeTab.panes.find(
            (pane) => pane.id === draggedPaneId
          );
          if (!draggedPane || draggedPaneId === targetPaneId) {
            return state;
          }

          const withoutDragged = activeTab.panes.filter(
            (pane) => pane.id !== draggedPaneId
          );
          return updateActiveTab(state, (tab) => {
            const next = sanitizeState({
              activePaneId: draggedPaneId,
              initialized: true,
              panes: insertPane(
                withoutDragged,
                draggedPane,
                targetPaneId,
                options.splitPlacement ?? "after"
              ),
            });
            return {
              ...tab,
              activePaneId: next.activePaneId,
              panes: next.panes,
            };
          });
        }),
      closePane: (paneId) =>
        set((state) => {
          const activeTab = activeTabFromState(state);
          if (
            !activeTab ||
            activeTab.panes.length <= 1 ||
            !activeTab.panes.some((pane) => pane.id === paneId)
          ) {
            return state;
          }

          return updateActiveTab(state, (tab) => {
            const next = sanitizeState({
              activePaneId: chooseActiveAfterClose(
                tab.panes,
                paneId,
                tab.activePaneId
              ),
              initialized: true,
              panes: tab.panes.filter((pane) => pane.id !== paneId),
            });
            return {
              ...tab,
              activePaneId: next.activePaneId,
              panes: next.panes,
            };
          });
        }),
      closeTab: (tabId) =>
        set((state) => {
          if (
            state.tabs.length <= 1 ||
            !state.tabs.some((tab) => tab.id === tabId)
          ) {
            return state;
          }

          const closedIndex = state.tabs.findIndex((tab) => tab.id === tabId);
          const tabs = state.tabs.filter((tab) => tab.id !== tabId);
          const nextActiveTabId =
            state.activeTabId === tabId
              ? (tabs[closedIndex]?.id ??
                tabs[closedIndex - 1]?.id ??
                tabs[0]?.id ??
                null)
              : state.activeTabId;

          return {
            initialized: true,
            tabs,
            ...mirrorActiveTab({
              ...state,
              tabs,
              activeTabId: nextActiveTabId,
            }),
          };
        }),
      reorderPanes: (draggedPaneId, targetPaneId) =>
        set((state) => {
          if (draggedPaneId === targetPaneId) {
            return state;
          }

          const activeTab = activeTabFromState(state);
          if (!activeTab) {
            return state;
          }

          const draggedIndex = activeTab.panes.findIndex(
            (pane) => pane.id === draggedPaneId
          );
          const targetIndex = activeTab.panes.findIndex(
            (pane) => pane.id === targetPaneId
          );
          const draggedPane = activeTab.panes[draggedIndex];
          if (!(draggedPane && targetIndex >= 0)) {
            return state;
          }

          const withoutDragged = activeTab.panes.filter(
            (pane) => pane.id !== draggedPaneId
          );
          return updateActiveTab(state, (tab) => {
            const next = sanitizeState({
              activePaneId: draggedPaneId,
              initialized: true,
              panes: insertPane(
                withoutDragged,
                draggedPane,
                targetPaneId,
                draggedIndex < targetIndex ? "after" : "before"
              ),
            });
            return {
              ...tab,
              activePaneId: next.activePaneId,
              panes: next.panes,
            };
          });
        }),
      setPaneRoute: (paneId, route) =>
        set((state) => {
          const activeTab = activeTabFromState(state);
          if (!activeTab?.panes.some((pane) => pane.id === paneId)) {
            return state;
          }

          return updateActiveTab(state, (tab) => ({
            ...tab,
            activePaneId: paneId,
            panes: tab.panes.map((pane) =>
              pane.id === paneId ? { ...pane, route } : pane
            ),
            title: tab.customTitle ? tab.title : titleForRoute(route),
          }));
        }),
      renameTab: (tabId, title) =>
        set((state) => {
          const nextTitle = normalizeTabTitle(title);
          return {
            ...state,
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    customTitle: nextTitle.length > 0,
                    title:
                      nextTitle ||
                      titleForRoute(
                        tab.panes.find((pane) => pane.id === tab.activePaneId)
                          ?.route ??
                          tab.panes[0]?.route ??
                          buildRoute("/workspace")
                      ),
                  }
                : tab
            ),
          };
        }),
      reorderTabs: (draggedTabId, targetTabId) =>
        set((state) => {
          if (draggedTabId === targetTabId) {
            return state;
          }
          const draggedIndex = state.tabs.findIndex(
            (tab) => tab.id === draggedTabId
          );
          const targetIndex = state.tabs.findIndex(
            (tab) => tab.id === targetTabId
          );
          if (draggedIndex === -1 || targetIndex === -1) {
            return state;
          }
          const tabs = [...state.tabs];
          const [moved] = tabs.splice(draggedIndex, 1);
          tabs.splice(targetIndex, 0, moved);
          return {
            ...state,
            tabs,
            ...mirrorActiveTab({
              ...state,
              tabs,
              activeTabId: state.activeTabId,
            }),
          };
        }),
      setPaneSizes: (_rowId, sizes) =>
        set((state) =>
          updateActiveTab(state, (tab) => ({
            ...tab,
            panes: normalizeSizes(
              tab.panes.map((pane, index) => ({
                ...pane,
                size: sizes[index] ?? pane.size,
              }))
            ),
          }))
        ),
      setRowSizes: () => set((state) => state),
      switchTab: (tabId) =>
        set((state) => {
          if (!state.tabs.some((tab) => tab.id === tabId)) {
            return state;
          }

          return {
            initialized: true,
            ...mirrorActiveTab({ ...state, activeTabId: tabId }),
          };
        }),
      syncActivePaneFromBrowser: (route) =>
        set((state) => {
          const activeTab = activeTabFromState(state);
          if (!activeTab) {
            return state;
          }

          const activePaneId =
            activeTab.activePaneId ?? activeTab.panes[0]?.id ?? null;
          if (!activePaneId) {
            return state;
          }

          return updateActiveTab(state, (tab) => ({
            ...tab,
            activePaneId,
            panes: tab.panes.map((pane) =>
              pane.id === activePaneId ? { ...pane, route } : pane
            ),
            title: tab.customTitle ? tab.title : titleForRoute(route),
          }));
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        activePaneId: state.activePaneId,
        activeTabId: state.activeTabId,
        initialized: state.initialized,
        panes: state.panes,
        tabs: state.tabs,
      }),
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | Partial<WorkspacePaneStoreState>
          | undefined;
        const sanitizedTabs = (persisted?.tabs ?? [])
          .map((tab) => sanitizeTab(tab))
          .filter((tab): tab is WorkspacePaneTabRecord => Boolean(tab));
        const tabs =
          sanitizedTabs.length > 0
            ? sanitizedTabs
            : sanitizeState({
                  activePaneId:
                    persisted?.activePaneId ?? currentState.activePaneId,
                  initialized:
                    persisted?.initialized ?? currentState.initialized,
                  panes: persisted?.panes ?? currentState.panes,
                }).panes.length > 0
              ? [
                  {
                    activePaneId:
                      persisted?.activePaneId ?? currentState.activePaneId,
                    id: createPaneId(),
                    panes: sanitizePanes(
                      persisted?.panes ?? currentState.panes
                    ),
                    title: "Workspace",
                  },
                ]
              : [];
        const activeTabId = tabs.some(
          (tab) => tab.id === persisted?.activeTabId
        )
          ? (persisted?.activeTabId ?? null)
          : (tabs[0]?.id ?? null);

        return {
          ...currentState,
          initialized: persisted?.initialized ?? tabs.length > 0,
          tabs,
          ...mirrorActiveTab({ ...currentState, tabs, activeTabId }),
        } as WorkspacePaneStoreState;
      },
    }
  )
);
