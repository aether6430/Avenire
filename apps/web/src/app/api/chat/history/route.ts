import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listChatsForUser } from "@/lib/chat-data";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrganizationId =
    (session as { session?: { activeOrganizationId?: string | null } }).session
      ?.activeOrganizationId ?? null;
  const ws = await resolveWorkspaceForUser(
    session.user.id,
    activeOrganizationId
  );
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const version = await getRouteCacheVersion(
    CACHE_NAMESPACES.chatsList,
    ws.workspaceId
  );
  const cacheKey = createRouteCacheKey({
    namespace: CACHE_NAMESPACES.chatsList,
    scope: ws.workspaceId,
    version,
  });
  const cached = await getCachedRoute<{ chats: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-chats-cache": "hit" },
    });
  }

  const chats = await listChatsForUser(session.user.id, ws.workspaceId);
  const payload = { chats };
  await setCachedRoute(CACHE_NAMESPACES.chatsList, cacheKey, payload);
  return NextResponse.json(payload, {
    headers: { "x-chats-cache": "miss" },
  });
}
