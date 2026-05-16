export function getTaskAssigneeEmptyStateMessage(input: {
  loading: boolean;
  loadFailed: boolean;
}) {
  if (input.loading) {
    return "Loading workspace members...";
  }

  if (input.loadFailed) {
    return "Unable to load workspace members.";
  }

  return "No workspace member matches that search.";
}

export function getTaskResourceEmptyStateMessage(input: {
  loading: boolean;
  loadFailed: boolean;
}) {
  if (input.loading) {
    return "Loading resources...";
  }

  if (input.loadFailed) {
    return "Unable to load task resources.";
  }

  return "No resources match that search.";
}
