import "server-only";
import {
  type ExplorerFileRecord,
  updateFileAssetStorageMetadata,
  type VideoDeliveryRecord,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  createMuxAssetFromUrl,
  getMuxAsset,
  hasMuxVideoCredentials,
} from "@/lib/mux-video";
import {
  buildFailedVideoDelivery,
  buildMuxVideoDelivery,
  buildPendingVideoDelivery,
  canOptimizeVideoDelivery,
  isAsyncVideoOptimizationEnabled,
} from "@/lib/video-delivery-core";
import { optimizeAndReuploadVideo } from "@/lib/video-optimization";

const MUX_POLL_INTERVAL_MS = Math.max(
  2000,
  Number.parseInt(process.env.MUX_POLL_INTERVAL_MS ?? "", 10) || 5000
);
const MUX_POLL_MAX_ATTEMPTS = Math.max(
  1,
  Number.parseInt(process.env.MUX_POLL_MAX_ATTEMPTS ?? "", 10) || 120
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollMuxAsset(assetId: string) {
  let asset = await getMuxAsset(assetId);
  for (
    let attempt = 0;
    attempt < MUX_POLL_MAX_ATTEMPTS &&
    asset.status !== "ready" &&
    asset.status !== "errored";
    attempt += 1
  ) {
    await sleep(MUX_POLL_INTERVAL_MS);
    asset = await getMuxAsset(assetId);
  }
  return asset;
}

async function runLegacyVideoOptimization(input: {
  file: Pick<
    ExplorerFileRecord,
    | "folderId"
    | "id"
    | "mimeType"
    | "name"
    | "sizeBytes"
    | "storageKey"
    | "storageUrl"
  >;
  pendingVideoDelivery: VideoDeliveryRecord;
  userId: string;
  workspaceUuid: string;
}) {
  const { file, pendingVideoDelivery, userId, workspaceUuid } = input;
  const optimized = await optimizeAndReuploadVideo({
    sourceName: file.name,
    sourceUrl: file.storageUrl,
  });

  if (!optimized) {
    await updateFileAssetStorageMetadata(workspaceUuid, file.id, userId, {
      videoDelivery: buildFailedVideoDelivery(
        pendingVideoDelivery,
        new Error("Video optimization returned no assets")
      ),
    });
    return;
  }

  const updated = await updateFileAssetStorageMetadata(
    workspaceUuid,
    file.id,
    userId,
    {
      optimizedStorageKey: optimized.progressive.storageKey,
      optimizedStorageUrl: optimized.progressive.storageUrl,
      optimizedName: optimized.progressive.name,
      optimizedMimeType: optimized.progressive.mimeType,
      optimizedSizeBytes: optimized.progressive.sizeBytes,
      videoDelivery: optimized.videoDelivery,
    }
  );

  if (!updated) {
    return;
  }

  await publishFilesInvalidationEvent({
    workspaceUuid,
    folderId: file.folderId,
    reason: "file.updated",
  });
  await publishFilesInvalidationEvent({
    workspaceUuid,
    reason: "tree.changed",
  });
}

async function runMuxVideoDelivery(input: {
  file: Pick<
    ExplorerFileRecord,
    | "folderId"
    | "id"
    | "mimeType"
    | "name"
    | "sizeBytes"
    | "storageKey"
    | "storageUrl"
    | "videoDelivery"
  >;
  userId: string;
  workspaceUuid: string;
}) {
  const { file, userId, workspaceUuid } = input;
  const createdAsset = await createMuxAssetFromUrl({
    passthrough: file.id,
    sourceUrl: file.storageUrl,
  });

  const initialVideoDelivery = buildMuxVideoDelivery({
    asset: createdAsset,
    file,
  });
  await updateFileAssetStorageMetadata(workspaceUuid, file.id, userId, {
    videoDelivery: initialVideoDelivery,
  });

  if (initialVideoDelivery.status === "ready") {
    await publishFilesInvalidationEvent({
      workspaceUuid,
      folderId: file.folderId,
      reason: "file.updated",
    });
    await publishFilesInvalidationEvent({
      workspaceUuid,
      reason: "tree.changed",
    });
    return;
  }

  if (initialVideoDelivery.status === "failed") {
    return;
  }

  const finalAsset = await pollMuxAsset(createdAsset.id);
  const finalVideoDelivery = buildMuxVideoDelivery({
    asset: finalAsset,
    file: {
      ...file,
      videoDelivery: initialVideoDelivery,
    },
  });
  await updateFileAssetStorageMetadata(workspaceUuid, file.id, userId, {
    videoDelivery: finalVideoDelivery,
  });

  if (finalVideoDelivery.status === "ready") {
    await publishFilesInvalidationEvent({
      workspaceUuid,
      folderId: file.folderId,
      reason: "file.updated",
    });
    await publishFilesInvalidationEvent({
      workspaceUuid,
      reason: "tree.changed",
    });
  }
}

export function scheduleAsyncVideoDeliveryOptimization(input: {
  file: Pick<
    ExplorerFileRecord,
    | "folderId"
    | "id"
    | "mimeType"
    | "name"
    | "sizeBytes"
    | "storageKey"
    | "storageUrl"
    | "videoDelivery"
  >;
  userId: string;
  workspaceUuid: string;
}) {
  const { file, userId, workspaceUuid } = input;
  if (!(isAsyncVideoOptimizationEnabled() && canOptimizeVideoDelivery(file))) {
    return false;
  }

  const pendingVideoDelivery = buildPendingVideoDelivery({
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    storageUrl: file.storageUrl,
  });

  const runOptimization = async () => {
    try {
      await updateFileAssetStorageMetadata(workspaceUuid, file.id, userId, {
        videoDelivery: pendingVideoDelivery,
      });

      if (hasMuxVideoCredentials()) {
        try {
          await runMuxVideoDelivery({
            file: {
              ...file,
              videoDelivery: pendingVideoDelivery,
            },
            userId,
            workspaceUuid,
          });
          return;
        } catch (error) {
          console.warn(
            "Mux video delivery failed, falling back to legacy optimization",
            {
              workspaceUuid,
              fileId: file.id,
              error,
            }
          );
        }
      }

      await runLegacyVideoOptimization({
        file,
        pendingVideoDelivery,
        userId,
        workspaceUuid,
      });
    } catch (error) {
      await updateFileAssetStorageMetadata(workspaceUuid, file.id, userId, {
        videoDelivery: buildFailedVideoDelivery(pendingVideoDelivery, error),
      });
      console.warn("Async video optimization skipped", {
        workspaceUuid,
        fileId: file.id,
        error,
      });
    }
  };

  runOptimization();

  return true;
}
