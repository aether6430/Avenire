"use client";

import { useSearchParams } from "next/navigation";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

export function WorkspaceChatNewPageClient({
  allowPrompt = false,
}: {
  allowPrompt?: boolean;
}) {
  const searchParams = useSearchParams();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const initialPrompt = allowPrompt
    ? searchParams.get("prompt")?.trim() || null
    : null;

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading method..." />;
  }

  return (
    <ChatWorkspace
      chatIcon={null}
      chatSlug="new"
      chatTitle="New Method"
      initialMessages={[]}
      initialPrompt={initialPrompt}
      isReadonly={false}
      userName={user.name ?? undefined}
      workspaceUuid={workspace.workspaceId}
    />
  );
}
