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
  isChatStreamActive,
  rememberChatStreamStatus,
} from "@/lib/chat-events";
import { usePanePathname, usePaneSearchParams } from "@/lib/workspace-panes";

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

export function WorkspaceChatRoutePageClient({
  slug: slugProp,
}: {
  slug?: string;
}) {
  const pathname = usePanePathname();
  const searchParams = usePaneSearchParams();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const slug =
    slugProp ?? pathname.match(/^\/workspace\/chats\/([^/?#]+)/)?.[1] ?? "new";
  const initialPrompt = searchParams.get("prompt")?.trim() || null;
  const newChatInstanceKey =
    slug === "new"
      ? `new:${searchParams.get("fresh") ?? ""}:${initialPrompt ?? ""}`
      : slug;
  const [streamingChatIds, setStreamingChatIds] = useState<Set<string>>(() =>
    isChatStreamActive(slug) ? new Set([slug]) : new Set()
  );
  const isSlugStreaming = streamingChatIds.has(slug);
  const chatQuery = useQuery({
    enabled:
      status === "ready" &&
      Boolean(user?.id && workspace?.workspaceId) &&
      slug !== "new",
    queryFn: ({ signal }) => loadChatRoute(slug, signal),
    queryKey: ["workspace-chat-route", workspace?.workspaceId ?? null, slug],
  });

  useEffect(() => {
    if (!isChatStreamActive(slug)) {
      return;
    }
    setStreamingChatIds((current) => {
      if (current.has(slug)) {
        return current;
      }
      const next = new Set(current);
      next.add(slug);
      return next;
    });
  }, [slug]);

  useEffect(() => {
    const onChatStreamStatus = (event: Event) => {
      const detail = (event as CustomEvent<ChatStreamStatusDetail>).detail;
      if (!detail?.chatId) {
        return;
      }
      rememberChatStreamStatus(detail);

      setStreamingChatIds((current) => {
        const next = new Set(current);
        if (detail.status === "submitted" || detail.status === "streaming") {
          next.add(detail.chatId);
        } else {
          next.delete(detail.chatId);
        }
        return next;
      });
    };

    window.addEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    return () => {
      window.removeEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    };
  }, []);

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading method..." />;
  }

  if (slug === "new") {
    return (
      <ChatWorkspace
        chatIcon={null}
        key={newChatInstanceKey}
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

  if (chatQuery.isPending || chatQuery.data === null) {
    if (!isSlugStreaming) {
      return <WorkspaceRoutePlaceholder label="Loading method..." />;
    }

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

  if (!chatQuery.data?.chat) {
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
