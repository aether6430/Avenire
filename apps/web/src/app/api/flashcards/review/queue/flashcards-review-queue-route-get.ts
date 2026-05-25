import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { listDueFlashcardsForUser } from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import {
  FLASHCARDS_REVIEW_QUEUE_LOAD_ERROR,
  parseFlashcardsReviewQueueRequest,
  resolveFlashcardsReviewQueueResponse,
  resolveFlashcardsReviewQueueRouteError,
} from "./flashcards-review-queue-route-model";

export async function handleFlashcardsReviewQueueRouteGet(input: {
  requestUrl: string;
  userId: string;
  workspaceId: string;
}) {
  try {
    const parsed = parseFlashcardsReviewQueueRequest(input.requestUrl);
    const version = await getRouteCacheVersion(
      CACHE_NAMESPACES.flashcards,
      input.workspaceId
    );
    const cacheKey = createRouteCacheKey({
      namespace: CACHE_NAMESPACES.flashcards,
      params: {
        limit: parsed.limit,
        route: "review-queue",
        setId: parsed.setId ?? null,
        taxonomyFilters: parsed.taxonomyFilters,
      },
      scope: input.workspaceId,
      version,
    });
    const cached = await getCachedRoute<{ queue: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "x-flashcards-cache": "hit" },
      });
    }

    const queue = await listDueFlashcardsForUser({
      limit: parsed.limit,
      setId: parsed.setId,
      taxonomyFilters:
        parsed.taxonomyFilters.length > 0 ? parsed.taxonomyFilters : undefined,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });

    const payload = resolveFlashcardsReviewQueueResponse({ queue });
    await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "x-flashcards-cache": "miss" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardsReviewQueueRouteError(
          error,
          FLASHCARDS_REVIEW_QUEUE_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
