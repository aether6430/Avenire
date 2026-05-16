import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { listFlashcardSetSummariesForUser } from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import { resolveFlashcardSetListResponse } from "./flashcard-sets-route-model";

export async function handleFlashcardSetsRouteGet(input: {
  userId: string;
  workspaceId: string;
}) {
  const version = await getRouteCacheVersion(
    CACHE_NAMESPACES.flashcards,
    input.workspaceId
  );
  const cacheKey = createRouteCacheKey({
    namespace: CACHE_NAMESPACES.flashcards,
    params: { route: "sets" },
    scope: input.workspaceId,
    version,
  });
  const cached = await getCachedRoute<{ sets: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-flashcards-cache": "hit" },
    });
  }

  const sets = await listFlashcardSetSummariesForUser(
    input.userId,
    input.workspaceId
  );
  const payload = resolveFlashcardSetListResponse({ sets });
  await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);

  return NextResponse.json(payload, {
    headers: { "x-flashcards-cache": "miss" },
  });
}
