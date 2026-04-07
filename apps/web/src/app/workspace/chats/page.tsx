import { Suspense } from "react";
import { WorkspaceChatNewPageClient } from "@/components/dashboard/workspace-chat-new-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Chats",
});

export default function WorkspaceChatsPage() {
  return (
    <Suspense fallback={<WorkspaceRoutePlaceholder label="Loading method..." />}>
      <WorkspaceChatNewPageClient />
    </Suspense>
  );
}
