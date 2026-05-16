export function getSidebarTaskPreviewState(input: {
  loadFailed: boolean;
  visibleTaskCount: number;
}) {
  if (input.loadFailed && input.visibleTaskCount === 0) {
    return {
      message: "Unable to load tasks.",
      showSections: false,
    };
  }

  return {
    message: null,
    showSections: true,
  };
}
