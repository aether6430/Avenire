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

export interface NoteTemplateLike {
  bannerUrl: string | null;
  content: string;
  id: string;
  name: string;
}

export interface SettingsWorkspaceSelectedSectionsProps {
  currentUserEmail: string | null;
  inviteWorkspaceMember: () => Promise<void>;
  isInvitingMember: boolean;
  noteTemplates: NoteTemplateLike[];
  openNoteTemplateEditor: (template: NoteTemplateLike | null) => void;
  privacyMode: boolean;
  removeWorkspaceMember: (memberIdOrEmail: string) => Promise<void>;
  selectedWorkspace: WorkspaceSummaryLike;
  selectedWorkspaceMemberCount: number;
  setNoteTemplates: (
    updater: (current: NoteTemplateLike[]) => NoteTemplateLike[]
  ) => void;
  setWorkspaceEmail: (email: string) => void;
  workspaceEmail: string;
  workspaceMembers: WorkspaceMember[];
  workspaceMembersLoadFailed: boolean;
  workspaceMembersLoading: boolean;
  workspaceStatus: string | null;
  workspaceUsage: WorkspaceUsageLike | null;
  workspaceUsageLoadFailed: boolean;
  workspaceUsageLoading: boolean;
  workspaceUsageStatus: string | null;
}
