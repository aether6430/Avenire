import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { createResourceShareLink } from "@/lib/file-data";
import type { WorkspaceFileShareRouteContext } from "../workspace-file-share-route-context";
import { buildWorkspaceFileShareUrl } from "../workspace-file-share-route-model";

export async function handleWorkspaceFileShareLinkPost(
  input: {
    request: Request;
  } & WorkspaceFileShareRouteContext
) {
  const link = await createResourceShareLink({
    workspaceId: input.workspaceUuid,
    resourceType: "file",
    resourceId: input.fileUuid,
    createdBy: input.user.id,
    expiresInDays: 7,
    allowPublic: true,
  });

  const shareUrl = buildWorkspaceFileShareUrl(
    resolveAppBaseUrl(input.request),
    link.token
  );

  void input.apiLogger.meter("meter.share.created", {
    resourceType: "file-link",
    workspaceUuid: input.workspaceUuid,
    fileUuid: input.fileUuid,
  });
  void input.apiLogger.featureUsed("file.sharing.link.created", {
    workspaceUuid: input.workspaceUuid,
    fileUuid: input.fileUuid,
  });
  void input.apiLogger.requestSucceeded(200, {
    workspaceUuid: input.workspaceUuid,
    fileUuid: input.fileUuid,
  });

  return NextResponse.json({
    link,
    shareUrl,
  });
}
