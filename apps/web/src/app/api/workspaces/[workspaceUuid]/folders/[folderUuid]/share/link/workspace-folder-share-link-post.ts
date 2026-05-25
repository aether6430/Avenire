import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { createResourceShareLink } from "@/lib/file-data";
import type { WorkspaceFolderShareRouteContext } from "../workspace-folder-share-route-context";
import { buildWorkspaceFolderShareUrl } from "../workspace-folder-share-route-model";

export async function handleWorkspaceFolderShareLinkPost(
  input: {
    request: Request;
  } & WorkspaceFolderShareRouteContext
) {
  const link = await createResourceShareLink({
    workspaceId: input.workspaceUuid,
    resourceType: "folder",
    resourceId: input.folderUuid,
    createdBy: input.user.id,
    expiresInDays: 7,
    allowPublic: true,
  });

  const shareUrl = buildWorkspaceFolderShareUrl(
    resolveAppBaseUrl(input.request),
    link.token
  );

  void input.apiLogger.meter("meter.share.created", {
    resourceType: "folder-link",
    workspaceUuid: input.workspaceUuid,
    folderUuid: input.folderUuid,
  });
  void input.apiLogger.featureUsed("folder.sharing.link.created", {
    workspaceUuid: input.workspaceUuid,
    folderUuid: input.folderUuid,
  });
  void input.apiLogger.requestSucceeded(200, {
    workspaceUuid: input.workspaceUuid,
    folderUuid: input.folderUuid,
  });

  return NextResponse.json({
    link,
    shareUrl,
  });
}
