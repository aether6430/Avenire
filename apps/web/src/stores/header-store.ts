import type { ReactNode } from "react";
import { create } from "zustand";

interface HeaderState {
  actions: ReactNode | null;
  breadcrumbs: ReactNode | null;
  leadingIcon: ReactNode | null;
  title: string | null;
  setHeaderContext: (context: {
    actions?: ReactNode | null;
    breadcrumbs?: ReactNode | null;
    leadingIcon?: ReactNode | null;
    title?: string | null;
  }) => void;
  resetHeaderContext: () => void;
}

function applyHeaderTitle(title: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  document.title = title?.trim() ? `${title.trim()} - Avenire` : "Avenire";
}

export const useHeaderStore = create<HeaderState>((set) => ({
  actions: null,
  breadcrumbs: null,
  leadingIcon: null,
  title: null,
  setHeaderContext: (context) =>
    set((state) => {
      const nextTitle =
        context.title !== undefined ? context.title : state.title;
      applyHeaderTitle(nextTitle ?? null);
      return {
        actions: context.actions !== undefined ? context.actions : state.actions,
        breadcrumbs:
          context.breadcrumbs !== undefined
            ? context.breadcrumbs
            : state.breadcrumbs,
        leadingIcon:
          context.leadingIcon !== undefined
            ? context.leadingIcon
            : state.leadingIcon,
        title: nextTitle,
      };
    }),
  resetHeaderContext: () =>
    set(() => {
      applyHeaderTitle(null);
      return { actions: null, breadcrumbs: null, leadingIcon: null, title: null };
    }),
}));
