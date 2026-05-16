export function getPasskeysStateMessage(input: {
  loadFailed: boolean;
  loading: boolean;
  passkeyCount: number;
}) {
  if (input.loading && input.passkeyCount === 0) {
    return "Loading passkeys...";
  }

  if (input.loadFailed && input.passkeyCount === 0) {
    return "Unable to load passkeys.";
  }

  if (input.passkeyCount === 0) {
    return "No passkeys registered.";
  }

  return null;
}
