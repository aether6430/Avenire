import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  deleteIngestionDataForFile,
  getFileAssetById,
  getWorkspaceIdForFile,
  isMarkdownFileRecord,
  updateFileAsset,
  upsertMarkdownFileContent,
  userCanEditFile,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  type NoteRoutePatchBody,
  resolveNoteRoutePatchUpdate,
} from "./note-route-model";

export const NOTE_REINDEX_DEBOUNCE_MS = 3000;

export async function handleNoteRoutePatch(input: {
  body: NoteRoutePatchBody;
  noteId: string;
  userId: string;
}) {
  const workspaceId = await getWorkspaceIdForFile(input.noteId);
  if (!workspaceId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const canEdit = await userCanEditFile({
    workspaceId,
    fileId: input.noteId,
    userId: input.userId,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only note" }, { status: 403 });
  }

  const file = await getFileAssetById(workspaceId, input.noteId);
  if (!file) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  if (!isMarkdownFileRecord(file)) {
    return NextResponse.json({ error: "Not a markdown file" }, { status: 400 });
  }

  const resolved = resolveNoteRoutePatchUpdate({
    body: input.body,
    existingPage: file.page ?? null,
  });
  if (!resolved.isValid) {
    return NextResponse.json({ error: "Invalid note update" }, { status: 400 });
  }

  const [updatedNote, updatedFile] = await Promise.all([
    resolved.hasContent
      ? upsertMarkdownFileContent({
          fileId: input.noteId,
          userId: input.userId,
          content: resolved.nextContent ?? "",
          workspaceId,
        })
      : Promise.resolve(null),
    resolved.hasPage
      ? updateFileAsset(workspaceId, input.noteId, input.userId, {
          metadata: {
            page: resolved.nextPage,
          },
        })
      : Promise.resolve(file),
  ]);

  if (resolved.hasContent && !updatedNote) {
    return NextResponse.json({ error: "Unable to save note" }, { status: 500 });
  }
  if (resolved.hasPage && !updatedFile) {
    return NextResponse.json(
      { error: "Unable to update note metadata" },
      { status: 500 }
    );
  }

  if (resolved.hasContent && !resolved.trimmedContent) {
    await deleteIngestionDataForFile(workspaceId, input.noteId);
  } else if (resolved.hasContent) {
    await scheduleIngestionJob({
      workspaceId,
      fileId: input.noteId,
      sourceType: "markdown",
      delayMs: NOTE_REINDEX_DEBOUNCE_MS,
    });
  }

  await publishFilesInvalidationEvent({
    workspaceUuid: workspaceId,
    folderId: file.folderId || undefined,
    fileId: input.noteId,
    reason: "file.updated",
  });
  await invalidateWorkspaceReadCaches(workspaceId);

  return NextResponse.json({
    page: resolved.hasPage
      ? (updatedFile?.page ?? resolved.nextPage)
      : (file.page ?? null),
    updatedAt:
      updatedNote?.updatedAt ?? updatedFile?.updatedAt ?? file.updatedAt,
  });
}
