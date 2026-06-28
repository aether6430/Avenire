"use client";

import { create } from "zustand";

export interface PendingToolApproval {
  chatId: string;
  id: string;
  input: unknown;
  respond: (approved: boolean) => void;
  toolCallId: string;
  toolType: string;
  workspaceUuid: string;
}

interface ToolApprovalState {
  approvals: Record<string, PendingToolApproval>;
  register: (approval: PendingToolApproval) => void;
  respond: (id: string, approved: boolean) => void;
  unregister: (id: string) => void;
}

export const useToolApprovalStore = create<ToolApprovalState>()((set, get) => ({
  approvals: {},
  register: (approval) => {
    set((state) => ({
      approvals: {
        ...state.approvals,
        [approval.id]: approval,
      },
    }));
  },
  respond: (id, approved) => {
    const approval = get().approvals[id];
    if (!approval) {
      return;
    }
    approval.respond(approved);
    set((state) => {
      const { [id]: _removed, ...remaining } = state.approvals;
      return { approvals: remaining };
    });
  },
  unregister: (id) => {
    set((state) => {
      const { [id]: _removed, ...remaining } = state.approvals;
      return { approvals: remaining };
    });
  },
}));
