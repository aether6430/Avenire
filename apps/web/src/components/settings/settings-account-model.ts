export function getConnectedAccountsStateMessage(input: {
  accountCount: number;
  errorMessage?: string | null;
  loadFailed: boolean;
  loading: boolean;
}) {
  if (input.loading && input.accountCount === 0) {
    return "Loading linked accounts...";
  }

  if (input.loadFailed && input.accountCount === 0) {
    return input.errorMessage?.trim() || "Unable to load linked accounts.";
  }

  if (input.accountCount === 0) {
    return "No linked accounts yet.";
  }

  return null;
}
