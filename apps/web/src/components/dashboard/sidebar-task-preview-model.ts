export function getSidebarTaskPreviewState(input: {
  errorMessage?: string | null;
  loadFailed: boolean;
  visibleTaskCount: number;
}) {
  if (input.loadFailed && input.visibleTaskCount === 0) {
    return {
      message: input.errorMessage?.trim() || "Unable to load tasks.",
      showSections: false,
    };
  }

  return {
    message: null,
    showSections: true,
  };
}
