export const WORKSPACE_FILE_REINGEST_ERROR = "Unable to reingest file.";

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

export function resolveWorkspaceFileReingestRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
