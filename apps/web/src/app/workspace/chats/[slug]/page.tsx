import { Suspense } from "react";
import type { Metadata } from "next";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { buildPageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = buildPageMetadata({
  noIndex: true,
  title: "Method",
});

export default function WorkspaceChatSlugPage() {
  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading method..." />}>
      <WorkspaceChatRoutePageClient />
    </Suspense>
  );
}
