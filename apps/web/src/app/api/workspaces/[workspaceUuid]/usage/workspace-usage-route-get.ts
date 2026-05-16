import { NextResponse } from "next/server";
import {
  listWorkspaceFiles,
  listWorkspaceFolders,
  listWorkspaceMembers,
} from "@/lib/file-data";
import { getIngestionFlagsByFileIds } from "@/lib/ingestion-data";
import { buildWorkspaceUsagePayload } from "./workspace-usage-route-model";

export async function handleWorkspaceUsageRouteGet(input: {
  workspaceUuid: string;
}) {
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
}
