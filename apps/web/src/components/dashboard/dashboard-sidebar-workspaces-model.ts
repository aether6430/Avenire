export function shouldSyncActiveOrganization(input: {
  activeOrganizationId?: string | null;
  targetOrganizationId?: string | null;
}) {
  const activeOrganizationId = input.activeOrganizationId?.trim() ?? "";
  const targetOrganizationId = input.targetOrganizationId?.trim() ?? "";

  if (!targetOrganizationId) {
    return false;
  }

  return activeOrganizationId !== targetOrganizationId;
}

export function getSidebarWorkspaceListState(input: {
  activeWorkspaceLabel: string;
  errorMessage?: string | null;
  loadFailed: boolean;
  loading: boolean;
  workspaceCount: number;
}) {
  if (input.loading && input.workspaceCount === 0) {
    return {
      emptyMessage: "Loading workspaces...",
      subtitle: "Loading workspaces...",
    };
  }

  if (input.loadFailed && input.workspaceCount === 0) {
    return {
      emptyMessage: input.errorMessage?.trim() || "Unable to load workspaces.",
      subtitle: input.errorMessage?.trim() || "Unable to load workspaces.",
    };
  }

  if (input.workspaceCount === 0) {
    return {
      emptyMessage: "No workspaces yet.",
      subtitle: "No workspaces yet.",
    };
  }

  return {
    emptyMessage: null,
    subtitle: input.activeWorkspaceLabel,
  };
}

export function getSidebarInvitationsState(input: {
  errorMessage?: string | null;
  invitationCount: number;
  loadFailed: boolean;
  loading: boolean;
}) {
  if (input.loading && input.invitationCount === 0) {
    return {
      emptyMessage: "Loading invites...",
      subtitle: "Loading invites...",
    };
  }

  if (input.loadFailed && input.invitationCount === 0) {
    return {
      emptyMessage: input.errorMessage?.trim() || "Unable to load invites.",
      subtitle: input.errorMessage?.trim() || "Unable to load invites.",
    };
  }

  return {
    emptyMessage: input.invitationCount === 0 ? "No pending invites" : null,
    subtitle: `${input.invitationCount} pending`,
  };
}
