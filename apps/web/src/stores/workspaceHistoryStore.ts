"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { useCurrentWorkspacePane } from "@/lib/workspace-panes";
import {
  getPaneHistoryState,
  type PaneWorkspaceHistoryState,
  recordPaneWorkspaceRoute,
} from "@/stores/workspace-history-model";

interface WorkspaceHistoryState {
  byPane: Record<string, PaneWorkspaceHistoryState>;
  recordRoute: (paneId: string, route: string) => void;
}

export const useWorkspaceHistoryStore = create<WorkspaceHistoryState>()(
  (set) => ({
    byPane: {},
    recordRoute: (paneId, route) =>
      set((state) => recordPaneWorkspaceRoute(state, paneId, route)),
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
