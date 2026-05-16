export function getDashboardTaskManagerState(input: {
  loadFailed: boolean;
  loading: boolean;
  visibleTaskCount: number;
}) {
  if (input.loading) {
    return {
      description: null,
      showSpinner: true,
      title: "Loading tasks...",
    };
  }

  if (input.loadFailed && input.visibleTaskCount === 0) {
    return {
      description: "Try again in a moment or refresh the workspace.",
      showSpinner: false,
      title: "Unable to load tasks.",
    };
  }

  if (input.visibleTaskCount === 0) {
    return {
      description:
        "Capture a task with a due date of today and it will show up here with quick edit and completion controls.",
      showSpinner: false,
      title: "No tasks due today",
    };
  }

  return null;
}
