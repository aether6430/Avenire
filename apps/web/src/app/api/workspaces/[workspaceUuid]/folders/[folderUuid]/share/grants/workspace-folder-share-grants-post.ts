import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { parseJsonRequest, unknownJsonRequestSchema } from "@/lib/api-request";
import {
  createResourceShareLink,
  grantResourceToUserByEmail,
} from "@/lib/file-data";
import type { WorkspaceFolderShareRouteContext } from "../workspace-folder-share-route-context";
import {
  buildWorkspaceFolderShareUrl,
  parseWorkspaceFolderShareGrantBody,
} from "../workspace-folder-share-route-model";

export async function handleWorkspaceFolderShareGrantsPost(
  input: {
    request: Request;
  } & WorkspaceFolderShareRouteContext
) {
  const requestBody = await parseJsonRequest(input.request, unknownJsonRequestSchema);
  if (!requestBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const parsedBody = parseWorkspaceFolderShareGrantBody(requestBody.data);

  if (!parsedBody.email) {
    void input.apiLogger.requestFailed(400, "Missing email", {
      workspaceUuid: input.workspaceUuid,
      folderUuid: input.folderUuid,
    });
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const grant = await grantResourceToUserByEmail({
    workspaceId: input.workspaceUuid,
    resourceType: "folder",
    resourceId: input.folderUuid,
    email: parsedBody.email,
    createdBy: input.user.id,
    permission: parsedBody.permission,
  });
  if (!grant) {
    void input.apiLogger.requestFailed(404, "User not found", {
      workspaceUuid: input.workspaceUuid,
      folderUuid: input.folderUuid,
    });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const link = await createResourceShareLink({
    workspaceId: input.workspaceUuid,
    resourceType: "folder",
    resourceId: input.folderUuid,
    createdBy: input.user.id,
    expiresInDays: 7,
    allowPublic: false,
  });

  const shareUrl = buildWorkspaceFolderShareUrl(
    resolveAppBaseUrl(input.request),
    link.token
  );

  void input.apiLogger.meter("meter.share.created", {
    resourceType: "folder",
    workspaceUuid: input.workspaceUuid,
    folderUuid: input.folderUuid,
    emailSent: false,
  });
  void input.apiLogger.featureUsed("folder.sharing.grant.created", {
    workspaceUuid: input.workspaceUuid,
    folderUuid: input.folderUuid,
  });
  void input.apiLogger.requestSucceeded(201, {
    workspaceUuid: input.workspaceUuid,
    folderUuid: input.folderUuid,
    emailSent: false,
  });

  return NextResponse.json(
    {
      grant,
      emailSent: false,
      shareUrl,
    },
    { status: 201 }
  );
}
