import type { Metadata } from "next";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = buildPageMetadata({
  noIndex: true,
  title: "Method",
});

export default function WorkspaceChatSlugPage() {
  return <WorkspaceChatRoutePageClient />;
}
