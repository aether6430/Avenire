import { after, NextResponse } from "next/server";
import {
  getAccessibleMarkdownNoteForUser,
  upsertMarkdownFileContent,
  userCanEditFile,
} from "@/lib/file-data";
import { deleteUploadThingFile } from "@/lib/upload-registration";
import { normalizePageMetadataState } from "@/lib/frontmatter";
import {
  buildNoteSyncGetResponse,
  normalizeNoteSyncId,
} from "./note-sync-route-model";

export async function handleNoteSyncRouteGet(input: {
  noteId: string;
  userId: string;
}) {
  const noteId = normalizeNoteSyncId(input.noteId);
  const accessibleNote = await getAccessibleMarkdownNoteForUser({
    fileId: noteId,
    userId: input.userId,
  });
  if (!accessibleNote) {
    return NextResponse.json(
      { error: "Markdown file not found" },
      { status: 404 }
    );
  }
  const { file, note, workspaceId } = accessibleNote;
  const page = normalizePageMetadataState(file.page);

  if (note?.content != null) {
    return NextResponse.json(
      buildNoteSyncGetResponse({
        markdown: note.content,
        page,
        updatedAt: note.updatedAt?.toISOString() ?? file.updatedAt,
        version: note.version ?? 0,
      })
    );
  }

  const response = await fetch(file.storageUrl, { cache: "no-store" }).catch(
    () => null
  );
  if (!response?.ok) {
    return NextResponse.json(
      buildNoteSyncGetResponse({
        markdown: "",
        page,
        updatedAt: file.updatedAt,
        version: 0,
      })
    );
  }

  const markdown = await response.text();
  after(async () => {
    const canEdit = await userCanEditFile({
      workspaceId,
      fileId: noteId,
      userId: input.userId,
    });

    if (!canEdit) {
      return;
    }

    const migrated = await upsertMarkdownFileContent({
      content: markdown,
      fileId: noteId,
      userId: input.userId,
      workspaceId,
    });

    if (
      migrated?.previousStorageKey &&
      migrated.previousStorageKey !== migrated.file.storageKey
    ) {
      void deleteUploadThingFile(migrated.previousStorageKey);
    }
  });

  return NextResponse.json(
    buildNoteSyncGetResponse({
      markdown,
      page,
      updatedAt: file.updatedAt,
      version: 0,
    })
  );
}
