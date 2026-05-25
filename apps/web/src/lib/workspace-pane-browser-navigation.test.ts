import { afterEach, describe, expect, it } from "vitest";
import {
  consumePendingWorkspaceBrowserNavigation,
  markPendingWorkspaceBrowserNavigation,
  resetPendingWorkspaceBrowserNavigationForTest,
  shouldDeferWorkspacePaneBrowserReplace,
  shouldLetBrowserRouteDrivePaneSync,
  shouldSkipInitialHydratedWorkspacePaneSync,
} from "@/lib/workspace-pane-browser-navigation";

describe("workspace pane browser navigation", () => {
  afterEach(() => {
    resetPendingWorkspaceBrowserNavigationForTest();
  });

  it("defers pane-sync replace while a matching browser navigation is still in flight", () => {
    markPendingWorkspaceBrowserNavigation("/workspace/files?file=file-1");

    expect(
      shouldDeferWorkspacePaneBrowserReplace({
        browserHref: "/workspace/files",
        nextHref: "/workspace/files?file=file-1",
      })
    ).toBe(true);
  });

  it("consumes the pending marker once the browser catches up to the target href", () => {
    markPendingWorkspaceBrowserNavigation("/workspace/files?file=file-1");

    expect(
      consumePendingWorkspaceBrowserNavigation("/workspace/files?file=file-1")
    ).toBe(true);

    expect(
      shouldDeferWorkspacePaneBrowserReplace({
        browserHref: "/workspace/files",
        nextHref: "/workspace/files?file=file-1",
      })
    ).toBe(false);
  });

  it("lets direct browser routes initialize the active pane before pane sync replaces the URL", () => {
    expect(
      shouldLetBrowserRouteDrivePaneSync({
        browserHref: "/workspace/files?file=file-1",
        nextHref: "/workspace",
        previousBrowserHref: null,
      })
    ).toBe(true);
  });

  it("lets back-forward browser route changes drive pane sync", () => {
    expect(
      shouldLetBrowserRouteDrivePaneSync({
        browserHref: "/workspace/tasks",
        nextHref: "/workspace/files",
        previousBrowserHref: "/workspace/files",
      })
    ).toBe(true);
  });

  it("keeps pane focus changes able to update an unchanged browser URL", () => {
    expect(
      shouldLetBrowserRouteDrivePaneSync({
        browserHref: "/workspace/files",
        nextHref: "/workspace/tasks",
        previousBrowserHref: "/workspace/files",
      })
    ).toBe(false);
  });

  it("lets hydrated persisted panes own the first browser-sync pass", () => {
    expect(
      shouldSkipInitialHydratedWorkspacePaneSync({
        hasHandledInitialHydratedRoute: false,
        paneCount: 2,
      })
    ).toBe(true);

    expect(
      shouldSkipInitialHydratedWorkspacePaneSync({
        hasHandledInitialHydratedRoute: true,
        paneCount: 2,
      })
    ).toBe(false);

    expect(
      shouldSkipInitialHydratedWorkspacePaneSync({
        hasHandledInitialHydratedRoute: false,
        paneCount: 0,
      })
    ).toBe(false);
  });
});
