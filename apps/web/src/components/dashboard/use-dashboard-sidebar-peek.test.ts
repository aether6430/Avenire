import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SIDEBAR_PEEK_CLOSE_DELAY_MS,
  resolveDashboardSidebarPeekCloseDelayMs,
  resolveDashboardSidebarPeekHovered,
} from "./use-dashboard-sidebar-peek";

describe("resolveDashboardSidebarPeekHovered", () => {
  it("keeps the collapsed peek sidebar open until the delayed close handoff runs", () => {
    expect(
      resolveDashboardSidebarPeekHovered({
        action: "close",
        current: true,
        state: "collapsed",
      })
    ).toBe(true);
    expect(resolveDashboardSidebarPeekCloseDelayMs("collapsed")).toBe(
      DASHBOARD_SIDEBAR_PEEK_CLOSE_DELAY_MS
    );
  });

  it("does not change peek state for expanded sidebar", () => {
    expect(
      resolveDashboardSidebarPeekHovered({
        action: "close",
        current: true,
        state: "expanded",
      })
    ).toBe(true);
    expect(resolveDashboardSidebarPeekCloseDelayMs("expanded")).toBe(0);
  });
});
