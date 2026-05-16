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

interface WorkspacePaneStoreState {
  activePaneId: string | null;
  closePane: (paneId: string) => void;
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
  panes: WorkspacePaneRecord[];
  reorderPanes: (draggedPaneId: string, targetPaneId: string) => void;
  rows: WorkspacePaneRowRecord[];
  setPaneRoute: (
    paneId: string,
    route: WorkspacePaneRouteState,
    options?: { replace?: boolean }
  ) => void;
  setPaneSizes: (rowId: string, sizes: number[]) => void;
  setRowSizes: (sizes: number[]) => void;
  syncActivePaneFromBrowser: (route: WorkspacePaneRouteState) => void;
}

const STORAGE_KEY = "workspace-pane-layout-v4";
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
      initialized: false,
      panes: [],
      rows: [],
      ensureInitialized: (route) =>
        set((state) => {
          if (state.initialized && state.panes.length > 0) {
            return state;
          }

          const paneId = createPaneId();
          return {
            activePaneId: paneId,
            initialized: true,
            panes: [{ id: paneId, route, rowId: DEFAULT_ROW_ID, size: 100 }],
            rows: [{ id: DEFAULT_ROW_ID, size: 100 }],
          };
        }),
      focusPane: (paneId) =>
        set((state) =>
          state.panes.some((pane) => pane.id === paneId)
            ? { activePaneId: paneId }
            : state
        ),
      openPane: (href, options) =>
        set((state) => {
          const pane: WorkspacePaneRecord = {
            id: createPaneId(),
            route: buildRoute(href),
            rowId: DEFAULT_ROW_ID,
            size: 100,
          };

          return sanitizeState({
            activePaneId: pane.id,
            initialized: true,
            panes: insertPane(
              state.panes,
              pane,
              options?.sourcePaneId ?? state.activePaneId ?? undefined,
              options?.splitPlacement ?? "after"
            ),
          });
        }),
      movePaneToSplit: (draggedPaneId, targetPaneId, options) =>
        set((state) => {
          const draggedPane = state.panes.find(
            (pane) => pane.id === draggedPaneId
          );
          if (!draggedPane || draggedPaneId === targetPaneId) {
            return state;
          }

          const withoutDragged = state.panes.filter(
            (pane) => pane.id !== draggedPaneId
          );
          return sanitizeState({
            activePaneId: draggedPaneId,
            initialized: true,
            panes: insertPane(
              withoutDragged,
              draggedPane,
              targetPaneId,
              options.splitPlacement ?? "after"
            ),
          });
        }),
      closePane: (paneId) =>
        set((state) => {
          if (
            state.panes.length <= 1 ||
            !state.panes.some((pane) => pane.id === paneId)
          ) {
            return state;
          }

          return sanitizeState({
            activePaneId: chooseActiveAfterClose(
              state.panes,
              paneId,
              state.activePaneId
            ),
            initialized: true,
            panes: state.panes.filter((pane) => pane.id !== paneId),
          });
        }),
      reorderPanes: (draggedPaneId, targetPaneId) =>
        set((state) => {
          if (draggedPaneId === targetPaneId) {
            return state;
          }

          const draggedIndex = state.panes.findIndex(
            (pane) => pane.id === draggedPaneId
          );
          const targetIndex = state.panes.findIndex(
            (pane) => pane.id === targetPaneId
          );
          const draggedPane = state.panes[draggedIndex];
          if (!(draggedPane && targetIndex >= 0)) {
            return state;
          }

          const withoutDragged = state.panes.filter(
            (pane) => pane.id !== draggedPaneId
          );
          return sanitizeState({
            activePaneId: draggedPaneId,
            initialized: true,
            panes: insertPane(
              withoutDragged,
              draggedPane,
              targetPaneId,
              draggedIndex < targetIndex ? "after" : "before"
            ),
          });
        }),
      setPaneRoute: (paneId, route) =>
        set((state) => {
          if (!state.panes.some((pane) => pane.id === paneId)) {
            return state;
          }

          return {
            activePaneId: paneId,
            panes: state.panes.map((pane) =>
              pane.id === paneId ? { ...pane, route } : pane
            ),
          };
        }),
      setPaneSizes: (_rowId, sizes) =>
        set((state) => ({
          panes: normalizeSizes(
            state.panes.map((pane, index) => ({
              ...pane,
              size: sizes[index] ?? pane.size,
            }))
          ),
        })),
      setRowSizes: () => set((state) => state),
      syncActivePaneFromBrowser: (route) =>
        set((state) => {
          const activePaneId = state.activePaneId ?? state.panes[0]?.id ?? null;
          if (!activePaneId) {
            return state;
          }

          return {
            activePaneId,
            panes: state.panes.map((pane) =>
              pane.id === activePaneId ? { ...pane, route } : pane
            ),
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        activePaneId: state.activePaneId,
        initialized: state.initialized,
        panes: state.panes,
      }),
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) =>
        ({
          ...currentState,
          ...sanitizeState({
            activePaneId:
              (persistedState as Partial<WorkspacePaneStoreState> | undefined)
                ?.activePaneId ?? currentState.activePaneId,
            initialized:
              (persistedState as Partial<WorkspacePaneStoreState> | undefined)
                ?.initialized ?? currentState.initialized,
            panes:
              (persistedState as Partial<WorkspacePaneStoreState> | undefined)
                ?.panes ?? currentState.panes,
          }),
        }) as WorkspacePaneStoreState,
    }
  )
);
