export function resolveWorkspaceOverviewRouteQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedSubject = searchParams.get("subject")?.trim() || undefined;

  return { requestedSubject };
}

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
