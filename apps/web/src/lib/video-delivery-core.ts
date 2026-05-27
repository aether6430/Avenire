import type { ExplorerFileRecord, VideoDeliveryRecord } from "@/lib/file-data";
import {
  buildMuxPlaybackUrl,
  buildMuxPosterUrl,
  getMuxAssetVideoTrack,
  getMuxPlaybackId,
  hasMuxVideoCredentials,
  type MuxAsset,
} from "@/lib/mux-video";

function buildProgressiveRecord(input: {
  mimeType: string | null;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
}) {
  return {
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
    url: input.storageUrl,
  };
}

export function buildPendingVideoDelivery(input: {
  mimeType: string | null;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
}): VideoDeliveryRecord {
  return {
    analysis: null,
    error: null,
    hls: null,
    mux: null,
    poster: null,
    progressive: buildProgressiveRecord(input),
    status: "pending",
    strategy: hasMuxVideoCredentials() ? "mux" : "progressive",
    updatedAt: new Date().toISOString(),
    version: 2,
  };
}

export function buildFailedVideoDelivery(
  previous: VideoDeliveryRecord,
  error: unknown
): VideoDeliveryRecord {
  return {
    ...previous,
    error:
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Video optimization failed",
    status: "failed",
    updatedAt: new Date().toISOString(),
  };
}

export function canOptimizeVideoDelivery(
  file: Pick<ExplorerFileRecord, "mimeType">
) {
  return file.mimeType?.startsWith("video/") ?? false;
}

export function isAsyncVideoOptimizationEnabled() {
  return (
    (process.env.ENABLE_ASYNC_MEDIA_OPTIMIZATION ?? "true").toLowerCase() !==
    "false"
  );
}

function mapMuxStatusToVideoDeliveryStatus(status: string) {
  if (status === "ready") {
    return "ready";
  }
  if (status === "errored") {
    return "failed";
  }
  return "pending";
}

export function buildMuxVideoDelivery(input: {
  asset: MuxAsset;
  file: Pick<
    ExplorerFileRecord,
    "mimeType" | "sizeBytes" | "storageKey" | "storageUrl" | "videoDelivery"
  >;
}): VideoDeliveryRecord {
  const playback = getMuxPlaybackId(input.asset);
  const videoTrack = getMuxAssetVideoTrack(input.asset);
  const previous = input.file.videoDelivery;

  return {
    analysis: {
      bitrateKbps: previous?.analysis?.bitrateKbps ?? null,
      durationSeconds:
        typeof input.asset.duration === "number"
          ? input.asset.duration
          : (previous?.analysis?.durationSeconds ?? null),
      height:
        typeof videoTrack?.max_height === "number"
          ? videoTrack.max_height
          : (previous?.analysis?.height ?? null),
      width:
        typeof videoTrack?.max_width === "number"
          ? videoTrack.max_width
          : (previous?.analysis?.width ?? null),
    },
    error:
      input.asset.status === "errored"
        ? (previous?.error ?? "Mux asset processing failed")
        : null,
    hls: playback
      ? {
          manifestStorageKey: null,
          manifestUrl: buildMuxPlaybackUrl(playback.id),
          segmentDurationSeconds: null,
          segmentStorageKeys: null,
          variants: null,
        }
      : null,
    mux: {
      aspectRatio: input.asset.aspect_ratio ?? null,
      assetId: input.asset.id,
      createdAt: input.asset.created_at ?? null,
      maxStoredResolution: input.asset.max_stored_resolution ?? null,
      playbackId: playback?.id ?? null,
      playbackIds: input.asset.playback_ids ?? null,
      resolutionTier: input.asset.resolution_tier ?? null,
      status: input.asset.status,
    },
    poster: playback
      ? {
          mimeType: "image/jpeg",
          storageKey: null,
          url: buildMuxPosterUrl(playback.id),
        }
      : null,
    progressive: buildProgressiveRecord(input.file),
    status: mapMuxStatusToVideoDeliveryStatus(input.asset.status),
    strategy: "mux",
    updatedAt: new Date().toISOString(),
    version: 2,
  };
}
