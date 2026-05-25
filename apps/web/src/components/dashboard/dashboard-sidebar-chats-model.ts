export function getSidebarChatListState(input: {
  errorMessage?: string | null;
  loadFailed: boolean;
  loading: boolean;
  otherCount: number;
  pinnedCount: number;
}) {
  const totalCount = input.pinnedCount + input.otherCount;

  if (input.loading && totalCount === 0) {
    return {
      description: "Pinned and recent methods will appear here shortly.",
      title: "Loading methods...",
    };
  }

  if (input.loadFailed && totalCount === 0) {
    return {
      description:
        input.errorMessage?.trim() ||
        "Try again in a moment to reload your recent methods.",
      title: "Unable to load methods.",
    };
  }

  if (totalCount === 0) {
    return {
      description: "Start a method to see it here.",
      title: "No methods yet",
    };
  }

  return null;
}
