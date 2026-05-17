"use client";

import type { ChatWorkspaceProps } from "@/components/dashboard/chat-workspace-model";
import { ChatWorkspaceSurface } from "@/components/dashboard/chat-workspace-surface";
import { useChatWorkspace } from "@/components/dashboard/use-chat-workspace";

export function ChatWorkspace(props: ChatWorkspaceProps) {
  const runtime = useChatWorkspace(props);

  return <ChatWorkspaceSurface runtime={runtime} />;
}
