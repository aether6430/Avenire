"use client";

import { create } from "zustand";

export type DashboardOverviewStats = {
  activeSets: number;
  chats: number;
  due: number;
  newCards: number;
  notes: number;
  recentChats: Array<{ id: string; slug: string; title: string }>;
  recentFiles: Array<{
    id: string;
    folderId: string;
    isNote: boolean;
    name: string;
    workspaceId: string;
  }>;
};

type DashboardOverviewStore = {
  stats: DashboardOverviewStats | null;
  setStats: (stats: DashboardOverviewStats) => void;
  clearStats: () => void;
};

export const useDashboardOverviewStore = create<DashboardOverviewStore>()(
  (set) => ({
    stats: null,
    setStats: (stats) => set({ stats }),
    clearStats: () => set({ stats: null }),
  })
);
