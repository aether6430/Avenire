export function getWorkspaceMembersStateMessage(input: {
  errorMessage?: string | null;
  loading: boolean;
  loadFailed: boolean;
  memberCount: number;
}) {
  if (input.loading && input.memberCount === 0) {
    return "Loading workspace members...";
  }

  if (input.loadFailed && input.memberCount === 0) {
    return input.errorMessage?.trim() || "Unable to load workspace members.";
  }

  if (input.memberCount === 0) {
    return "No members found.";
  }

  return null;
}

export function getWorkspaceListStateMessage(input: {
  errorMessage?: string | null;
  loading: boolean;
  loadFailed: boolean;
  workspaceCount: number;
}) {
  if (input.loading && input.workspaceCount === 0) {
    return "Loading workspaces...";
  }

  if (input.loadFailed && input.workspaceCount === 0) {
    return input.errorMessage?.trim() || "Unable to load workspaces.";
  }

  if (input.workspaceCount === 0) {
    return "No workspaces yet.";
  }

  return null;
}

export function getWorkspaceUsageValueState(input: {
  loading: boolean;
  loadFailed: boolean;
  readyLabel: string;
}) {
  if (input.loading) {
    return {
      label: "Loading...",
      showSpinner: true,
    };
  }

  if (input.loadFailed) {
    return {
      label: "Unavailable",
      showSpinner: false,
    };
  }

  return {
    label: input.readyLabel,
    showSpinner: false,
  };
}
