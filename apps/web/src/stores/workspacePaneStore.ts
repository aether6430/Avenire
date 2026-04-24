"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  WorkspacePaneRecord,
  WorkspacePaneRouteState,
  WorkspacePaneSplitDirection,
} from "@/lib/workspace-panes";

function createPaneId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `pane-${Math.random().toString(36).slice(2, 10)}`;
}

function createRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

interface WorkspacePaneRowRecord {
  id: string;
  size: number;
}

interface WorkspacePaneStoreState {
  activePaneId: string | null;
  initialized: boolean;
  panes: WorkspacePaneRecord[];
  rows: WorkspacePaneRowRecord[];
  closePane: (paneId: string) => void;
  ensureInitialized: (route: WorkspacePaneRouteState) => void;
  focusPane: (paneId: string) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: WorkspacePaneSplitDirection;
      splitPlacement?: "after" | "before";
    }
  ) => void;
  movePaneToSplit: (
    draggedPaneId: string,
    targetPaneId: string,
    options: {
      splitDirection: WorkspacePaneSplitDirection;
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

function normalizePercentages(values: number[]) {
  if (values.length === 0) {
    return values;
  }

  const safeValues = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 1
  );
  const total = safeValues.reduce((sum, value) => sum + value, 0) || values.length;

  return safeValues.map((value) => (value / total) * 100);
}

function normalizeRows(rows: WorkspacePaneRowRecord[]) {
  const normalizedSizes = normalizePercentages(rows.map((row) => row.size));
  return rows.map((row, index) => ({
    ...row,
    size: normalizedSizes[index] ?? row.size,
  }));
}

function normalizePanesByRow(
  panes: WorkspacePaneRecord[],
  rows: WorkspacePaneRowRecord[]
) {
  const sizesByPaneId = new Map<string, number>();

  for (const row of rows) {
    const rowPanes = panes.filter((pane) => pane.rowId === row.id);
    const normalizedSizes = normalizePercentages(
      rowPanes.map((pane) => pane.size)
    );

    rowPanes.forEach((pane, index) => {
      sizesByPaneId.set(pane.id, normalizedSizes[index] ?? pane.size);
    });
  }

  return panes.map((pane) => ({
    ...pane,
    size: sizesByPaneId.get(pane.id) ?? 100,
  }));
}

function cleanupRows(
  panes: WorkspacePaneRecord[],
  rows: WorkspacePaneRowRecord[]
) {
  const rowIds = new Set(panes.map((pane) => pane.rowId));
  const filteredRows = rows.filter((row) => rowIds.has(row.id));

  if (filteredRows.length > 0) {
    return normalizeRows(filteredRows);
  }

  if (panes[0]) {
    return [{ id: panes[0].rowId, size: 100 }];
  }

  return [];
}

function collapseToSingleRow(
  panes: WorkspacePaneRecord[],
  rows: WorkspacePaneRowRecord[]
): {
  panes: WorkspacePaneRecord[];
  rows: WorkspacePaneRowRecord[];
} {
  if (panes.length === 0) {
    return { panes: [], rows: [] };
  }

  const primaryRowId = rows[0]?.id ?? panes[0]!.rowId;
  const normalizedPanes = panes.map((pane) => ({
    ...pane,
    rowId: primaryRowId,
  }));

  return {
    panes: normalizedPanes,
    rows: [{ id: primaryRowId, size: 100 }],
  };
}

function sanitizeState(
  state: Pick<
    WorkspacePaneStoreState,
    "activePaneId" | "initialized" | "panes" | "rows"
  >
) {
  const panes = state.panes.filter((pane) => pane.id && pane.rowId);
  const rows = cleanupRows(panes, state.rows);
  const collapsed = collapseToSingleRow(panes, rows);
  const normalizedPanes = normalizePanesByRow(collapsed.panes, collapsed.rows);
  const activePaneId = normalizedPanes.some((pane) => pane.id === state.activePaneId)
    ? state.activePaneId
    : normalizedPanes[0]?.id ?? null;

  return {
    activePaneId,
    initialized: state.initialized || normalizedPanes.length > 0,
    panes: normalizedPanes,
    rows: collapsed.rows,
  };
}

function findNextActivePaneId(
  panes: WorkspacePaneRecord[],
  closingPane: WorkspacePaneRecord,
  currentActivePaneId: string | null
) {
  if (currentActivePaneId !== closingPane.id) {
    return currentActivePaneId;
  }

  const sameRowPanes = panes.filter((pane) => pane.rowId === closingPane.rowId);
  const closingRowIndex = sameRowPanes.findIndex((pane) => pane.id === closingPane.id);

  return (
    sameRowPanes[closingRowIndex + 1]?.id ??
    sameRowPanes[closingRowIndex - 1]?.id ??
    panes[0]?.id ??
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

          const rowId = createRowId();
          const paneId = createPaneId();
          return {
            activePaneId: paneId,
            initialized: true,
            panes: [{ id: paneId, route, rowId, size: 100 }],
            rows: [{ id: rowId, size: 100 }],
          };
        }),
      focusPane: (paneId) =>
        set((state) => {
          if (!state.panes.some((pane) => pane.id === paneId)) {
            return state;
          }

          return { activePaneId: paneId };
        }),
      openPane: (href, options) =>
        set((state) => {
          const [pathname, search = ""] = href.split("?");
          const sourcePane =
            (options?.sourcePaneId
              ? state.panes.find((pane) => pane.id === options.sourcePaneId)
              : null) ??
            state.panes.find((pane) => pane.id === state.activePaneId) ??
            state.panes[state.panes.length - 1] ??
            null;

          const splitPlacement = options?.splitPlacement ?? "after";
          const sourceRowId = sourcePane?.rowId ?? state.rows[0]?.id ?? createRowId();
          const nextPane: WorkspacePaneRecord = {
            id: createPaneId(),
            route: {
              pathname: pathname || "/workspace",
              search: search ? `?${search}` : "",
            },
            rowId: sourceRowId,
            size: 100,
          };

          const nextPanes = [...state.panes];
          const nextRows = [...state.rows];
          const sourcePaneIndex = sourcePane
            ? nextPanes.findIndex((pane) => pane.id === sourcePane.id)
            : nextPanes.length - 1;
          const insertIndex =
            sourcePaneIndex >= 0
              ? sourcePaneIndex + (splitPlacement === "after" ? 1 : 0)
              : nextPanes.length;

          nextPanes.splice(insertIndex, 0, nextPane);

          return sanitizeState({
            activePaneId: nextPane.id,
            initialized: true,
            panes: nextPanes,
            rows:
              nextRows.length > 0 ? nextRows : [{ id: nextPane.rowId, size: 100 }],
          });
        }),
      movePaneToSplit: (draggedPaneId, targetPaneId, options) =>
        set((state) => {
          const draggedPane = state.panes.find((pane) => pane.id === draggedPaneId);
          const targetPane = state.panes.find((pane) => pane.id === targetPaneId);

          if (!draggedPane || !targetPane || draggedPane.id === targetPane.id) {
            return state;
          }

          const splitPlacement = options.splitPlacement ?? "after";
          const nextPanes = state.panes.filter((pane) => pane.id !== draggedPaneId);
          const targetIndex = nextPanes.findIndex((pane) => pane.id === targetPaneId);
          nextPanes.splice(
            targetIndex >= 0
              ? targetIndex + (splitPlacement === "after" ? 1 : 0)
              : nextPanes.length,
            0,
            {
              ...draggedPane,
              rowId: targetPane.rowId,
            }
          );

          return sanitizeState({
            activePaneId: draggedPane.id,
            initialized: true,
            panes: nextPanes,
            rows: state.rows,
          });
        }),
      closePane: (paneId) =>
        set((state) => {
          if (state.panes.length <= 1) {
            return state;
          }

          const closingPane = state.panes.find((pane) => pane.id === paneId);
          if (!closingPane) {
            return state;
          }

          const nextPanes = state.panes.filter((pane) => pane.id !== paneId);

          return sanitizeState({
            activePaneId: findNextActivePaneId(
              nextPanes,
              closingPane,
              state.activePaneId
            ),
            initialized: true,
            panes: nextPanes,
            rows: state.rows,
          });
        }),
      reorderPanes: (draggedPaneId, targetPaneId) =>
        set((state) => {
          const draggedIndex = state.panes.findIndex((pane) => pane.id === draggedPaneId);
          const targetIndex = state.panes.findIndex((pane) => pane.id === targetPaneId);

          if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
            return state;
          }

          const draggedPane = state.panes[draggedIndex];
          const targetPane = state.panes[targetIndex];
          if (!draggedPane || !targetPane) {
            return state;
          }

          const nextPanes = [...state.panes];
          nextPanes.splice(draggedIndex, 1);
          const insertionIndex = nextPanes.findIndex((pane) => pane.id === targetPaneId);
          nextPanes.splice(insertionIndex < 0 ? nextPanes.length : insertionIndex, 0, {
            ...draggedPane,
            rowId: targetPane.rowId,
          });

          return sanitizeState({
            activePaneId: state.activePaneId,
            initialized: true,
            panes: nextPanes,
            rows: state.rows,
          });
        }),
      setPaneRoute: (paneId, route) =>
        set((state) => ({
          activePaneId: paneId,
          panes: state.panes.map((pane) =>
            pane.id === paneId ? { ...pane, route } : pane
          ),
        })),
      setPaneSizes: (rowId, sizes) =>
        set((state) => ({
          panes: normalizePanesByRow(
            state.panes.map((pane) => {
              if (pane.rowId !== rowId) {
                return pane;
              }

              const rowPanes = state.panes.filter(
                (candidate) => candidate.rowId === rowId
              );
              const rowIndex = rowPanes.findIndex(
                (candidate) => candidate.id === pane.id
              );

              return {
                ...pane,
                size: sizes[rowIndex] ?? pane.size,
              };
            }),
            state.rows
          ),
        })),
      setRowSizes: (sizes) =>
        set((state) => ({
          rows: normalizeRows(
            state.rows.map((row, index) => ({
              ...row,
              size: sizes[index] ?? row.size,
            }))
          ),
        })),
      syncActivePaneFromBrowser: (route) =>
        set((state) => {
          const activePaneId = state.activePaneId ?? state.panes[0]?.id ?? null;
          if (!activePaneId) {
            return state;
          }

          const activePane = state.panes.find((pane) => pane.id === activePaneId);
          if (
            activePane &&
            activePane.route.pathname === route.pathname &&
            activePane.route.search === route.search
          ) {
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
        rows: state.rows,
      }),
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) =>
        ({
          ...currentState,
          ...sanitizeState({
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
