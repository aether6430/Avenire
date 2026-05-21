import { describe, expect, it } from "vitest";
import { resolveDashboardSidebarPeekHovered } from "./use-dashboard-sidebar-peek";

describe("resolveDashboardSidebarPeekHovered", () => {
  it("releases the collapsed peek sidebar immediately on close", () => {
    expect(
      resolveDashboardSidebarPeekHovered({
        action: "close",
        current: true,
        state: "collapsed",
      })
    ).toBe(false);
  });

  it("does not change peek state for expanded sidebar", () => {
    expect(
      resolveDashboardSidebarPeekHovered({
        action: "close",
        current: true,
        state: "expanded",
      })
    ).toBe(true);
  });
});
