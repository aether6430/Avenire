import { Suspense } from "react";
import { WorkspaceCoursesPageClient } from "@/components/courses/workspace-courses-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Courses",
});

export default function WorkspaceCoursesPage() {
  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading Courses" />}>
      <WorkspaceCoursesPageClient />
    </Suspense>
  );
}
