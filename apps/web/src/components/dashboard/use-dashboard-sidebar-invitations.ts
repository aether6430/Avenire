"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  DashboardSidebarInvitation,
  DashboardSidebarWorkspaceSummary,
} from "@/components/dashboard/dashboard-sidebar-runtime-model";

export function useDashboardSidebarInvitations({
  deferredStartupReady,
  loadWorkspaces,
  setActiveOrganizationIfNeeded,
  setWorkspaceActionStatus,
  switchWorkspace,
}: {
  deferredStartupReady: boolean;
  loadWorkspaces: () => Promise<void>;
  setActiveOrganizationIfNeeded: (
    organizationId?: string | null
  ) => Promise<void>;
  setWorkspaceActionStatus: (
    value: string | null | ((current: string | null) => string | null)
  ) => void;
  switchWorkspace: (
    workspace: DashboardSidebarWorkspaceSummary
  ) => Promise<void>;
}) {
  const [invitations, setInvitations] = useState<DashboardSidebarInvitation[]>(
    []
  );
  const [invitationsLoadFailed, setInvitationsLoadFailed] = useState(false);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  const loadInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    setInvitationsLoadFailed(false);
    try {
      const response = await fetch("/api/workspaces/invitations", {
        cache: "no-store",
      });
      if (!response.ok) {
        setInvitations([]);
        setInvitationsLoadFailed(true);
        return;
      }
      const payload = (await response.json()) as {
        invitations?: DashboardSidebarInvitation[];
      };
      setInvitations(payload.invitations ?? []);
      setInvitationsLoadFailed(false);
    } catch {
      setInvitations([]);
      setInvitationsLoadFailed(true);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!deferredStartupReady) {
      return;
    }
    void loadInvitations();
  }, [deferredStartupReady, loadInvitations]);

  const respondToInvitation = useCallback(
    async (invitationId: string, action: "accept" | "decline") => {
      setWorkspaceActionStatus(null);
      const response = await fetch(
        `/api/workspaces/invitations/${invitationId}`,
        {
          body: JSON.stringify({ action }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      if (!response.ok) {
        setWorkspaceActionStatus(
          action === "accept"
            ? "Unable to accept invite."
            : "Unable to decline invite."
        );
        return;
      }

      const payload = (await response.json()) as {
        organizationId?: string | null;
        workspace?: DashboardSidebarWorkspaceSummary | null;
      };

      await loadInvitations();

      if (action === "accept") {
        if (payload.organizationId) {
          try {
            await setActiveOrganizationIfNeeded(payload.organizationId);
          } catch {
            setWorkspaceActionStatus("Unable to accept invite.");
            return;
          }
        }
        await loadWorkspaces();
        if (payload.workspace) {
          await switchWorkspace(payload.workspace);
        }
      }
      setWorkspaceActionStatus(null);
    },
    [
      loadInvitations,
      loadWorkspaces,
      setActiveOrganizationIfNeeded,
      setWorkspaceActionStatus,
      switchWorkspace,
    ]
  );

  return {
    invitations,
    invitationsLoadFailed,
    invitationsLoading,
    loadInvitations,
    respondToInvitation,
  };
}
