export function getPasskeysStateMessage(input: {
  errorMessage?: string | null;
  loadFailed: boolean;
  loading: boolean;
  passkeyCount: number;
}) {
  if (input.loading && input.passkeyCount === 0) {
    return "Loading passkeys...";
  }

  if (input.loadFailed && input.passkeyCount === 0) {
    return input.errorMessage?.trim() || "Unable to load passkeys.";
  }

  if (input.passkeyCount === 0) {
    return "No passkeys registered.";
  }

  return null;
}
