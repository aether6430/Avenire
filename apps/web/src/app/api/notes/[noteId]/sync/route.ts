import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { after, NextResponse } from "next/server";
import { merge } from "node-diff3";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import {
  deleteIngestionDataForFile,
  getAccessibleMarkdownNoteForUser,
  getFileAssetById,
  getNoteContent,
  getWorkspaceIdForFile,
  isMarkdownFileRecord,
  upsertMarkdownFileContent,
  userCanEditFile,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { deleteUploadThingFile } from "@/lib/upload-registration";
import { getSessionUser } from "@/lib/workspace";
import { parseJsonRequest } from "@/lib/api-request";
import { noteSyncSchema } from "../../note-route-model";

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
  const accessibleNote = await getAccessibleMarkdownNoteForUser({
    fileId: noteId,
    userId: user.id,
  });
  if (!accessibleNote) {
    return NextResponse.json(
      { error: "Markdown file not found" },
      { status: 404 }
    );
  }
  const { file, note, workspaceId } = accessibleNote;

  if (note?.content != null) {
    return NextResponse.json({
      markdown: note.content,
      updatedAt: note.updatedAt?.toISOString() ?? file.updatedAt,
      version: note.version ?? 0,
    });
  }

  const response = await fetch(file.storageUrl, { cache: "no-store" }).catch(
    () => null
  );
  if (!response?.ok) {
    return NextResponse.json({
      markdown: "",
      updatedAt: file.updatedAt,
      version: 0,
    });
  }

  const markdown = await response.text();
  after(async () => {
    const canEdit = await userCanEditFile({
      workspaceId,
      fileId: noteId,
      userId: user.id,
    });

    if (!canEdit) {
      return;
    }

    const migrated = await upsertMarkdownFileContent({
      content: markdown,
      fileId: noteId,
      userId: user.id,
      workspaceId,
    });

    if (
      migrated?.previousStorageKey &&
      migrated.previousStorageKey !== migrated.file.storageKey
    ) {
      void deleteUploadThingFile(migrated.previousStorageKey);
    }
  });

  return NextResponse.json({
    markdown,
    updatedAt: file.updatedAt,
    version: 0,
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
  if (!(file && isMarkdownFileRecord(file))) {
    return NextResponse.json(
      { error: "Markdown file not found" },
      { status: 404 }
    );
  }

  const parsed = await parseJsonRequest(request, noteSyncSchema);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sync payload" },
      { status: 400 }
    );
  }
  const body = parsed.data;

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

  const updated = await upsertMarkdownFileContent({
    content: merged,
    fileId: noteId,
    userId: user.id,
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

  return NextResponse.json({
    hasConflict: mergedResult.conflict,
    merged,
    updatedAt: updated.updatedAt.toISOString(),
    version: updated.version,
  });
}
