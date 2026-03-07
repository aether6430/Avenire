"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type DashboardView = "chat" | "flashcards" | "files" | null

type DashboardViewStore = {
  view: DashboardView
  setView: (view: DashboardView) => void
  resetView: () => void
}

export const useDashboardViewStore = create<DashboardViewStore>()(
  persist(
    (set) => ({
      view: null,
      setView: (view) => set({ view }),
      resetView: () => set({ view: null }),
    }),
    {
      name: "dashboard-view",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ view: state.view }),
    }
  )
)
