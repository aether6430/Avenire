import { NextResponse } from "next/server";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import {
  resolveWorkspaceFileDedupeLookupRouteError,
  WORKSPACE_FILE_DEDUPE_LOOKUP_ERROR,
} from "./workspace-file-dedupe-lookup-model";
import { handleWorkspaceFileDedupeLookupPost } from "./workspace-file-dedupe-lookup-post";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceUuid } = await context.params;
    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await handleWorkspaceFileDedupeLookupPost({
      request,
      workspaceUuid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileDedupeLookupRouteError(
          error,
          WORKSPACE_FILE_DEDUPE_LOOKUP_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
