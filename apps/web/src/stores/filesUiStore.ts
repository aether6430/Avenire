"use client";

import { create } from "zustand";

export type FilesUiIntent =
  | "focusSearch"
  | "newNote"
  | "uploadFile"
  | "uploadFolder"
  | "createFolder"
  | "openSelection"
  | "deleteSelection"
  | "moveSelectionUp"
  | "goParent";

type FilesUiIntentVersion = Record<FilesUiIntent, number>;

const INITIAL_INTENT_VERSION: FilesUiIntentVersion = {
  focusSearch: 0,
  newNote: 0,
  uploadFile: 0,
  uploadFolder: 0,
  createFolder: 0,
  openSelection: 0,
  deleteSelection: 0,
  moveSelectionUp: 0,
  goParent: 0,
};

interface FilesUiState {
  intentVersion: FilesUiIntentVersion;
  sync: {
    version: number;
    workspaceUuid: string | null;
  };
  uploadActivityOpen: boolean;
}

export const useFilesUiStore = create<FilesUiState>()(() => ({
  intentVersion: INITIAL_INTENT_VERSION,
  sync: {
    version: 0,
    workspaceUuid: null,
  },
  uploadActivityOpen: false,
}));

export const filesUiActions = {
  emitIntent: (intent: FilesUiIntent) =>
    useFilesUiStore.setState((state) => ({
      intentVersion: {
        ...state.intentVersion,
        [intent]: state.intentVersion[intent] + 1,
      },
    })),
  emitSync: (workspaceUuid?: string | null) =>
    useFilesUiStore.setState((state) => ({
      sync: {
        version: state.sync.version + 1,
        workspaceUuid: workspaceUuid ?? null,
      },
    })),
  setUploadActivityOpen: (open: boolean) =>
    useFilesUiStore.setState({ uploadActivityOpen: open }),
  toggleUploadActivityOpen: () =>
    useFilesUiStore.setState((state) => ({
      uploadActivityOpen: !state.uploadActivityOpen,
    })),
};
