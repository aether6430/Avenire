import { listChatsForUser } from "@avenire/database";
import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import { resolveChatDirectoryRouteContext } from "../../chats/chat-directory-route-context";
import { resolveChatDirectoryRouteError } from "../../chats/chat-directory-route-model";

export async function handleChatHistoryRouteGet() {
  const context = await resolveChatDirectoryRouteContext();
  if (!context.ok) {
    return context.response;
  }

  try {
    const version = await getRouteCacheVersion(
      CACHE_NAMESPACES.chatsList,
      context.workspace.workspaceId
    );
    const cacheKey = createRouteCacheKey({
      namespace: CACHE_NAMESPACES.chatsList,
      scope: context.workspace.workspaceId,
      version,
    });
    const cached = await getCachedRoute<{ chats: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "x-chats-cache": "hit" },
      });
    }

    const chats = await listChatsForUser(
      context.session.user.id,
      context.workspace.workspaceId
    );
    const payload = { chats };
    await setCachedRoute(CACHE_NAMESPACES.chatsList, cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "x-chats-cache": "miss" },
    });
  } catch (error) {
    const failure = resolveChatDirectoryRouteError(error, {
      fallback: "Unable to load chats.",
    });
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }
}
