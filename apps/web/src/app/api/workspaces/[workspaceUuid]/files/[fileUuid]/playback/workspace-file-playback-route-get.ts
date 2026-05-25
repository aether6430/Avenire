import { getFileAssetById } from "@/lib/file-data";
import { syncMuxVideoDeliveryForFile } from "@/lib/video-delivery-sync";
import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import {
  buildWorkspaceFilePlaybackResponse,
  shouldSyncWorkspaceFilePlaybackDelivery,
} from "./workspace-file-playback-route-model";

export async function handleWorkspaceFilePlaybackGet(input: {
  fileUuid: string;
  userId: string;
  workspaceUuid: string;
}) {
  const canAccess = await ensureWorkspaceAccessForUser(
    input.userId,
    input.workspaceUuid
  );
  if (!canAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  let file = await getFileAssetById(input.workspaceUuid, input.fileUuid);
  if (!file?.storageUrl) {
    return new Response("File not found", { status: 404 });
  }

  if (
    shouldSyncWorkspaceFilePlaybackDelivery({
      videoDelivery: file.videoDelivery,
    })
  ) {
    file = await syncMuxVideoDeliveryForFile({
      file,
      userId: input.userId,
      workspaceUuid: input.workspaceUuid,
    });
  }

  const playback = buildWorkspaceFilePlaybackResponse({
    file,
    workspaceUuid: input.workspaceUuid,
  });

  return Response.json(playback.body, {
    headers: {
      "Cache-Control": playback.cacheControl,
    },
  });
}
