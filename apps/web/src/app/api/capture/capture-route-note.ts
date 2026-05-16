import { NextResponse } from "next/server";
import { createWorkspaceNoteFile } from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { ensureNotesFolder } from "@/lib/quick-capture";
import type { CaptureRequestBody } from "./capture-route-model";
import { resolveNoteCapturePayload } from "./capture-route-model";

export async function handleCaptureNote(input: {
  body: CaptureRequestBody;
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}) {
  const payload = resolveNoteCapturePayload(input.body);
  if (!payload.title) {
    return NextResponse.json(
      { error: "Note title is required" },
      { status: 400 }
    );
  }

  const notesFolder = await ensureNotesFolder({
    rootFolderId: input.rootFolderId,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  const note = await createWorkspaceNoteFile({
    content: payload.content
      ? `# ${payload.title}\n\n${payload.content}\n`
      : `# ${payload.title}\n`,
    folderId: notesFolder.id,
    metadata: { type: "note", quickCapture: true },
    name: payload.title,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  await publishFilesInvalidationEvent({
    folderId: notesFolder.id,
    reason: "file.created",
    workspaceUuid: input.workspaceId,
  });
  await publishFilesInvalidationEvent({
    reason: "tree.changed",
    workspaceUuid: input.workspaceId,
  });

  return NextResponse.json({ kind: "note", note }, { status: 201 });
}
