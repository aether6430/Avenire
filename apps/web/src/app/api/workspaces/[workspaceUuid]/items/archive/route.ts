import { auth } from "@avenire/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { userCanAccessWorkspace } from "@/lib/file-data";
import { buildWorkspaceItemSingleDownload } from "./workspace-item-archive-file";
import {
  createArchiveDownloadResponse,
  resolveRequestedArchiveItems,
  resolveWorkspaceItemArchiveError,
  WORKSPACE_ITEM_ARCHIVE_ERROR,
  workspaceItemArchiveRequestSchema,
} from "./workspace-item-archive-model";
import { handleWorkspaceItemArchiveSelection } from "./workspace-item-archive-selection";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    const canAccess = await userCanAccessWorkspace(
      session.user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestBody = await parseJsonRequest(
      request,
      workspaceItemArchiveRequestSchema
    );
    if (!requestBody.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const requestedItems = resolveRequestedArchiveItems(requestBody.data);
    if (requestedItems.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (requestedItems.length === 1 && requestedItems[0]?.kind === "file") {
      const singleFile = await buildWorkspaceItemSingleDownload(
        workspaceUuid,
        requestedItems[0].id
      );
      if (!singleFile) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      return createArchiveDownloadResponse(singleFile);
    }

    return await handleWorkspaceItemArchiveSelection({
      requestedItems,
      userId: session.user.id,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceItemArchiveError(
          error,
          WORKSPACE_ITEM_ARCHIVE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
