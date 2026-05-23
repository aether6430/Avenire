import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardHomeColumns } from "@/components/dashboard/dashboard-home-panels";

describe("DashboardHomeColumns", () => {
  it("renders an explicit activity failure state instead of falling through to an empty feed", () => {
    const html = renderToStaticMarkup(
      <DashboardHomeColumns
        activeMisconceptions={[]}
        activities={[]}
        activityErrorMessage="activity backend offline"
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

    expect(html).toContain("activity backend offline");
    expect(html).not.toContain("No recent activity.");
  });

  it("renders explicit empty states for weak concepts and upcoming mindset review", () => {
    const weakPointsHtml = renderToStaticMarkup(
      <DashboardHomeColumns
        activeMisconceptions={[]}
        activities={[]}
        activityErrorMessage={null}
        activityLoadFailed={false}
        currentUserId="user-1"
        DashboardTaskManager={() => <div>tasks</div>}
        flashcardSets={[]}
        homeTab="tasks"
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

    const upcomingHtml = renderToStaticMarkup(
      <DashboardHomeColumns
        activeMisconceptions={[]}
        activities={[]}
        activityErrorMessage={null}
        activityLoadFailed={false}
        currentUserId="user-1"
        DashboardTaskManager={() => <div>tasks</div>}
        flashcardSets={[]}
        homeTab="tasks"
        insightsTab="upcoming"
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

    expect(weakPointsHtml).toContain("No recent concepts yet");
    expect(upcomingHtml).toContain("Nothing is waiting right now.");
  });
});
