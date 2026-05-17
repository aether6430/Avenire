"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  WorkspacePaneRouteState,
  WorkspacePaneSplitDirection,
} from "@/lib/workspace-pane-model";
import {
  closeWorkspacePaneState,
  ensureInitializedWorkspacePaneState,
  focusWorkspacePaneState,
  moveWorkspacePaneToSplitState,
  openWorkspacePaneState,
  reorderWorkspacePaneState,
  sanitizeWorkspacePaneState,
  setPaneRouteInWorkspacePaneState,
  setPaneSizesInWorkspacePaneState,
  setRowSizesInWorkspacePaneState,
  syncActivePaneRouteInWorkspacePaneState,
  type WorkspacePaneStorePersistedState,
} from "@/stores/workspace-pane-store-model";

function createPaneId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `pane-${Math.random().toString(36).slice(2, 10)}`;
}

function createRowId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

interface WorkspacePaneStoreState extends WorkspacePaneStorePersistedState {
  closePane: (paneId: string) => void;
  ensureInitialized: (route: WorkspacePaneRouteState) => void;
  focusPane: (paneId: string) => void;
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
  reorderPanes: (draggedPaneId: string, targetPaneId: string) => void;
  setPaneRoute: (
    paneId: string,
    route: WorkspacePaneRouteState,
    options?: { replace?: boolean }
  ) => void;
  setPaneSizes: (rowId: string, sizes: number[]) => void;
  setRowSizes: (sizes: number[]) => void;
  syncActivePaneFromBrowser: (route: WorkspacePaneRouteState) => void;
}

const STORAGE_KEY = "workspace-pane-layout-v3";

export const useWorkspacePaneStore = create<WorkspacePaneStoreState>()(
  persist(
    (set) => ({
      activePaneId: null,
      initialized: false,
      panes: [],
      rows: [],
      ensureInitialized: (route) =>
        set((state) =>
          ensureInitializedWorkspacePaneState(state, route, {
            createPaneId,
            createRowId,
          })
        ),
      focusPane: (paneId) =>
        set((state) => focusWorkspacePaneState(state, paneId)),
      openPane: (href, options) =>
        set((state) =>
          openWorkspacePaneState(state, href, options, {
            createPaneId,
            createRowId,
          })
        ),
      movePaneToSplit: (draggedPaneId, targetPaneId, options) =>
        set((state) =>
          moveWorkspacePaneToSplitState(
            state,
            draggedPaneId,
            targetPaneId,
            options
          )
        ),
      closePane: (paneId) =>
        set((state) => closeWorkspacePaneState(state, paneId)),
      reorderPanes: (draggedPaneId, targetPaneId) =>
        set((state) =>
          reorderWorkspacePaneState(state, draggedPaneId, targetPaneId)
        ),
      setPaneRoute: (paneId, route) =>
        set((state) => setPaneRouteInWorkspacePaneState(state, paneId, route)),
      setPaneSizes: (rowId, sizes) =>
        set((state) => setPaneSizesInWorkspacePaneState(state, rowId, sizes)),
      setRowSizes: (sizes) =>
        set((state) => setRowSizesInWorkspacePaneState(state, sizes)),
      syncActivePaneFromBrowser: (route) =>
        set((state) => syncActivePaneRouteInWorkspacePaneState(state, route)),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        activePaneId: state.activePaneId,
        initialized: state.initialized,
        panes: state.panes,
        rows: state.rows,
      }),
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) =>
        ({
          ...currentState,
          ...sanitizeWorkspacePaneState({
            ...currentState,
            ...(persistedState as Partial<
              Pick<
                WorkspacePaneStoreState,
                "activePaneId" | "initialized" | "panes" | "rows"
              >
            >),
          }),
        }) as WorkspacePaneStoreState,
    }
  )
);
