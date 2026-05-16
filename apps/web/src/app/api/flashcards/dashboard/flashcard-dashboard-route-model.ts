import { CACHE_NAMESPACES } from "@/lib/domain-cache";

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
