export function resolveWorkspaceOverviewRouteQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSubject = searchParams.get("subject")?.trim() || undefined;

  return { requestedSubject };
}

export const WORKSPACE_OVERVIEW_LOAD_ERROR =
  "Unable to load workspace overview.";

export function buildWorkspaceOverviewPayload(input: {
  activeMisconceptions: unknown[];
  flashcardSets: unknown[];
  weakestConcepts: unknown[];
  weakestDrillTarget: unknown;
}) {
  return {
    activeMisconceptions: input.activeMisconceptions,
    flashcardSets: input.flashcardSets,
    weakestConcepts: input.weakestConcepts,
    weakestDrillTarget: input.weakestDrillTarget,
  };
}

export function resolveWorkspaceOverviewRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
