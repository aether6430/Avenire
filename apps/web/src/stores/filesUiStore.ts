"use client";

import { create } from "zustand";

export type FilesUiIntent =
  | "focusSearch"
  | "newNote"
  | "importLink"
  | "uploadFile"
  | "uploadFolder"
  | "createFolder"
  | "openSelection"
  | "deleteSelection"
  | "moveSelectionUp"
  | "goParent"
  | "undoMutation"
  | "redoMutation";

type FilesUiIntentVersion = Record<FilesUiIntent, number>;

const INITIAL_INTENT_VERSION: FilesUiIntentVersion = {
  focusSearch: 0,
  newNote: 0,
  importLink: 0,
  uploadFile: 0,
  uploadFolder: 0,
  createFolder: 0,
  openSelection: 0,
  deleteSelection: 0,
  moveSelectionUp: 0,
  goParent: 0,
  undoMutation: 0,
  redoMutation: 0,
};

interface FilesUiState {
  consumedIntentVersion: FilesUiIntentVersion;
  intentVersion: FilesUiIntentVersion;
  sync: {
    version: number;
    workspaceUuid: string | null;
  };
  uploadActivityOpen: boolean;
}

export const useFilesUiStore = create<FilesUiState>()(() => ({
  consumedIntentVersion: INITIAL_INTENT_VERSION,
  intentVersion: INITIAL_INTENT_VERSION,
  sync: {
    version: 0,
    workspaceUuid: null,
  },
  uploadActivityOpen: false,
}));

export const filesUiActions = {
  consumeIntent: (intent: FilesUiIntent, version: number) =>
    useFilesUiStore.setState((state) => {
      if (state.consumedIntentVersion[intent] >= version) {
        return state;
      }
      return {
        consumedIntentVersion: {
          ...state.consumedIntentVersion,
          [intent]: version,
        },
      };
    }),
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
