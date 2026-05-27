import { NextResponse } from "next/server";
import { getFileAssetById } from "@/lib/file-data";
import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import {
  buildWorkspaceFileRouteSummary,
  resolveWorkspaceFileRouteError,
  WORKSPACE_FILE_LOAD_ERROR,
} from "./workspace-file-route-model";

export async function handleWorkspaceFileGet(input: {
  fileUuid: string;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const hasAccess = await ensureWorkspaceAccessForUser(
      input.userId,
      input.workspaceUuid
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await getFileAssetById(input.workspaceUuid, input.fileUuid);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(buildWorkspaceFileRouteSummary(file));
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileRouteError(error, WORKSPACE_FILE_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
