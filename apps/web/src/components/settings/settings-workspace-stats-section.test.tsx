import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsWorkspaceStatsSection } from "@/components/settings/settings-workspace-stats-section";

describe("SettingsWorkspaceStatsSection", () => {
  it("renders explicit loading and unavailable usage states", () => {
    const loadingHtml = renderToStaticMarkup(
      <SettingsWorkspaceStatsSection
        workspaceUsage={null}
        workspaceUsageLoadFailed={false}
        workspaceUsageLoading
        workspaceUsageStatus="Loading workspace stats..."
      />
    );
    expect(loadingHtml).toContain("Loading workspace stats...");
    expect(loadingHtml).toContain("Loading...");

    const failedHtml = renderToStaticMarkup(
      <SettingsWorkspaceStatsSection
        workspaceUsage={null}
        workspaceUsageLoadFailed
        workspaceUsageLoading={false}
        workspaceUsageStatus="Unable to load workspace stats."
      />
    );
    expect(failedHtml).toContain("Unable to load workspace stats.");
    expect(failedHtml.match(/Unavailable/g)?.length).toBe(4);
  });

  it("renders loaded workspace totals and pending ingestion copy", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceStatsSection
        workspaceUsage={{
          fileCount: 42,
          folderCount: 7,
          indexedFileCount: 19,
          memberCount: 5,
          pendingIngestionCount: 3,
          totalSizeBytes: 2048,
        }}
        workspaceUsageLoadFailed={false}
        workspaceUsageLoading={false}
        workspaceUsageStatus={null}
      />
    );

    expect(html).toContain("Storage Used");
    expect(html).toContain("Files");
    expect(html).toContain("Folders");
    expect(html).toContain("Indexed");
    expect(html).toContain("2.0 KB");
    expect(html).toContain("42");
    expect(html).toContain("7");
    expect(html).toContain("19");
    expect(html).toContain("3 pending ingestion");
  });
});
