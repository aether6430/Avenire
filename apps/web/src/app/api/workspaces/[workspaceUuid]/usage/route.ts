import { NextResponse } from "next/server";
import {
  listWorkspaceFiles,
  listWorkspaceFolders,
  listWorkspaceMembers,
} from "@/lib/file-data";
import { getIngestionFlagsByFileIds } from "@/lib/ingestion-data";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid } = await context.params;
  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceUuid);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [folders, files, members] = await Promise.all([
    listWorkspaceFolders(workspaceUuid),
    listWorkspaceFiles(workspaceUuid),
    listWorkspaceMembers(workspaceUuid),
  ]);

  const ingestionFlags = await getIngestionFlagsByFileIds(
    workspaceUuid,
    files.map((file) => file.id)
  );

  const fileCount = files.length;
  const indexedFileCount = files.reduce(
    (count, file) => count + (ingestionFlags[file.id] ? 1 : 0),
    0
  );

  return NextResponse.json({
    usage: {
      fileCount,
      folderCount: folders.length,
      indexedFileCount,
      memberCount: members.length,
      pendingIngestionCount: Math.max(0, fileCount - indexedFileCount),
      totalSizeBytes: files.reduce((total, file) => total + file.sizeBytes, 0),
    },
  });
}
