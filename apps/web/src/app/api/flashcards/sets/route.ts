import { NextResponse } from "next/server";
import {
  CACHE_NAMESPACES,
  invalidateFlashcardReadCaches,
} from "@/lib/domain-cache";
import {
  createFlashcardSetForUser,
  listFlashcardSetSummariesForUser,
} from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import { getWorkspaceContextForUser } from "@/lib/workspace";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import { flashcardSetMutationSchema } from "../flashcard-route-model";

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
    params: { route: "sets" },
    scope: ctx.workspace.workspaceId,
    version,
  });
  const cached = await getCachedRoute<{ sets: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-flashcards-cache": "hit" },
    });
  }

  const sets = await listFlashcardSetSummariesForUser(
    ctx.user.id,
    ctx.workspace.workspaceId
  );

  const payload = { sets };
  await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);
  return NextResponse.json(payload, {
    headers: { "x-flashcards-cache": "miss" },
  });
}

export async function POST(request: Request) {
  const ctx = await getWorkspaceContextForUser();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = flashcardSetMutationSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = parsed.data;

  const set = await createFlashcardSetForUser({
    description: body.description,
    tags: body.tags,
    title: body.title,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.workspaceId,
  });

  if (!set) {
    return NextResponse.json(
      { error: "Unable to create set" },
      { status: 400 }
    );
  }

  await invalidateFlashcardReadCaches(ctx.workspace.workspaceId);

  void publishWorkspaceStreamEvent({
    workspaceUuid: ctx.workspace.workspaceId,
    type: "flashcards.invalidate",
    payload: {
      action: "created",
      setId: set.id,
      workspaceUuid: ctx.workspace.workspaceId,
    },
  });

  return NextResponse.json({ set }, { status: 201 });
}
