"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

interface ChatRoutePayload {
  chat?: {
    icon?: string | null;
    readOnly?: boolean | null;
    slug: string;
    title: string;
  } | null;
  messages?: UIMessage[];
}

async function loadChatRoute(slug: string, signal?: AbortSignal) {
  const response = await fetch(`/api/chats/${slug}`, {
    cache: "no-store",
    signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load chat.");
  }

  return (await response.json()) as ChatRoutePayload;
}

export function WorkspaceChatRoutePageClient() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const slug = typeof params.slug === "string" ? params.slug : "new";
  const chatQuery = useQuery({
    enabled:
      status === "ready" && Boolean(user?.id && workspace?.workspaceId) && slug !== "new",
    queryFn: ({ signal }) => loadChatRoute(slug, signal),
    queryKey: ["workspace-chat-route", workspace?.workspaceId ?? null, slug],
  });

  useEffect(() => {
    if (chatQuery.data === null) {
      router.replace("/workspace/chats");
    }
  }, [chatQuery.data, router]);

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading method..." />;
  }

  if (slug === "new") {
    return (
      <ChatWorkspace
        chatIcon={null}
        chatSlug="new"
        chatTitle="New Method"
        initialMessages={[]}
        initialPrompt={null}
        isReadonly={false}
        userName={user.name ?? undefined}
        workspaceUuid={workspace.workspaceId}
      />
    );
  }

  if (chatQuery.isPending || !chatQuery.data?.chat) {
    return <WorkspaceRoutePlaceholder label="Loading method..." />;
  }

  return (
    <ChatWorkspace
      chatIcon={chatQuery.data.chat.icon ?? null}
      chatSlug={chatQuery.data.chat.slug}
      chatTitle={chatQuery.data.chat.title}
      initialMessages={chatQuery.data.messages ?? []}
      initialPrompt={null}
      isReadonly={Boolean(chatQuery.data.chat.readOnly)}
      key={`${chatQuery.data.chat.slug}:${(chatQuery.data.messages ?? []).length}`}
      userName={user.name ?? undefined}
      workspaceUuid={workspace.workspaceId}
    />
  );
}
