export function buildWorkspaceFileReingestRateLimitPayload(
  retryAfter: Date | null | undefined
) {
  return {
    error: "Upload usage limit reached",
    retryAfter: retryAfter?.toISOString() ?? null,
  };
}

export function buildWorkspaceFileReingestStreamEvent(input: {
  createdAt: string;
  jobId: string;
  workspaceUuid: string;
}) {
  return {
    createdAt: input.createdAt,
    eventType: "job.queued" as const,
    jobId: input.jobId,
    payload: {
      source: "manual.reingest" as const,
      status: "queued" as const,
    },
    type: "ingestion.job" as const,
    workspaceId: input.workspaceUuid,
  };
}
