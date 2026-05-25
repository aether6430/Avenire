"use client";

import { create } from "zustand";
import type { CaptureKind } from "@/components/dashboard/quick-capture-model";

interface QuickCaptureState {
  kind: CaptureKind | null;
}

const INITIAL_STATE: QuickCaptureState = {
  kind: null,
};

export const useQuickCaptureStore = create<QuickCaptureState>()(() => ({
  ...INITIAL_STATE,
}));

export const quickCaptureActions = {
  open: (kind: CaptureKind) =>
    useQuickCaptureStore.setState({
      kind,
    }),
  close: () => useQuickCaptureStore.setState({ ...INITIAL_STATE }),
};
