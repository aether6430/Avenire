import { sendFileShareEmail } from "@avenire/auth/server";
import { NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/app-base-url";
import { parseJsonRequest, unknownJsonRequestSchema } from "@/lib/api-request";
import {
  createResourceShareLink,
  grantResourceToUserByEmail,
} from "@/lib/file-data";
import type { WorkspaceFileShareRouteContext } from "../workspace-file-share-route-context";
import {
  buildWorkspaceFileShareUrl,
  parseWorkspaceFileShareGrantBody,
} from "../workspace-file-share-route-model";

export async function handleWorkspaceFileShareGrantsPost(
  input: {
    request: Request;
  } & WorkspaceFileShareRouteContext
) {
  const requestBody = await parseJsonRequest(input.request, unknownJsonRequestSchema);
  if (!requestBody.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const parsedBody = parseWorkspaceFileShareGrantBody(requestBody.data);

  if (!parsedBody.email) {
    void input.apiLogger.requestFailed(400, "Missing email", {
      workspaceUuid: input.workspaceUuid,
      fileUuid: input.fileUuid,
    });
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const grant = await grantResourceToUserByEmail({
    workspaceId: input.workspaceUuid,
    resourceType: "file",
    resourceId: input.fileUuid,
    email: parsedBody.email,
    createdBy: input.user.id,
    permission: parsedBody.permission,
  });

  if (!grant) {
    void input.apiLogger.requestFailed(404, "User not found", {
      workspaceUuid: input.workspaceUuid,
      fileUuid: input.fileUuid,
    });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const link = await createResourceShareLink({
    workspaceId: input.workspaceUuid,
    resourceType: "file",
    resourceId: input.fileUuid,
    createdBy: input.user.id,
    expiresInDays: 7,
    allowPublic: false,
  });

  const shareUrl = buildWorkspaceFileShareUrl(
    resolveAppBaseUrl(input.request),
    link.token
  );
  let emailSent = false;

  try {
    await sendFileShareEmail({
      toEmail: grant.email,
      fileName: input.file.name,
      shareUrl,
      sharedByName: input.user.name ?? undefined,
    });
    emailSent = true;
  } catch (error) {
    console.error("Failed to send file share email", {
      workspaceUuid: input.workspaceUuid,
      fileUuid: input.fileUuid,
      recipient: grant.email,
      error,
    });
    void input.apiLogger.error("error.integration", {
      integration: "email",
      workspaceUuid: input.workspaceUuid,
      fileUuid: input.fileUuid,
      action: "sendFileShareEmail",
    });
  }

  void input.apiLogger.meter("meter.share.created", {
    resourceType: "file",
    workspaceUuid: input.workspaceUuid,
    fileUuid: input.fileUuid,
    emailSent,
  });
  void input.apiLogger.featureUsed("file.sharing.grant.created", {
    workspaceUuid: input.workspaceUuid,
    fileUuid: input.fileUuid,
    emailSent,
  });
  void input.apiLogger.requestSucceeded(201, {
    workspaceUuid: input.workspaceUuid,
    fileUuid: input.fileUuid,
    emailSent,
  });

  return NextResponse.json({ grant, emailSent, shareUrl }, { status: 201 });
}
