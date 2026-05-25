export function getRemotePreferencesState(input: {
  errorMessage?: string | null;
  loadFailed: boolean;
  loading: boolean;
}) {
  if (input.loading) {
    return {
      message: "Loading preferences...",
      ready: false,
    };
  }

  if (input.loadFailed) {
    return {
      message: input.errorMessage?.trim() || "Unable to load preferences.",
      ready: false,
    };
  }

  return {
    message: null,
    ready: true,
  };
}
