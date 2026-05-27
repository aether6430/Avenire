import { getIngestionFlagsByFileIds } from "@avenire/database";
import { NextResponse } from "next/server";
import {
  listWorkspaceFiles,
  listWorkspaceFolders,
  listWorkspaceMembers,
} from "@/lib/file-data";
import {
  buildWorkspaceUsagePayload,
  resolveWorkspaceUsageRouteError,
  WORKSPACE_USAGE_LOAD_ERROR,
} from "./workspace-usage-route-model";

export async function handleWorkspaceUsageRouteGet(input: {
  workspaceUuid: string;
}) {
  try {
    const [folders, files, members] = await Promise.all([
      listWorkspaceFolders(input.workspaceUuid),
      listWorkspaceFiles(input.workspaceUuid),
      listWorkspaceMembers(input.workspaceUuid),
    ]);

    const ingestionFlags = await getIngestionFlagsByFileIds(
      input.workspaceUuid,
      files.map((file) => file.id)
    );

    return NextResponse.json(
      buildWorkspaceUsagePayload({
        files,
        folders,
        ingestionFlags,
        members,
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceUsageRouteError(
          error,
          WORKSPACE_USAGE_LOAD_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
