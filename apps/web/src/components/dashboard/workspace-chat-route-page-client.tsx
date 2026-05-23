"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import { shouldRenderStreamingChatRouteFallback } from "@/components/dashboard/chat-workspace-model";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import {
  CHAT_STREAM_STATUS_EVENT,
  type ChatStreamStatusDetail,
  isChatStreamActive,
  rememberChatStreamStatus,
} from "@/lib/chat-events";
import { usePanePathname, usePaneRouter } from "@/lib/workspace-panes";
import { useChatMessageHandoffStore } from "@/stores/chat-message-handoff-store";

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
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(payload.error?.trim() || "Unable to load Method.");
  }

  return (await response.json()) as ChatRoutePayload;
}

export function WorkspaceChatRoutePageClient({
  slug: slugProp,
}: {
  slug?: string;
}) {
  const pathname = usePanePathname();
  const router = usePaneRouter();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const isLegacyEmptyChatRoute =
    pathname === "/workspace/chats" && slugProp === undefined;
  const slug =
    slugProp ?? pathname.match(/^\/workspace\/chats\/([^/?#]+)/)?.[1] ?? "new";
  const handoffMessages = useChatMessageHandoffStore(
    (state) => state.messagesByChatId[slug] ?? null
  );
  const [streamingChatIds, setStreamingChatIds] = useState<Set<string>>(() =>
    isChatStreamActive(slug) ? new Set([slug]) : new Set()
  );
  const isSlugStreaming = streamingChatIds.has(slug);

  useEffect(() => {
    if (isLegacyEmptyChatRoute) {
      router.replace("/workspace/chats/new");
    }
  }, [isLegacyEmptyChatRoute, router]);

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

  useEffect(() => {
    if (chatQuery.data === null && !isSlugStreaming) {
      router.replace("/workspace/chats/new");
    }
  }, [chatQuery.data, isSlugStreaming, router]);

  if (status === "error") {
    return (
      <WorkspaceRoutePlaceholder
        label="Unable to load Method."
        pending={false}
      />
    );
  }

  if (status === "ready" && user && !workspace) {
    return (
      <WorkspaceRoutePlaceholder
        label="Create a workspace to continue."
        pending={false}
      />
    );
  }

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading Method..." />;
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

  if (chatQuery.isError) {
    return (
      <WorkspaceRoutePlaceholder
        label={
          chatQuery.error instanceof Error
            ? chatQuery.error.message
            : "Unable to load Method."
        }
        pending={false}
      />
    );
  }

  if (chatQuery.isPending || !chatQuery.data?.chat) {
    if (
      shouldRenderStreamingChatRouteFallback({
        handoffMessageCount: handoffMessages?.length ?? 0,
        hasChat: Boolean(chatQuery.data?.chat),
        isError: chatQuery.isError,
        isPending: chatQuery.isPending,
        isStreaming: isSlugStreaming,
        slug,
      })
    ) {
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

    return <WorkspaceRoutePlaceholder label="Loading Method..." />;
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
