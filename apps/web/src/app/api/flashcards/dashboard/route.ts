import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { getFlashcardDashboardForUser } from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";

export async function GET() {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const version = await getRouteCacheVersion(
    CACHE_NAMESPACES.flashcards,
    ctx.workspace.workspaceId
  );
  const cacheKey = createRouteCacheKey({
    namespace: CACHE_NAMESPACES.flashcards,
    params: { route: "dashboard" },
    scope: ctx.workspace.workspaceId,
    version,
  });
  const cached = await getCachedRoute<{ dashboard: unknown }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-flashcards-cache": "hit" },
    });
  }

  const dashboard = await getFlashcardDashboardForUser(
    ctx.user.id,
    ctx.workspace.workspaceId
  );

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const payload = { dashboard };
  await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);
  return NextResponse.json(payload, {
    headers: { "x-flashcards-cache": "miss" },
  });
}
