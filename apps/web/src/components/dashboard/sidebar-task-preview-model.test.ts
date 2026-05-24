import { describe, expect, it } from "vitest";
import { getSidebarTaskPreviewState } from "./sidebar-task-preview";

describe("sidebar task preview model", () => {
  it("keeps sidebar task preview load failure distinct from an empty due/upcoming state", () => {
    expect(
      getSidebarTaskPreviewState({
        errorMessage: "Could not load tasks right now.",
        loadFailed: true,
        visibleTaskCount: 0,
      })
    ).toEqual({
      message: "Could not load tasks right now.",
      showSections: false,
    });

    expect(
      getSidebarTaskPreviewState({
        loadFailed: false,
        visibleTaskCount: 0,
      })
    ).toEqual({
      message: null,
      showSections: true,
    });

    expect(
      getSidebarTaskPreviewState({
        loadFailed: false,
        visibleTaskCount: 3,
      })
    ).toEqual({
      message: null,
      showSections: true,
    });
  });
});
