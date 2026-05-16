export function getWorkspaceShareMembersStateMessage(input: {
  loading: boolean;
  loadFailed: boolean;
  memberCount: number;
}) {
  if (input.loading) {
    return "Loading workspace members...";
  }

  if (input.loadFailed && input.memberCount === 0) {
    return "Unable to load workspace members.";
  }

  if (input.memberCount === 0) {
    return "No members found for this workspace yet.";
  }

  return null;
}
