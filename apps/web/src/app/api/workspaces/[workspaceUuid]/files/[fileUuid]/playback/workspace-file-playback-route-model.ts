export const WORKSPACE_FILE_PLAYBACK_ERROR = "Unable to load playback";

export function resolveWorkspaceFilePlaybackRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}

export function shouldSyncWorkspaceFilePlaybackDelivery(input: {
  videoDelivery?: {
    status?: string | null;
    mux?: {
      assetId?: string | null;
    } | null;
  } | null;
}) {
  return (
    input.videoDelivery?.status !== "ready" &&
    Boolean(input.videoDelivery?.mux?.assetId)
  );
}

export function buildWorkspaceFilePlaybackProgressiveSource(input: {
  fileId: string;
  mimeType?: string | null;
  workspaceUuid: string;
}) {
  return {
    kind: "progressive" as const,
    mimeType: input.mimeType ?? undefined,
    url: `/api/workspaces/${input.workspaceUuid}/files/${input.fileId}/stream`,
  };
}

export function buildWorkspaceFilePlaybackResponse(input: {
  file: {
    id: string;
    mimeType?: string | null;
    videoDelivery?: {
      status?: string | null;
      hls?: {
        manifestUrl?: string | null;
      } | null;
      mux?: {
        playbackId?: string | null;
      } | null;
      poster?: {
        url?: string | null;
      } | null;
    } | null;
  };
  workspaceUuid: string;
}) {
  const progressiveSource = buildWorkspaceFilePlaybackProgressiveSource({
    fileId: input.file.id,
    mimeType: input.file.mimeType,
    workspaceUuid: input.workspaceUuid,
  });
  const preferredSource =
    input.file.videoDelivery?.status === "ready" &&
    input.file.videoDelivery.hls?.manifestUrl
      ? {
          fallbackUrl: progressiveSource.url,
          kind: "hls" as const,
          manifestUrl: input.file.videoDelivery.hls.manifestUrl,
          mimeType: input.file.mimeType ?? undefined,
          playbackId: input.file.videoDelivery.mux?.playbackId ?? undefined,
          provider: input.file.videoDelivery.mux?.playbackId
            ? ("mux" as const)
            : ("generic" as const),
        }
      : progressiveSource;
  const status = input.file.videoDelivery?.status ?? "ready";

  return {
    body: {
      fallbackSource: progressiveSource,
      posterUrl: input.file.videoDelivery?.poster?.url ?? null,
      preferredSource,
      status,
    },
    cacheControl:
      status === "ready"
        ? "private, max-age=60, stale-while-revalidate=300"
        : "private, no-store, max-age=0",
  };
}
