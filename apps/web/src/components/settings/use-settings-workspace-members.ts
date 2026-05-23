"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TabKey,
  WorkspaceMember,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import {
  inviteWorkspaceMemberByEmail,
  loadWorkspaceMembers,
  removeWorkspaceMemberById,
} from "@/components/settings/settings-workspace-client";

export function useSettingsWorkspaceMembers({
  activeWorkspaceId,
  currentTab,
  refreshWorkspaceUsage,
  selectedWorkspace,
  setWorkspaceStatus,
}: {
  activeWorkspaceId: string;
  currentTab: TabKey;
  refreshWorkspaceUsage: (
    workspaceId: string,
    showLoading?: boolean
  ) => Promise<void>;
  selectedWorkspace: WorkspaceSummary | null;
  setWorkspaceStatus: (value: string | null) => void;
}) {
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(
    []
  );
  const [workspaceMembersErrorMessage, setWorkspaceMembersErrorMessage] =
    useState<string | null>(null);
  const [workspaceMembersLoadFailed, setWorkspaceMembersLoadFailed] =
    useState(false);
  const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState(false);
  const [workspaceEmail, setWorkspaceEmail] = useState("");
  const [isInvitingMember, setIsInvitingMember] = useState(false);

  const refreshMembers = useCallback(async (workspaceId: string) => {
    setWorkspaceMembersLoading(true);
    setWorkspaceMembersLoadFailed(false);
    setWorkspaceMembersErrorMessage(null);
    try {
      setWorkspaceMembers(await loadWorkspaceMembers(workspaceId));
      setWorkspaceMembersErrorMessage(null);
      setWorkspaceMembersLoadFailed(false);
    } catch (error) {
      setWorkspaceMembers([]);
      setWorkspaceMembersErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to load workspace members."
      );
      setWorkspaceMembersLoadFailed(true);
    } finally {
      setWorkspaceMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!(currentTab === "workspace" && activeWorkspaceId)) {
      return;
    }

    void refreshMembers(activeWorkspaceId);
  }, [activeWorkspaceId, currentTab, refreshMembers]);

  const removeWorkspaceMember = async (memberIdOrEmail: string) => {
    if (!selectedWorkspace) {
      return;
    }

    try {
      await removeWorkspaceMemberById({
        memberIdOrEmail,
        workspaceId: selectedWorkspace.workspaceId,
      });
      setWorkspaceStatus("Member removed.");
      await refreshMembers(selectedWorkspace.workspaceId);
      await refreshWorkspaceUsage(selectedWorkspace.workspaceId);
    } catch (error) {
      setWorkspaceStatus(
        error instanceof Error ? error.message : "Unable to remove member."
      );
    }
  };

  const inviteWorkspaceMember = async () => {
    if (!selectedWorkspace) {
      return;
    }

    setIsInvitingMember(true);
    try {
      await inviteWorkspaceMemberByEmail({
        email: workspaceEmail.trim(),
        workspaceId: selectedWorkspace.workspaceId,
      });
      setWorkspaceStatus("Member added.");
      setWorkspaceEmail("");
      await refreshMembers(selectedWorkspace.workspaceId);
      await refreshWorkspaceUsage(selectedWorkspace.workspaceId);
    } catch (error) {
      setWorkspaceStatus(
        error instanceof Error ? error.message : "Unable to add member."
      );
    } finally {
      setIsInvitingMember(false);
    }
  };

  return {
    inviteWorkspaceMember,
    isInvitingMember,
    refreshMembers,
    removeWorkspaceMember,
    setWorkspaceEmail,
    workspaceEmail,
    workspaceMembers,
    workspaceMembersErrorMessage,
    workspaceMembersLoadFailed,
    workspaceMembersLoading,
  };
}
