export function getTrashDialogStateLabels(input: {
  itemCount: number;
  loadFailed: boolean;
  loading: boolean;
  totalSizeBytes: number;
}) {
  if (input.loading) {
    return {
      bodyMessage: "Loading trash...",
      showSpinner: true,
      summaryLabel: "Loading items...",
      totalSizeLabel: "Loading...",
    };
  }

  if (input.loadFailed) {
    return {
      bodyMessage: "Unable to load trash.",
      showSpinner: false,
      summaryLabel: "Unable to load items",
      totalSizeLabel: "Unavailable",
    };
  }

  if (input.itemCount === 0) {
    return {
      bodyMessage: "Trash is empty.",
      showSpinner: false,
      summaryLabel: "No deleted items",
      totalSizeLabel: "0 MB",
    };
  }

  return {
    bodyMessage: null,
    showSpinner: false,
    summaryLabel: `${input.itemCount} item${input.itemCount === 1 ? "" : "s"}`,
    totalSizeLabel:
      input.totalSizeBytes > 0
        ? `${(input.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : "0 MB",
  };
}
