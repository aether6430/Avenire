import type { Route } from "next";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import { buildPageMetadata } from "@/lib/page-metadata";
import { requireWorkspaceRouteContext } from "@/lib/workspace-route-context";

export const metadata = buildPageMetadata({
  title: "Tasks",
});

export default async function DashboardTasksPage() {
  const { session, workspace } = await requireWorkspaceRouteContext(
    "/workspace" as Route
  );

  return (
    <TasksWorkspace
      currentUserId={session.user.id}
      workspaceId={workspace.workspaceId}
    />
  );
}
