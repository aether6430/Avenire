import { CACHE_NAMESPACES } from "@/lib/domain-cache";

export const FLASHCARD_DASHBOARD_LOAD_ERROR =
  "Unable to load Mindset Sets dashboard.";

export function buildFlashcardDashboardCacheKeyInput(input: {
  version: string;
  workspaceId: string;
}) {
  return {
    namespace: CACHE_NAMESPACES.flashcards,
    params: { route: "dashboard" },
    scope: input.workspaceId,
    version: input.version,
  };
}

export function resolveFlashcardDashboardResponse(input: {
  dashboard: unknown;
}) {
  return {
    dashboard: input.dashboard,
  };
}

export function resolveFlashcardDashboardRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
