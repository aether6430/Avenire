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

export interface CommandPaletteWorkspaceIndex {
  files: CommandPaletteFileNode[];
  folders: CommandPaletteFolderNode[];
  rootFolderId?: string | null;
  workspaceName?: string;
}

interface CommandPaletteState {
  fileIndexByWorkspace: Record<string, CommandPaletteWorkspaceIndex>;
  open: boolean;
  recentFileIdsByWorkspace: Record<string, string[]>;
  workspaceUuid: string | null;
}

const INITIAL_STATE: CommandPaletteState = {
  fileIndexByWorkspace: {},
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
    next: {
      files: CommandPaletteFileNode[];
      folders: CommandPaletteFolderNode[];
      rootFolderId?: string | null;
      workspaceName?: string;
      workspaceUuid: string | null;
    }
  ) =>
    useCommandPaletteStore.setState((state) => ({
      ...state,
      workspaceUuid: next.workspaceUuid,
      fileIndexByWorkspace:
        next.workspaceUuid
          ? {
              ...state.fileIndexByWorkspace,
              [next.workspaceUuid]: {
                files: next.files,
                folders: next.folders,
                rootFolderId: next.rootFolderId ?? null,
                workspaceName: next.workspaceName,
              },
            }
          : state.fileIndexByWorkspace,
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
