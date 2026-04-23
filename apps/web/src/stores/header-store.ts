"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { create } from "zustand";
import { useCurrentWorkspacePane } from "@/lib/workspace-panes";

interface PaneHeaderState {
  actions: ReactNode | null;
  breadcrumbs: ReactNode | null;
  leadingIcon: ReactNode | null;
  title: string | null;
}

interface HeaderState {
  activePaneId: string | null;
  byPane: Record<string, PaneHeaderState>;
  resetHeaderContext: (paneId: string) => void;
  setActions: (paneId: string, actions: ReactNode | null) => void;
  setActivePaneId: (paneId: string | null) => void;
  setBreadcrumbs: (paneId: string, breadcrumbs: ReactNode | null) => void;
  setHeaderContext: (
    paneId: string,
    context: {
      actions?: ReactNode | null;
      breadcrumbs?: ReactNode | null;
      leadingIcon?: ReactNode | null;
      title?: string | null;
    }
  ) => void;
  setLeadingIcon: (paneId: string, leadingIcon: ReactNode | null) => void;
  setTitle: (paneId: string, title: string | null) => void;
}

const EMPTY_HEADER_STATE: PaneHeaderState = {
  actions: null,
  breadcrumbs: null,
  leadingIcon: null,
  title: null,
};

function getPaneState(state: HeaderState, paneId: string) {
  return state.byPane[paneId] ?? EMPTY_HEADER_STATE;
}

function applyHeaderTitle(title: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  document.title = title?.trim() ? `${title.trim()} - Avenire` : "Avenire";
}

export const useHeaderStore = create<HeaderState>((set, get) => ({
  activePaneId: null,
  byPane: {},
  resetHeaderContext: (paneId) =>
    set((state) => {
      const nextByPane = {
        ...state.byPane,
        [paneId]: EMPTY_HEADER_STATE,
      };
      if (state.activePaneId === paneId) {
        applyHeaderTitle(null);
      }
      return { byPane: nextByPane };
    }),
  setActions: (paneId, actions) =>
    set((state) => ({
      byPane: {
        ...state.byPane,
        [paneId]: {
          ...getPaneState(state, paneId),
          actions,
        },
      },
    })),
  setActivePaneId: (paneId) =>
    set((state) => {
      const title = paneId ? getPaneState(state, paneId).title : null;
      applyHeaderTitle(title ?? null);
      return { activePaneId: paneId };
    }),
  setBreadcrumbs: (paneId, breadcrumbs) =>
    set((state) => ({
      byPane: {
        ...state.byPane,
        [paneId]: {
          ...getPaneState(state, paneId),
          breadcrumbs,
        },
      },
    })),
  setHeaderContext: (paneId, context) =>
    set((state) => {
      const current = getPaneState(state, paneId);
      const nextState = {
        actions: context.actions !== undefined ? context.actions : current.actions,
        breadcrumbs:
          context.breadcrumbs !== undefined
            ? context.breadcrumbs
            : current.breadcrumbs,
        leadingIcon:
          context.leadingIcon !== undefined
            ? context.leadingIcon
            : current.leadingIcon,
        title: context.title !== undefined ? context.title : current.title,
      };

      if (state.activePaneId === paneId) {
        applyHeaderTitle(nextState.title ?? null);
      }

      return {
        byPane: {
          ...state.byPane,
          [paneId]: nextState,
        },
      };
    }),
  setLeadingIcon: (paneId, leadingIcon) =>
    set((state) => ({
      byPane: {
        ...state.byPane,
        [paneId]: {
          ...getPaneState(state, paneId),
          leadingIcon,
        },
      },
    })),
  setTitle: (paneId, title) =>
    set((state) => {
      if (state.activePaneId === paneId) {
        applyHeaderTitle(title);
      }

      return {
        byPane: {
          ...state.byPane,
          [paneId]: {
            ...getPaneState(state, paneId),
            title,
          },
        },
      };
    }),
}));

export function usePaneHeaderStore<T>(
  selector: (state: PaneHeaderState) => T
) {
  const { paneId } = useCurrentWorkspacePane();
  return useHeaderStore(
    useCallback((state) => selector(getPaneState(state, paneId)), [paneId, selector])
  );
}

export function usePaneHeaderActions() {
  const { paneId } = useCurrentWorkspacePane();
  const setActions = useHeaderStore((state) => state.setActions);
  const setBreadcrumbs = useHeaderStore((state) => state.setBreadcrumbs);
  const setLeadingIcon = useHeaderStore((state) => state.setLeadingIcon);
  const setTitle = useHeaderStore((state) => state.setTitle);
  const setHeaderContext = useHeaderStore((state) => state.setHeaderContext);
  const resetHeaderContext = useHeaderStore((state) => state.resetHeaderContext);

  return {
    resetHeaderContext: () => resetHeaderContext(paneId),
    setActions: (actions: ReactNode | null) => setActions(paneId, actions),
    setBreadcrumbs: (breadcrumbs: ReactNode | null) =>
      setBreadcrumbs(paneId, breadcrumbs),
    setHeaderContext: (context: {
      actions?: ReactNode | null;
      breadcrumbs?: ReactNode | null;
      leadingIcon?: ReactNode | null;
      title?: string | null;
    }) => setHeaderContext(paneId, context),
    setLeadingIcon: (leadingIcon: ReactNode | null) =>
      setLeadingIcon(paneId, leadingIcon),
    setTitle: (title: string | null) => setTitle(paneId, title),
  };
}
