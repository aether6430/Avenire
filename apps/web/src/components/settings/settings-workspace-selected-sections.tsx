"use client";

import { SettingsWorkspaceMembersSection } from "@/components/settings/settings-workspace-members-section";
import type { SettingsWorkspaceSelectedSectionsProps } from "@/components/settings/settings-workspace-selected-sections-types";
import { SettingsWorkspaceStatsSection } from "@/components/settings/settings-workspace-stats-section";

export function SettingsWorkspaceSelectedSections(
  props: SettingsWorkspaceSelectedSectionsProps
) {
  return (
    <>
      <SettingsWorkspaceStatsSection
        workspaceUsage={props.workspaceUsage}
        workspaceUsageLoadFailed={props.workspaceUsageLoadFailed}
        workspaceUsageLoading={props.workspaceUsageLoading}
        workspaceUsageStatus={props.workspaceUsageStatus}
      />
      <SettingsWorkspaceMembersSection
        currentUserEmail={props.currentUserEmail}
        inviteWorkspaceMember={props.inviteWorkspaceMember}
        isInvitingMember={props.isInvitingMember}
        privacyMode={props.privacyMode}
        removeWorkspaceMember={props.removeWorkspaceMember}
        selectedWorkspaceMemberCount={props.selectedWorkspaceMemberCount}
        setWorkspaceEmail={props.setWorkspaceEmail}
        workspaceEmail={props.workspaceEmail}
        workspaceMembers={props.workspaceMembers}
        workspaceMembersErrorMessage={props.workspaceMembersErrorMessage}
        workspaceMembersLoadFailed={props.workspaceMembersLoadFailed}
        workspaceMembersLoading={props.workspaceMembersLoading}
        workspaceStatus={props.workspaceStatus}
      />
    </>
  );
}
