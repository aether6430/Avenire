import { NextResponse } from "next/server";
import {
  canUserAccessSharedResource,
  listWorkspacesForUser,
  resolveResourceShareLink,
} from "@/lib/file-data";
import { getSessionUser } from "@/lib/workspace";
import { parseJsonRequest } from "@/lib/api-request";
import { duplicateSharedFileIntoWorkspace } from "./shared-resource-duplicate-file";
import { duplicateSharedFolderIntoWorkspace } from "./shared-resource-duplicate-folder";
import {
  buildSharedResourceDuplicateFileRoute,
  buildSharedResourceDuplicateFolderRoute,
  resolveSharedResourceDuplicateError,
  SHARED_RESOURCE_DUPLICATE_ERROR,
  sharedResourceDuplicateSchema,
} from "./shared-resource-duplicate-model";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await context.params;
    const link = await resolveResourceShareLink(token);
    if (!link) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    const hasAccess = await canUserAccessSharedResource({
      link,
      userId: user.id,
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(link.resourceType === "file" || link.resourceType === "folder")) {
      return NextResponse.json(
        { error: "Only files and folders can be copied." },
        { status: 400 }
      );
    }

    const parsed = await parseJsonRequest(request, sharedResourceDuplicateSchema);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Workspace is required." },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const workspaces = await listWorkspacesForUser(user.id);
    const targetWorkspace = workspaces.find(
      (workspace) => workspace.workspaceId === body.workspaceId
    );
    if (!targetWorkspace) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 }
      );
    }

    if (link.resourceType === "file") {
      return await duplicateSharedFileIntoWorkspace({
        buildRoute: ({ fileId, folderId }) =>
          buildSharedResourceDuplicateFileRoute({
            folderId,
            fileId,
            workspaceId: targetWorkspace.workspaceId,
          }),
        fileId: link.resourceId,
        sourceWorkspaceId: link.workspaceId,
        targetFolderId: targetWorkspace.rootFolderId,
        targetWorkspaceId: targetWorkspace.workspaceId,
        userId: user.id,
      });
    }

    return await duplicateSharedFolderIntoWorkspace({
      folderId: link.resourceId,
      sourceWorkspaceId: link.workspaceId,
      targetRootFolderId: targetWorkspace.rootFolderId,
      targetWorkspaceId: targetWorkspace.workspaceId,
      userId: user.id,
      buildRoute: (folderId) =>
        buildSharedResourceDuplicateFolderRoute({
          folderId,
          workspaceId: targetWorkspace.workspaceId,
        }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveSharedResourceDuplicateError(
          error,
          SHARED_RESOURCE_DUPLICATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
