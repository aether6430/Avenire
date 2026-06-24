"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatWorkspace } from "@/components/dashboard/chat-workspace";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { readCachedChatMessages } from "@/lib/chat-message-cache";
import {
  CHAT_STREAM_FINISHED_EVENT,
  CHAT_STREAM_STATUS_EVENT,
  type ChatStreamFinishedDetail,
  type ChatStreamStatusDetail,
  isActiveChatStreamStatus,
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
  const newChatInstanceKey = slug === "new" ? `new:${initialPrompt ?? ""}` : slug;
  const [streamingChatIds, setStreamingChatIds] = useState<Set<string>>(() =>
    isChatStreamActive(slug) ? new Set([slug]) : new Set()
  );
  const [resolvingChatIds, setResolvingChatIds] = useState<Set<string>>(
    () => new Set()
  );
  const [cachedMessages, setCachedMessages] = useState<UIMessage[]>([]);
  const streamingChatIdsRef = useRef(streamingChatIds);
  useEffect(() => {
    streamingChatIdsRef.current = streamingChatIds;
  }, [streamingChatIds]);
  const isSlugStreaming = streamingChatIds.has(slug);
  const isSlugResolving = resolvingChatIds.has(slug);

  useEffect(() => {
    setCachedMessages([]);
    if (slug === "new") {
      return;
    }
    let cancelled = false;
    void readCachedChatMessages(slug).then((messages) => {
      if (!cancelled) {
        setCachedMessages(messages);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);
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
      const wasActive = streamingChatIdsRef.current.has(detail.chatId);
      rememberChatStreamStatus(detail);

      const isActive = isActiveChatStreamStatus(detail.status);
      setStreamingChatIds((current) => {
        const next = new Set(current);
        if (isActive) {
          next.add(detail.chatId);
        } else {
          next.delete(detail.chatId);
        }
        return next;
      });
      setResolvingChatIds((current) => {
        const next = new Set(current);
        if (isActive) {
          next.delete(detail.chatId);
        } else if (wasActive) {
          next.add(detail.chatId);
        }
        return next;
      });
    };

    window.addEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    return () => {
      window.removeEventListener(CHAT_STREAM_STATUS_EVENT, onChatStreamStatus);
    };
  }, []);

  const queryRefetch = chatQuery.refetch;
  useEffect(() => {
    if (slug === "new") {
      return;
    }
    if (!isSlugResolving) {
      return;
    }

    let cancelled = false;
    void queryRefetch().then((result) => {
      if (cancelled || !result.data?.chat) {
        return;
      }
      setResolvingChatIds((current) => {
        if (!current.has(slug)) {
          return current;
        }
        const next = new Set(current);
        next.delete(slug);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isSlugResolving, queryRefetch, slug]);

  useEffect(() => {
    if (slug === "new") {
      return;
    }

    const onChatStreamFinished = (event: Event) => {
      const detail = (event as CustomEvent<ChatStreamFinishedDetail>).detail;
      if (detail?.chatId !== slug) {
        return;
      }
      setResolvingChatIds((current) => {
        if (current.has(slug)) {
          return current;
        }
        const next = new Set(current);
        next.add(slug);
        return next;
      });
    };

    window.addEventListener(CHAT_STREAM_FINISHED_EVENT, onChatStreamFinished);
    return () => {
      window.removeEventListener(
        CHAT_STREAM_FINISHED_EVENT,
        onChatStreamFinished
      );
    };
  }, [slug]);

  useEffect(() => {
    if (!chatQuery.data?.chat) {
      return;
    }
    setResolvingChatIds((current) => {
      if (!current.has(slug)) {
        return current;
      }
      const next = new Set(current);
      next.delete(slug);
      return next;
    });
  }, [chatQuery.data?.chat, slug]);

  const shouldShowOptimisticChatShell = useMemo(
    () => isSlugStreaming || isSlugResolving,
    [isSlugResolving, isSlugStreaming]
  );

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
        initialPrompt={initialPrompt}
        isReadonly={false}
        newChatKey={newChatInstanceKey}
        userName={user.name ?? undefined}
        workspaceUuid={workspace.workspaceId}
      />
    );
  }

  if (chatQuery.isPending || chatQuery.data === null) {
    if (!shouldShowOptimisticChatShell && cachedMessages.length === 0) {
      return <WorkspaceRoutePlaceholder label="Loading method..." />;
    }

    return (
      <ChatWorkspace
        chatIcon={null}
        chatSlug={slug}
        chatTitle="New Method"
        initialMessages={cachedMessages}
        initialPrompt={null}
        isReadonly={false}
        newChatKey={newChatInstanceKey}
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
      newChatKey={newChatInstanceKey}
      userName={user.name ?? undefined}
      workspaceUuid={workspace.workspaceId}
    />
  );
}
