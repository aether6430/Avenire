import {
  buildRouteState,
  type WorkspacePaneRecord,
  type WorkspacePaneRouteState,
  type WorkspacePaneSplitDirection,
} from "@/lib/workspace-pane-model";

export interface WorkspacePaneRowRecord {
  id: string;
  size: number;
}

export interface WorkspacePaneStorePersistedState {
  activePaneId: string | null;
  initialized: boolean;
  panes: WorkspacePaneRecord[];
  rows: WorkspacePaneRowRecord[];
}

interface IdFactories {
  createPaneId: () => string;
  createRowId: () => string;
}

export function normalizePercentages(values: number[]) {
  if (values.length === 0) {
    return values;
  }

  const safeValues = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 1
  );
  const total =
    safeValues.reduce((sum, value) => sum + value, 0) || values.length;

  return safeValues.map((value) => (value / total) * 100);
}

export function normalizeRows(rows: WorkspacePaneRowRecord[]) {
  const normalizedSizes = normalizePercentages(rows.map((row) => row.size));
  return rows.map((row, index) => ({
    ...row,
    size: normalizedSizes[index] ?? row.size,
  }));
}

export function normalizePanesByRow(
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

export function cleanupRows(
  panes: WorkspacePaneRecord[],
  rows: WorkspacePaneRowRecord[]
) {
  const rowIds = new Set(panes.map((pane) => pane.rowId));
  const filteredRows = rows.filter((row) => rowIds.has(row.id));
  const knownRowIds = new Set(filteredRows.map((row) => row.id));
  const missingRows = panes
    .map((pane) => pane.rowId)
    .filter((rowId) => !knownRowIds.has(rowId))
    .map((rowId) => ({ id: rowId, size: 100 }));
  const nextRows = filteredRows.concat(missingRows);

  if (nextRows.length > 0) {
    return normalizeRows(nextRows);
  }

  if (panes[0]) {
    return [{ id: panes[0].rowId, size: 100 }];
  }

  return [];
}

export function sanitizeWorkspacePaneState(
  state: WorkspacePaneStorePersistedState
) {
  const panes = state.panes.filter((pane) => pane.id && pane.rowId);
  const rows = cleanupRows(panes, state.rows);
  const normalizedPanes = normalizePanesByRow(panes, rows);
  const activePaneId = normalizedPanes.some(
    (pane) => pane.id === state.activePaneId
  )
    ? state.activePaneId
    : (normalizedPanes[0]?.id ?? null);

  return {
    activePaneId,
    initialized: state.initialized || normalizedPanes.length > 0,
    panes: normalizedPanes,
    rows,
  } satisfies WorkspacePaneStorePersistedState;
}

function insertRowRelativeToSource(
  rows: WorkspacePaneRowRecord[],
  sourceRowId: string,
  nextRow: WorkspacePaneRowRecord,
  splitPlacement: "after" | "before"
) {
  const sourceRowIndex = rows.findIndex((row) => row.id === sourceRowId);
  const sourceRow = sourceRowIndex >= 0 ? rows[sourceRowIndex] : null;
  if (!sourceRow) {
    return normalizeRows(rows.concat(nextRow));
  }

  const splitSize = sourceRow.size / 2;
  const nextRows = [...rows];
  nextRows[sourceRowIndex] = {
    ...sourceRow,
    size: splitSize,
  };
  const insertionIndex =
    sourceRowIndex >= 0
      ? sourceRowIndex + (splitPlacement === "after" ? 1 : 0)
      : nextRows.length;
  nextRows.splice(insertionIndex, 0, {
    ...nextRow,
    size: splitSize,
  });
  return nextRows;
}

export function findNextActivePaneId(
  currentPanes: WorkspacePaneRecord[],
  panesAfterClose: WorkspacePaneRecord[],
  closingPane: WorkspacePaneRecord,
  currentActivePaneId: string | null
) {
  if (currentActivePaneId !== closingPane.id) {
    return currentActivePaneId;
  }

  const sameRowCurrentPanes = currentPanes.filter(
    (pane) => pane.rowId === closingPane.rowId
  );
  const sameRowNextPanes = panesAfterClose.filter(
    (pane) => pane.rowId === closingPane.rowId
  );
  const closingRowIndex = sameRowCurrentPanes.findIndex(
    (pane) => pane.id === closingPane.id
  );

  return (
    sameRowNextPanes[closingRowIndex]?.id ??
    sameRowNextPanes[closingRowIndex - 1]?.id ??
    panesAfterClose[0]?.id ??
    null
  );
}

export function ensureInitializedWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  route: WorkspacePaneRouteState,
  ids: IdFactories
) {
  if (state.initialized && state.panes.length > 0) {
    return syncActivePaneRouteInWorkspacePaneState(state, route);
  }

  const rowId = ids.createRowId();
  const paneId = ids.createPaneId();
  return {
    activePaneId: paneId,
    initialized: true,
    panes: [{ id: paneId, route, rowId, size: 100 }],
    rows: [{ id: rowId, size: 100 }],
  } satisfies WorkspacePaneStorePersistedState;
}

export function focusWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  paneId: string
) {
  if (!state.panes.some((pane) => pane.id === paneId)) {
    return state;
  }

  return {
    ...state,
    activePaneId: paneId,
  } satisfies WorkspacePaneStorePersistedState;
}

export function openWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  href: string,
  options:
    | {
        sourcePaneId?: string;
        splitDirection?: WorkspacePaneSplitDirection;
        splitPlacement?: "after" | "before";
      }
    | undefined,
  ids: IdFactories
) {
  const sourcePane =
    (options?.sourcePaneId
      ? state.panes.find((pane) => pane.id === options.sourcePaneId)
      : null) ??
    state.panes.find((pane) => pane.id === state.activePaneId) ??
    state.panes.at(-1) ??
    null;

  const splitPlacement = options?.splitPlacement ?? "after";
  const sourceRowId =
    sourcePane?.rowId ?? state.rows[0]?.id ?? ids.createRowId();
  const splitDirection = options?.splitDirection ?? "horizontal";
  const nextPaneId = ids.createPaneId();
  const nextRowId =
    splitDirection === "vertical" ? ids.createRowId() : sourceRowId;
  const nextPane: WorkspacePaneRecord = {
    id: nextPaneId,
    route: buildRouteState(href),
    rowId: nextRowId,
    size: 100,
  };

  const nextPanes = [...state.panes];
  const nextRows = [...state.rows];
  const sourceRowPanes = nextPanes.filter((pane) => pane.rowId === sourceRowId);
  const sourceRowFirstIndex = sourceRowPanes[0]
    ? nextPanes.findIndex((pane) => pane.id === sourceRowPanes[0]?.id)
    : -1;
  const sourceRowLastIndex = sourceRowPanes.at(-1)
    ? nextPanes.findIndex((pane) => pane.id === sourceRowPanes.at(-1)?.id)
    : -1;
  const sourcePaneIndex = sourcePane
    ? nextPanes.findIndex((pane) => pane.id === sourcePane.id)
    : nextPanes.length - 1;
  const insertIndex =
    splitDirection === "vertical"
      ? splitPlacement === "after"
        ? (sourceRowLastIndex >= 0 ? sourceRowLastIndex : sourcePaneIndex) + 1
        : sourceRowFirstIndex >= 0
          ? sourceRowFirstIndex
          : nextPanes.length
      : sourcePaneIndex >= 0
        ? sourcePaneIndex + (splitPlacement === "after" ? 1 : 0)
        : nextPanes.length;

  nextPanes.splice(insertIndex, 0, nextPane);

  return sanitizeWorkspacePaneState({
    activePaneId: nextPane.id,
    initialized: true,
    panes: nextPanes,
    rows:
      splitDirection === "vertical"
        ? insertRowRelativeToSource(
            nextRows.length > 0 ? nextRows : [{ id: sourceRowId, size: 100 }],
            sourceRowId,
            { id: nextRowId, size: 100 },
            splitPlacement
          )
        : nextRows.length > 0
          ? nextRows
          : [{ id: nextPane.rowId, size: 100 }],
  });
}

export function moveWorkspacePaneToSplitState(
  state: WorkspacePaneStorePersistedState,
  draggedPaneId: string,
  targetPaneId: string,
  options: {
    splitDirection: WorkspacePaneSplitDirection;
    splitPlacement?: "after" | "before";
  },
  ids?: Pick<IdFactories, "createRowId">
) {
  const draggedPane = state.panes.find((pane) => pane.id === draggedPaneId);
  const targetPane = state.panes.find((pane) => pane.id === targetPaneId);

  if (!(draggedPane && targetPane) || draggedPane.id === targetPane.id) {
    return state;
  }

  const splitPlacement = options.splitPlacement ?? "after";
  const splitDirection = options.splitDirection ?? "horizontal";
  const nextPanes = state.panes.filter((pane) => pane.id !== draggedPaneId);
  const nextRows = [...state.rows];

  if (splitDirection === "vertical") {
    const nextRowId = ids?.createRowId?.() ?? `${draggedPane.id}-row`;
    const retargetedPane = {
      ...draggedPane,
      rowId: nextRowId,
    };

    const targetRowPanes = nextPanes.filter(
      (pane) => pane.rowId === targetPane.rowId
    );
    const targetRowFirstIndex = targetRowPanes[0]
      ? nextPanes.findIndex((pane) => pane.id === targetRowPanes[0]?.id)
      : -1;
    const targetRowLastIndex = targetRowPanes.at(-1)
      ? nextPanes.findIndex((pane) => pane.id === targetRowPanes.at(-1)?.id)
      : -1;

    nextPanes.splice(
      splitPlacement === "after"
        ? (targetRowLastIndex >= 0
            ? targetRowLastIndex
            : nextPanes.length - 1) + 1
        : targetRowFirstIndex >= 0
          ? targetRowFirstIndex
          : nextPanes.length,
      0,
      retargetedPane
    );

    return sanitizeWorkspacePaneState({
      activePaneId: draggedPane.id,
      initialized: true,
      panes: nextPanes,
      rows: insertRowRelativeToSource(
        nextRows.length > 0 ? nextRows : [{ id: targetPane.rowId, size: 100 }],
        targetPane.rowId,
        { id: nextRowId, size: 100 },
        splitPlacement
      ),
    });
  }

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

  return sanitizeWorkspacePaneState({
    activePaneId: draggedPane.id,
    initialized: true,
    panes: nextPanes,
    rows: nextRows,
  });
}

export function closeWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  paneId: string
) {
  if (state.panes.length <= 1) {
    return state;
  }

  const closingPane = state.panes.find((pane) => pane.id === paneId);
  if (!closingPane) {
    return state;
  }

  const nextPanes = state.panes.filter((pane) => pane.id !== paneId);

  return sanitizeWorkspacePaneState({
    activePaneId: findNextActivePaneId(
      state.panes,
      nextPanes,
      closingPane,
      state.activePaneId
    ),
    initialized: true,
    panes: nextPanes,
    rows: state.rows,
  });
}

export function reorderWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  draggedPaneId: string,
  targetPaneId: string
) {
  const draggedIndex = state.panes.findIndex(
    (pane) => pane.id === draggedPaneId
  );
  const targetIndex = state.panes.findIndex((pane) => pane.id === targetPaneId);

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return state;
  }

  const draggedPane = state.panes[draggedIndex];
  const targetPane = state.panes[targetIndex];
  if (!(draggedPane && targetPane)) {
    return state;
  }

  const nextPanes = [...state.panes];
  nextPanes.splice(draggedIndex, 1);
  const insertionIndex = nextPanes.findIndex(
    (pane) => pane.id === targetPaneId
  );
  nextPanes.splice(insertionIndex < 0 ? nextPanes.length : insertionIndex, 0, {
    ...draggedPane,
    rowId: targetPane.rowId,
  });

  return sanitizeWorkspacePaneState({
    activePaneId: state.activePaneId,
    initialized: true,
    panes: nextPanes,
    rows: state.rows,
  });
}

export function setPaneRouteInWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  paneId: string,
  route: WorkspacePaneRouteState
) {
  return {
    ...state,
    activePaneId: paneId,
    panes: state.panes.map((pane) =>
      pane.id === paneId ? { ...pane, route } : pane
    ),
  } satisfies WorkspacePaneStorePersistedState;
}

export function setPaneSizesInWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  rowId: string,
  sizes: number[]
) {
  return {
    ...state,
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
  } satisfies WorkspacePaneStorePersistedState;
}

export function setRowSizesInWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  sizes: number[]
) {
  return {
    ...state,
    rows: normalizeRows(
      state.rows.map((row, index) => ({
        ...row,
        size: sizes[index] ?? row.size,
      }))
    ),
  } satisfies WorkspacePaneStorePersistedState;
}

export function syncActivePaneRouteInWorkspacePaneState(
  state: WorkspacePaneStorePersistedState,
  route: WorkspacePaneRouteState
) {
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
    ...state,
    activePaneId,
    panes: state.panes.map((pane) =>
      pane.id === activePaneId ? { ...pane, route } : pane
    ),
  } satisfies WorkspacePaneStorePersistedState;
}
