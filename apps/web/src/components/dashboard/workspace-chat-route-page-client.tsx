"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import {
  CHAT_STREAM_STATUS_EVENT,
  type ChatStreamStatusDetail,
} from "@/lib/chat-events";
import { usePanePathname } from "@/lib/workspace-panes";

interface ChatRoutePayload {
  chat?: {
    icon?: string | null;
    readOnly?: boolean | null;
    slug: string;
    title: string;
  } | null;
  messages?: UIMessage[];
}

const activeChatStreams = new Set<string>();

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

export function WorkspaceChatRoutePageClient({
  slug: slugProp,
}: {
  slug?: string;
}) {
  const pathname = usePanePathname();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const slug =
    slugProp ?? pathname.match(/^\/workspace\/chats\/([^/?#]+)/)?.[1] ?? "new";
  const [hasActiveStream, setHasActiveStream] = useState(() =>
    activeChatStreams.has(slug)
  );
  const chatQuery = useQuery({
    enabled:
      status === "ready" &&
      Boolean(user?.id && workspace?.workspaceId) &&
      slug !== "new",
    queryFn: ({ signal }) => loadChatRoute(slug, signal),
    queryKey: ["workspace-chat-route", workspace?.workspaceId ?? null, slug],
  });

  useEffect(() => {
    setHasActiveStream(activeChatStreams.has(slug));
  }, [slug]);

  useEffect(() => {
    const onChatStreamStatus = (event: Event) => {
      const detail = (event as CustomEvent<ChatStreamStatusDetail>).detail;
      if (!detail?.chatId) {
        return;
      }

      if (detail.status === "submitted" || detail.status === "streaming") {
        activeChatStreams.add(detail.chatId);
      } else if (detail.status === "ready" || detail.status === "error") {
        activeChatStreams.delete(detail.chatId);
      }

      if (detail.chatId === slug) {
        setHasActiveStream(activeChatStreams.has(slug));
      }
    };

    window.addEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    return () => {
      window.removeEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    };
  }, [slug]);

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

  if ((chatQuery.isPending || chatQuery.data === null) && hasActiveStream) {
    return (
      <ChatWorkspace
        chatIcon={null}
        chatSlug={slug}
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
      userName={user.name ?? undefined}
      workspaceUuid={workspace.workspaceId}
    />
  );
}
