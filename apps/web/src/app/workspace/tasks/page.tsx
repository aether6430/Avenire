import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Tasks",
});

export default function WorkspaceTasksPage() {
  return <WorkspaceTasksPageClient />;
}
