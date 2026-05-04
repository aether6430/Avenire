"use client";

import { create } from "zustand";

export interface DashboardOverviewStats {
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
}

interface DashboardOverviewStore {
  clearStats: () => void;
  setStats: (stats: DashboardOverviewStats) => void;
  stats: DashboardOverviewStats | null;
}

export const useDashboardOverviewStore = create<DashboardOverviewStore>()(
  (set) => ({
    stats: null,
    setStats: (stats) => set({ stats }),
    clearStats: () => set({ stats: null }),
  })
);
