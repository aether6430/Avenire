import { Suspense } from "react";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Tasks",
});

export default function WorkspaceTasksPage() {
  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading tasks..." />}>
      <WorkspaceTasksPageClient />
    </Suspense>
  );
}
