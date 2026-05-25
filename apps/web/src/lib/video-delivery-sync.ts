import {
  type ExplorerFileRecord,
  updateFileAssetStorageMetadata,
} from "@/lib/file-data";
import { getMuxAsset, hasMuxVideoCredentials } from "@/lib/mux-video";
import { buildMuxVideoDelivery } from "@/lib/video-delivery-core";

export async function syncMuxVideoDeliveryForFile(input: {
  file: ExplorerFileRecord;
  userId: string;
  workspaceUuid: string;
}) {
  const { file, userId, workspaceUuid } = input;
  const assetId = file.videoDelivery?.mux?.assetId;
  if (!(assetId && hasMuxVideoCredentials())) {
    return file;
  }

  const asset = await getMuxAsset(assetId);
  const nextVideoDelivery = buildMuxVideoDelivery({
    asset,
    file,
  });
  if (
    JSON.stringify(nextVideoDelivery) === JSON.stringify(file.videoDelivery)
  ) {
    return file;
  }

  return (
    (await updateFileAssetStorageMetadata(workspaceUuid, file.id, userId, {
      videoDelivery: nextVideoDelivery,
    })) ?? file
  );
}
