import type { WorkspaceMember } from "@/components/settings/use-settings-panel";

export interface WorkspaceUsageLike {
  fileCount: number;
  folderCount: number;
  indexedFileCount: number;
  pendingIngestionCount: number;
  totalSizeBytes: number;
}

export interface WorkspaceSummaryLike {
  name: string;
}

export interface SettingsWorkspaceSelectedSectionsProps {
  currentUserEmail: string | null;
  inviteWorkspaceMember: () => Promise<void>;
  isInvitingMember: boolean;
  privacyMode: boolean;
  removeWorkspaceMember: (memberIdOrEmail: string) => Promise<void>;
  selectedWorkspace: WorkspaceSummaryLike;
  selectedWorkspaceMemberCount: number;
  setWorkspaceEmail: (email: string) => void;
  workspaceEmail: string;
  workspaceMembers: WorkspaceMember[];
  workspaceMembersErrorMessage: string | null;
  workspaceMembersLoadFailed: boolean;
  workspaceMembersLoading: boolean;
  workspaceStatus: string | null;
  workspaceUsage: WorkspaceUsageLike | null;
  workspaceUsageLoadFailed: boolean;
  workspaceUsageLoading: boolean;
  workspaceUsageStatus: string | null;
}
