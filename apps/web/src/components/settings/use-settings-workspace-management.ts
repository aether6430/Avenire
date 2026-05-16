"use client";

import type {
  TabKey,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import { useSettingsWorkspaceDirectory } from "@/components/settings/use-settings-workspace-directory";
import { useSettingsWorkspaceIcon } from "@/components/settings/use-settings-workspace-icon";
import { useSettingsWorkspaceMembers } from "@/components/settings/use-settings-workspace-members";
import { useSettingsWorkspaceUsage } from "@/components/settings/use-settings-workspace-usage";

export function useSettingsWorkspaceManagement({
  currentTab,
  initialWorkspaceId,
  initialWorkspaces,
  refreshSudoStatus,
  requestSudoForAction,
}: {
  currentTab: TabKey;
  initialWorkspaceId?: string;
  initialWorkspaces?: WorkspaceSummary[];
  refreshSudoStatus: () => Promise<void>;
  requestSudoForAction: (
    actionLabel: string,
    action: () => Promise<void>
  ) => void;
}) {
  const directory = useSettingsWorkspaceDirectory({
    currentTab,
    initialWorkspaceId,
    initialWorkspaces,
    refreshSudoStatus,
    requestSudoForAction,
  });
  const {
    activeWorkspaceId,
    createWorkspace,
    isCreatingWorkspace,
    refreshWorkspaces,
    runDeleteWorkspace,
    selectedWorkspace,
    selectedWorkspaceInitial,
    setActiveWorkspaceId,
    setIsCreatingWorkspace,
    setWorkspaceDeleteConfirm,
    setWorkspaceName,
    setWorkspaceStatus,
    workspaceDeleteConfirm,
    workspaceName,
    workspaceStatus,
    workspaces,
    workspacesLoadFailed,
    workspacesLoading,
  } = directory;
  const usage = useSettingsWorkspaceUsage({
    activeWorkspaceId,
    currentTab,
    refreshSudoStatus,
  });
  const members = useSettingsWorkspaceMembers({
    activeWorkspaceId,
    currentTab,
    refreshWorkspaceUsage: usage.refreshWorkspaceUsage,
    selectedWorkspace,
    setWorkspaceStatus,
  });
  const icon = useSettingsWorkspaceIcon({
    refreshWorkspaces,
    selectedWorkspace,
  });
  const selectedWorkspaceMemberCount =
    usage.workspaceUsage?.memberCount ?? members.workspaceMembers.length;

  return {
    activeWorkspaceId,
    createWorkspace,
    handleWorkspaceIconFileChange: icon.handleWorkspaceIconFileChange,
    inviteWorkspaceMember: members.inviteWorkspaceMember,
    isCreatingWorkspace,
    isInvitingMember: members.isInvitingMember,
    refreshMembers: members.refreshMembers,
    refreshWorkspaces,
    refreshWorkspaceUsage: usage.refreshWorkspaceUsage,
    removeWorkspaceMember: members.removeWorkspaceMember,
    runDeleteWorkspace,
    saveWorkspaceIcon: icon.saveWorkspaceIcon,
    selectedWorkspace,
    selectedWorkspaceInitial,
    selectedWorkspaceMemberCount,
    setActiveWorkspaceId,
    setIsCreatingWorkspace,
    setWorkspaceDeleteConfirm,
    setWorkspaceEmail: members.setWorkspaceEmail,
    setWorkspaceIconDraft: icon.setWorkspaceIconDraft,
    setWorkspaceName,
    setWorkspaceStatus,
    workspaceDeleteConfirm,
    workspaceEmail: members.workspaceEmail,
    workspaceIconDraft: icon.workspaceIconDraft,
    workspaceIconInputRef: icon.workspaceIconInputRef,
    workspaceIconStatus: icon.workspaceIconStatus,
    workspaceIconUploading: icon.workspaceIconUploading,
    workspaceMembers: members.workspaceMembers,
    workspaceMembersLoadFailed: members.workspaceMembersLoadFailed,
    workspaceMembersLoading: members.workspaceMembersLoading,
    workspaceName,
    workspaceStatus,
    workspaceUsage: usage.workspaceUsage,
    workspaceUsageLoadFailed: usage.workspaceUsageLoadFailed,
    workspaceUsageLoading: usage.workspaceUsageLoading,
    workspaceUsageStatus: usage.workspaceUsageStatus,
    workspaces,
    workspacesLoadFailed,
    workspacesLoading,
  };
}
