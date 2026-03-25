"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type DashboardHomeTab = "tasks" | "activity";
export type DashboardInsightsTab =
  | "weak-points"
  | "misconceptions"
  | "upcoming";

interface DashboardUiState {
  homeTab: DashboardHomeTab;
  insightsTab: DashboardInsightsTab;
}

const INITIAL_STATE: DashboardUiState = {
  homeTab: "tasks",
  insightsTab: "weak-points",
};

export const useDashboardUiStore = create<DashboardUiState>()(
  persist(() => INITIAL_STATE, {
    name: "dashboard-ui",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      homeTab: state.homeTab,
      insightsTab: state.insightsTab,
    }),
    skipHydration: true,
  })
);

export const dashboardUiActions = {
  setHomeTab: (homeTab: DashboardHomeTab) =>
    useDashboardUiStore.setState({ homeTab }),
  setInsightsTab: (insightsTab: DashboardInsightsTab) =>
    useDashboardUiStore.setState({ insightsTab }),
  reset: () => useDashboardUiStore.setState({ ...INITIAL_STATE }),
};
