export function getRemotePreferencesState(input: {
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
      message: "Unable to load preferences.",
      ready: false,
    };
  }

  return {
    message: null,
    ready: true,
  };
}
