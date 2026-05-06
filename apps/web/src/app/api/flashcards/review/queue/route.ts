import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import type { FlashcardTaxonomy } from "@/lib/flashcards";
import { listDueFlashcardsForUser } from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";

function parseDrillFilters(searchParams: URLSearchParams): FlashcardTaxonomy[] {
  return searchParams.getAll("drill").flatMap((value) => {
    try {
      const parsed = JSON.parse(value) as Partial<FlashcardTaxonomy>;
      if (
        typeof parsed.subject !== "string" ||
        typeof parsed.topic !== "string" ||
        typeof parsed.concept !== "string"
      ) {
        return [];
      }

      return [
        {
          concept: parsed.concept,
          subject: parsed.subject,
          topic: parsed.topic,
        },
      ];
    } catch {
      return [];
    }
  });
}

export async function GET(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId")?.trim() || undefined;
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const taxonomyFilters = parseDrillFilters(searchParams);
  const limit = Number.isFinite(limitParam) ? limitParam : 20;
  const version = await getRouteCacheVersion(
    CACHE_NAMESPACES.flashcards,
    ctx.workspace.workspaceId
  );
  const cacheKey = createRouteCacheKey({
    namespace: CACHE_NAMESPACES.flashcards,
    params: {
      limit,
      route: "review-queue",
      setId: setId ?? null,
      taxonomyFilters,
    },
    scope: ctx.workspace.workspaceId,
    version,
  });
  const cached = await getCachedRoute<{ queue: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-flashcards-cache": "hit" },
    });
  }

  const queue = await listDueFlashcardsForUser({
    limit,
    setId,
    taxonomyFilters: taxonomyFilters.length > 0 ? taxonomyFilters : undefined,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  const payload = { queue };
  await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);
  return NextResponse.json(payload, {
    headers: { "x-flashcards-cache": "miss" },
  });
}
