"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { useCurrentWorkspacePane } from "@/lib/workspace-panes";

interface PaneWorkspaceHistoryState {
  entries: string[];
  index: number;
}

interface WorkspaceHistoryState {
  byPane: Record<string, PaneWorkspaceHistoryState>;
  recordRoute: (paneId: string, route: string) => void;
}

const EMPTY_WORKSPACE_HISTORY_STATE: PaneWorkspaceHistoryState = {
  entries: [],
  index: -1,
};

function getPaneHistoryState(state: WorkspaceHistoryState, paneId: string) {
  return state.byPane[paneId] ?? EMPTY_WORKSPACE_HISTORY_STATE;
}

export const useWorkspaceHistoryStore = create<WorkspaceHistoryState>()(
  (set) => ({
    byPane: {},
    recordRoute: (paneId, route) =>
      set((state) => {
        if (!route) {
          return state;
        }

        const paneState = getPaneHistoryState(state, paneId);
        if (
          paneState.index >= 0 &&
          paneState.entries[paneState.index] === route
        ) {
          return state;
        }

        if (
          paneState.index > 0 &&
          paneState.entries[paneState.index - 1] === route
        ) {
          return {
            byPane: {
              ...state.byPane,
              [paneId]: {
                entries: paneState.entries,
                index: paneState.index - 1,
              },
            },
          };
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
          };
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
        };
      }),
  })
);

export function usePaneWorkspaceHistoryStore<T>(
  selector: (state: PaneWorkspaceHistoryState) => T
) {
  const { paneId } = useCurrentWorkspacePane();
  return useWorkspaceHistoryStore(
    useCallback(
      (state) => selector(getPaneHistoryState(state, paneId)),
      [paneId, selector]
    )
  );
}

export function usePaneWorkspaceHistoryActions() {
  const { paneId } = useCurrentWorkspacePane();
  const recordRoute = useWorkspaceHistoryStore((state) => state.recordRoute);

  return {
    recordRoute: (route: string) => recordRoute(paneId, route),
  };
}
