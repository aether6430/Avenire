import { getActiveMisconceptions } from "@avenire/database";
import { NextResponse } from "next/server";
import { CACHE_NAMESPACES } from "@/lib/domain-cache";
import {
  getFlashcardDashboardForUser,
  getWeakestConcepts,
  listFlashcardSetSummariesForUser,
  resolveWeakestConceptDrillTarget,
} from "@/lib/flashcards";
import {
  createRouteCacheKey,
  getCachedRoute,
  getRouteCacheVersion,
  setCachedRoute,
} from "@/lib/route-cache";
import {
  buildWorkspaceOverviewPayload,
  resolveWorkspaceOverviewRouteError,
  resolveWorkspaceOverviewRouteQuery,
  WORKSPACE_OVERVIEW_LOAD_ERROR,
} from "./workspace-overview-route-model";

async function withWorkspaceOverviewFallback<T>(input: {
  errorContext: Record<string, unknown>;
  errorLabel: string;
  fallback: T;
  loader: Promise<T>;
}) {
  try {
    return await input.loader;
  } catch (error) {
    console.error(input.errorLabel, {
      error,
      ...input.errorContext,
    });
    return input.fallback;
  }
}

export async function handleWorkspaceOverviewRouteGet(input: {
  request: Request;
  userId: string;
  workspaceId: string;
}) {
  try {
    const { requestedSubject } = resolveWorkspaceOverviewRouteQuery(
      input.request
    );
    const version = await getRouteCacheVersion(
      CACHE_NAMESPACES.workspaceOverview,
      input.workspaceId
    );
    const cacheKey = createRouteCacheKey({
      namespace: CACHE_NAMESPACES.workspaceOverview,
      params: { subject: requestedSubject ?? null },
      scope: input.workspaceId,
      version,
    });
    const cached = await getCachedRoute<{
      activeMisconceptions: unknown[];
      flashcardSets: unknown[];
      weakestConcepts: unknown[];
      weakestDrillTarget: unknown;
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "x-workspace-overview-cache": "hit" },
      });
    }

    const [
      flashcardSets,
      weakestConcepts,
      activeMisconceptions,
      flashcardDashboard,
    ] = await Promise.all([
      listFlashcardSetSummariesForUser(input.userId, input.workspaceId),
      withWorkspaceOverviewFallback({
        errorContext: {
          requestedSubject,
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
        errorLabel: "[workspace-overview] Failed to load weakest concepts",
        fallback: [],
        loader: getWeakestConcepts(input.userId, input.workspaceId, {
          limit: 5,
          subject: requestedSubject,
        }),
      }),
      withWorkspaceOverviewFallback({
        errorContext: {
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
        errorLabel: "[workspace-overview] Failed to load active misconceptions",
        fallback: [],
        loader: getActiveMisconceptions({
          includeCandidates: true,
          limit: 12,
          subject: requestedSubject,
          userId: input.userId,
          workspaceId: input.workspaceId,
        }),
      }),
      withWorkspaceOverviewFallback({
        errorContext: {
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
        errorLabel:
          "[workspace-overview] Failed to load flashcard dashboard data",
        fallback: null,
        loader: getFlashcardDashboardForUser(input.userId, input.workspaceId),
      }),
    ]);

    const payload = buildWorkspaceOverviewPayload({
      activeMisconceptions,
      flashcardSets,
      weakestConcepts,
      weakestDrillTarget: flashcardDashboard
        ? resolveWeakestConceptDrillTarget(flashcardDashboard, weakestConcepts)
        : null,
    });

    await setCachedRoute(CACHE_NAMESPACES.workspaceOverview, cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "x-workspace-overview-cache": "miss" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceOverviewRouteError(
          error,
          WORKSPACE_OVERVIEW_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
