export interface PaneWorkspaceHistoryState {
  entries: string[];
  index: number;
}

export interface WorkspaceHistorySnapshot {
  byPane: Record<string, PaneWorkspaceHistoryState>;
}

export const EMPTY_WORKSPACE_HISTORY_STATE: PaneWorkspaceHistoryState = {
  entries: [],
  index: -1,
};

export function getPaneHistoryState(
  state: WorkspaceHistorySnapshot,
  paneId: string
) {
  return state.byPane[paneId] ?? EMPTY_WORKSPACE_HISTORY_STATE;
}

export function recordPaneWorkspaceRoute(
  state: WorkspaceHistorySnapshot,
  paneId: string,
  route: string
) {
  if (!route) {
    return state;
  }

  const paneState = getPaneHistoryState(state, paneId);
  if (paneState.index >= 0 && paneState.entries[paneState.index] === route) {
    return state;
  }

  if (paneState.index > 0 && paneState.entries[paneState.index - 1] === route) {
    return {
      byPane: {
        ...state.byPane,
        [paneId]: {
          entries: paneState.entries,
          index: paneState.index - 1,
        },
      },
    } satisfies WorkspaceHistorySnapshot;
  }

  if (
    paneState.index >= 0 &&
    paneState.index < paneState.entries.length - 1 &&
    paneState.entries[paneState.index + 1] === route
  ) {
    return {
      byPane: {
        ...state.byPane,
        [paneId]: {
          entries: paneState.entries,
          index: paneState.index + 1,
        },
      },
    } satisfies WorkspaceHistorySnapshot;
  }

  const nextEntries = [
    ...paneState.entries.slice(0, paneState.index + 1),
    route,
  ];
  return {
    byPane: {
      ...state.byPane,
      [paneId]: {
        entries: nextEntries,
        index: nextEntries.length - 1,
      },
    },
  } satisfies WorkspaceHistorySnapshot;
}
