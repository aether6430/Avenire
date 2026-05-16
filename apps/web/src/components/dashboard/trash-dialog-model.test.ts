import { describe, expect, it } from "vitest";
import { getTrashDialogStateLabels } from "./trash-dialog-model";

describe("trash dialog model", () => {
  it("keeps loading, load-failed, empty, and ready trash states distinct", () => {
    expect(
      getTrashDialogStateLabels({
        itemCount: 0,
        loadFailed: false,
        loading: true,
        totalSizeBytes: 0,
      })
    ).toEqual({
      bodyMessage: "Loading trash...",
      showSpinner: true,
      summaryLabel: "Loading items...",
      totalSizeLabel: "Loading...",
    });

    expect(
      getTrashDialogStateLabels({
        itemCount: 0,
        loadFailed: true,
        loading: false,
        totalSizeBytes: 0,
      })
    ).toEqual({
      bodyMessage: "Unable to load trash.",
      showSpinner: false,
      summaryLabel: "Unable to load items",
      totalSizeLabel: "Unavailable",
    });

    expect(
      getTrashDialogStateLabels({
        itemCount: 0,
        loadFailed: false,
        loading: false,
        totalSizeBytes: 0,
      })
    ).toEqual({
      bodyMessage: "Trash is empty.",
      showSpinner: false,
      summaryLabel: "No deleted items",
      totalSizeLabel: "0 MB",
    });

    expect(
      getTrashDialogStateLabels({
        itemCount: 2,
        loadFailed: false,
        loading: false,
        totalSizeBytes: 5 * 1024 * 1024,
      })
    ).toEqual({
      bodyMessage: null,
      showSpinner: false,
      summaryLabel: "2 items",
      totalSizeLabel: "5.00 MB",
    });
  });
});
