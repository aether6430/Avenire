import { WorkspaceChatNewPageClient } from "@/components/dashboard/workspace-chat-new-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  noIndex: true,
  title: "Chats",
});

export default function WorkspaceChatsPage() {
  return <WorkspaceChatNewPageClient />;
}
