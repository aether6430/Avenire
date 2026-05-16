import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import { merge } from "node-diff3";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  deleteIngestionDataForFile,
  getFileAssetById,
  getNoteContent,
  getWorkspaceIdForFile,
  isMarkdownFileRecord,
  upsertMarkdownFileContent,
  userCanEditFile,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  buildNoteSyncPostResponse,
  NOTE_SYNC_INVALID_PAYLOAD_ERROR,
  normalizeNoteSyncId,
  parseNoteSyncPostPayload,
} from "./note-sync-route-model";

const NOTE_REINDEX_DEBOUNCE_MS = 3000;

export async function handleNoteSyncRoutePost(input: {
  noteId: string;
  request: Request;
  userId: string;
}) {
  const noteId = normalizeNoteSyncId(input.noteId);
  const workspaceId = await getWorkspaceIdForFile(noteId);
  if (!workspaceId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const canEdit = await userCanEditFile({
    workspaceId,
    fileId: noteId,
    userId: input.userId,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only note" }, { status: 403 });
  }

  const file = await getFileAssetById(workspaceId, noteId);
  if (!(file && isMarkdownFileRecord(file))) {
    return NextResponse.json(
      { error: "Markdown file not found" },
      { status: 404 }
    );
  }

  const payload = await input.request.json().catch(() => ({}));
  const parsed = parseNoteSyncPostPayload(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: NOTE_SYNC_INVALID_PAYLOAD_ERROR },
      { status: 400 }
    );
  }

  const note = await getNoteContent(noteId);
  const serverMarkdown = note?.content ?? "";
  const currentVersion = note?.version ?? 0;
  const mergedResult = merge(
    parsed.data.current.split("\n"),
    parsed.data.base.split("\n"),
    serverMarkdown.split("\n"),
    { stringSeparator: /\n/ }
  );
  const merged = mergedResult.result.join("\n");

  const updated = await upsertMarkdownFileContent({
    content: merged,
    fileId: noteId,
    userId: input.userId,
    workspaceId,
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

  await publishFilesInvalidationEvent({
    workspaceUuid: workspaceId,
    folderId: file.folderId ?? undefined,
    fileId: noteId,
    reason: "file.updated",
  });
  await invalidateWorkspaceReadCaches(workspaceId);

  return NextResponse.json(
    buildNoteSyncPostResponse({
      hasConflict: mergedResult.conflict,
      merged,
      updatedAt: updated.updatedAt.toISOString(),
      version: updated.version,
    })
  );
}
