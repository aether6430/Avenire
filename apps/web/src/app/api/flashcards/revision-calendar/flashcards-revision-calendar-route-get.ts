import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import { resolveWorkspaceForUser } from "@/lib/file-data";
import { listFlashcardDueCountsByDayForUser } from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import {
  buildFlashcardsRevisionCalendarCacheKeyInput,
  buildFlashcardsRevisionCalendarResponse,
  FLASHCARDS_REVISION_CALENDAR_LOAD_ERROR,
  parseFlashcardsRevisionCalendarRequest,
  resolveFlashcardsRevisionCalendarRouteError,
} from "./flashcards-revision-calendar-route-model";

export async function handleFlashcardsRevisionCalendarRouteGet(input: {
  activeOrganizationId: string | null;
  request: Request;
  userId: string;
}) {
  try {
    const parsed = parseFlashcardsRevisionCalendarRequest(input.request);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    const workspace = await resolveWorkspaceForUser(
      input.userId,
      input.activeOrganizationId
    );
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const version = await getRouteCacheVersion(
      CACHE_NAMESPACES.flashcards,
      workspace.workspaceId
    );
    const cacheKey = createRouteCacheKey(
      buildFlashcardsRevisionCalendarCacheKeyInput({
        from: parsed.from,
        to: parsed.to,
        version,
        workspaceId: workspace.workspaceId,
      })
    );
    const cached =
      await getCachedRoute<
        ReturnType<typeof buildFlashcardsRevisionCalendarResponse>
      >(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "x-flashcards-cache": "hit" },
      });
    }

    const rows = await listFlashcardDueCountsByDayForUser(
      input.userId,
      workspace.workspaceId,
      parsed.from,
      parsed.to
    );

    const payload = buildFlashcardsRevisionCalendarResponse({ rows });
    await setCachedRoute(CACHE_NAMESPACES.flashcards, cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "x-flashcards-cache": "miss" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveFlashcardsRevisionCalendarRouteError(
          error,
          FLASHCARDS_REVISION_CALENDAR_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
