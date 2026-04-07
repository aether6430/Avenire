import { WorkspaceChatNewPageClient } from "@/components/dashboard/workspace-chat-new-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "New Method",
});

export default function WorkspaceChatsNewPage() {
  return <WorkspaceChatNewPageClient allowPrompt />;
}
