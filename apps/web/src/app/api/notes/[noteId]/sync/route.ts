import { merge } from "node-diff3";
import { NextResponse } from "next/server";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import {
  deleteIngestionDataForFile,
  getFileAssetById,
  getNoteContent,
  getWorkspaceIdForFile,
  updateNoteContent,
  userCanEditFile,
} from "@/lib/file-data";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

const NOTE_REINDEX_DEBOUNCE_MS = 3000;

export async function GET(
  _request: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const workspaceId = await getWorkspaceIdForFile(noteId);
  if (!workspaceId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  const canAccess = await ensureWorkspaceAccessForUser(user.id, workspaceId);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await getFileAssetById(workspaceId, noteId);
  if (!file?.isNote) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const note = await getNoteContent(noteId);

  return NextResponse.json({
    markdown: note?.content ?? "",
    updatedAt: note?.updatedAt?.toISOString() ?? file.updatedAt,
    version: note?.version ?? 0,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const workspaceId = await getWorkspaceIdForFile(noteId);
  if (!workspaceId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const canEdit = await userCanEditFile({
    workspaceId,
    fileId: noteId,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only note" }, { status: 403 });
  }

  const file = await getFileAssetById(workspaceId, noteId);
  if (!file?.isNote) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    base?: string;
    current?: string;
  };
  if (typeof body.base !== "string" || typeof body.current !== "string") {
    return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  }

  const note = await getNoteContent(noteId);
  const serverMarkdown = note?.content ?? "";
  const currentVersion = note?.version ?? 0;
  const mergedResult = merge(
    body.current.split("\n"),
    body.base.split("\n"),
    serverMarkdown.split("\n"),
    { stringSeparator: /\n/ }
  );
  const merged = mergedResult.result.join("\n");

  const updated = await updateNoteContent({
    baseContent: body.base,
    content: merged,
    fileId: noteId,
    userId: user.id,
    version: currentVersion + 1,
  });

  if (!updated) {
    return NextResponse.json({ error: "Unable to sync note" }, { status: 500 });
  }

  if (merged.trim().length === 0) {
    await deleteIngestionDataForFile(workspaceId, noteId);
  } else {
    await scheduleIngestionJob({
      workspaceId,
      fileId: noteId,
      sourceType: "markdown",
      delayMs: NOTE_REINDEX_DEBOUNCE_MS,
    });
  }

  return NextResponse.json({
    hasConflict: mergedResult.conflict,
    merged,
    updatedAt: updated.updatedAt.toISOString(),
    version: updated.version,
  });
}
