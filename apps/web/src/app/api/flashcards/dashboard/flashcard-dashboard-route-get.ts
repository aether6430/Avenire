import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { getFlashcardDashboardForUser } from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import {
  buildFlashcardDashboardCacheKeyInput,
  resolveFlashcardDashboardResponse,
  FLASHCARD_DASHBOARD_LOAD_ERROR,
  resolveFlashcardDashboardRouteError,
} from "./flashcard-dashboard-route-model";

export async function handleFlashcardDashboardRouteGet(input: {
  userId: string;
  workspaceId: string;
}) {
  try {
    const version = await getRouteCacheVersion(
      CACHE_NAMESPACES.flashcards,
      input.workspaceId
    );
    const cacheKey = createRouteCacheKey(
      buildFlashcardDashboardCacheKeyInput({
        version,
        workspaceId: input.workspaceId,
      })
    );
    const cached = await getCachedRoute<{ dashboard: unknown }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "x-flashcards-cache": "hit" },
      });
    }

    const dashboard = await getFlashcardDashboardForUser(
      input.userId,
      input.workspaceId
    );

    if (!dashboard) {
      return NextResponse.json(
        { error: "Dashboard not found" },
        { status: 404 }
      );
    }

    const payload = resolveFlashcardDashboardResponse({ dashboard });
    await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "x-flashcards-cache": "miss" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardDashboardRouteError(
          error,
          FLASHCARD_DASHBOARD_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
