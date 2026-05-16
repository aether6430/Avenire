import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardHomeColumns } from "@/components/dashboard/dashboard-home-panels";

describe("DashboardHomeColumns", () => {
  it("renders an explicit activity failure state instead of falling through to an empty feed", () => {
    const html = renderToStaticMarkup(
      <DashboardHomeColumns
        activeMisconceptions={[]}
        activities={[]}
        activityLoadFailed
        currentUserId="user-1"
        DashboardTaskManager={() => <div>tasks</div>}
        flashcardSets={[]}
        homeTab="activity"
        insightsTab="weak-points"
        loadingActivities={false}
        onHomeTabChange={() => {}}
        onInsightsTabChange={() => {}}
        onSelectMisconception={() => {}}
        onStartReview={() => {}}
        weakestDrillTarget={null}
        weakPointGroups={[]}
        workspaceId="workspace-1"
      />
    );

    expect(html).toContain("Unable to load activity.");
    expect(html).not.toContain("No recent activity.");
  });
});
