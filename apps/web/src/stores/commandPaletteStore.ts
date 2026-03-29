"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CommandPaletteFolderNode {
  id: string;
  name: string;
  parentId: string | null;
  readOnly?: boolean;
}

export interface CommandPaletteFileNode {
  folderId: string;
  id: string;
  name: string;
  readOnly?: boolean;
}

interface CommandPaletteState {
  files: CommandPaletteFileNode[];
  folders: CommandPaletteFolderNode[];
  open: boolean;
  recentFileIdsByWorkspace: Record<string, string[]>;
  workspaceUuid: string | null;
}

const INITIAL_STATE: CommandPaletteState = {
  files: [],
  folders: [],
  open: false,
  recentFileIdsByWorkspace: {},
  workspaceUuid: null,
};

const RECENT_FILES_LIMIT = 8;

export const useCommandPaletteStore = create<CommandPaletteState>()(
  persist(
    () => ({
      ...INITIAL_STATE,
    }),
    {
      name: "command-palette",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentFileIdsByWorkspace: state.recentFileIdsByWorkspace,
      }),
      skipHydration: true,
    }
  )
);

export const commandPaletteActions = {
  open: () =>
    useCommandPaletteStore.setState({
      open: true,
    }),
  setFileIndex: (
    next: Pick<CommandPaletteState, "workspaceUuid" | "folders" | "files">
  ) =>
    useCommandPaletteStore.setState((state) => ({
      ...state,
      workspaceUuid: next.workspaceUuid,
      folders: next.folders,
      files: next.files,
    })),
  recordRecentFile: (workspaceId: string, fileId: string) =>
    useCommandPaletteStore.setState((state) => {
      const currentIds = state.recentFileIdsByWorkspace[workspaceId] ?? [];
      const nextIds = [
        fileId,
        ...currentIds.filter((id) => id !== fileId),
      ].slice(0, RECENT_FILES_LIMIT);
      return {
        recentFileIdsByWorkspace: {
          ...state.recentFileIdsByWorkspace,
          [workspaceId]: nextIds,
        },
      };
    }),
  close: () =>
    useCommandPaletteStore.setState({
      open: false,
    }),
  reset: () => useCommandPaletteStore.setState({ ...INITIAL_STATE }),
};
