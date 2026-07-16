import { createHash } from "node:crypto";
import { deleteIngestionDataForFile } from "@avenire/database";
import type { z } from "zod";
import {
  enqueueIngestionForFile,
  resolveCreateNoteFolder,
} from "@/lib/chat-tools/chat-tool-note-runtime";
import {
  buildNoteContent,
  getFileTags,
  toMarkdownFileName,
} from "@/lib/chat-tools/note-file-helpers";
import {
  buildWorkspacePathMaps,
  fetchWorkspaceFileText,
  isMarkdownFile,
  publishTreeMutationEvents,
} from "@/lib/chat-tools/workspace-file-helpers";
import {
  createWorkspaceNoteFile,
  getFileAssetById,
  listWorkspaceFiles,
  updateFileAsset,
  updateNoteContent,
  userCanEditFile,
} from "@/lib/file-data";

interface NoteOperationContext {
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

type CreateNoteInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["create_note"]["input"]
>;

type ReadNoteInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["read_note"]["input"]
>;

type UpdateNoteInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["update_note"]["input"]
>;

type ListNotesInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["list_notes"]["input"]
>;

type UpdateNoteTagsInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["update_note_tags"]["input"]
>;

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function executeCreateNote(
  ctx: NoteOperationContext,
  input: CreateNoteInput
) {
  const maps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);

  const targetFolderId = await resolveCreateNoteFolder(
    ctx,
    maps,
    input.folderPath
  );
  const content = buildNoteContent({
    content: input.content,
    title: input.title,
  });
  const fileName = toMarkdownFileName(input.title);

  const metadataTags =
    input.tags && input.tags.length > 0
      ? {
          page: {
            bannerUrl: null as string | null,
            icon: null as string | null,
            properties: {
              tags: {
                type: "multi_select" as const,
                value: input.tags,
              },
            },
          },
        }
      : {};

  const file = await createWorkspaceNoteFile({
    baseContent: content,
    content,
    folderId: targetFolderId,
    metadata: {
      agentNote: true,
      ...metadataTags,
    },
    name: fileName,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  });

  if (!file) {
    throw new Error("Unable to create the requested note.");
  }

  await publishTreeMutationEvents({
    fileId: file.id,
    folderId: targetFolderId,
    reason: "file.created",
    workspaceId: ctx.workspaceId,
  });
  await enqueueIngestionForFile({
    fileId: file.id,
    folderId: file.folderId,
    reason: "file.created",
    workspaceId: ctx.workspaceId,
  });

  const newMaps = await buildWorkspacePathMaps(ctx.workspaceId, ctx.userId);

  return {
    content,
    fileId: file.id,
    title: file.name,
    workspacePath: newMaps.filePathById.get(file.id) ?? file.name,
  };
}

export async function executeReadNote(
  ctx: NoteOperationContext,
  input: ReadNoteInput
) {
  const [maps, file] = await Promise.all([
    buildWorkspacePathMaps(ctx.workspaceId, ctx.userId),
    getFileAssetById(ctx.workspaceId, input.fileId),
  ]);

  if (!file) {
    throw new Error(`Note not found: ${input.fileId}`);
  }

  if (!isMarkdownFile(file)) {
    throw new Error(`File is not a markdown note: ${input.fileId}`);
  }

  const content = await fetchWorkspaceFileText(file);
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error("The requested note has no readable content.");
  }

  return {
    content,
    contentSha256: sha256Hex(content),
    fileId: file.id,
    tags: getFileTags(file),
    title: file.name,
    updatedAt: file.updatedAt,
    wordCount: trimmedContent.split(/\s+/).length,
    workspacePath: maps.filePathById.get(file.id) ?? file.name,
  };
}

export async function executeUpdateNote(
  ctx: NoteOperationContext,
  input: UpdateNoteInput
) {
  const [maps, file] = await Promise.all([
    buildWorkspacePathMaps(ctx.workspaceId, ctx.userId),
    getFileAssetById(ctx.workspaceId, input.fileId),
  ]);

  if (!file) {
    throw new Error(`Note not found: ${input.fileId}`);
  }

  if (!isMarkdownFile(file)) {
    throw new Error(`File is not a markdown note: ${input.fileId}`);
  }

  const canEdit = await userCanEditFile({
    workspaceId: ctx.workspaceId,
    fileId: file.id,
    userId: ctx.userId,
  });

  if (!canEdit) {
    throw new Error("The requested note is read-only.");
  }

  const currentContent = await fetchWorkspaceFileText(file);
  if (sha256Hex(currentContent) !== input.baseContentSha256) {
    throw new Error(
      "The note changed after the AI read it. Re-read the note and ask for approval again."
    );
  }

  const nextContent =
    input.mode === "append"
      ? `${currentContent}\n\n${input.content}`
      : input.content;

  const updated = await updateNoteContent({
    baseContent: currentContent,
    fileId: file.id,
    userId: ctx.userId,
    content: nextContent,
  });

  if (!updated) {
    throw new Error("Unable to update the requested note.");
  }

  await deleteIngestionDataForFile(ctx.workspaceId, file.id);
  await publishTreeMutationEvents({
    fileId: file.id,
    folderId: file.folderId,
    reason: "file.updated",
    workspaceId: ctx.workspaceId,
  });
  await enqueueIngestionForFile({
    fileId: file.id,
    folderId: file.folderId,
    workspaceId: ctx.workspaceId,
  });

  return {
    content: nextContent,
    fileId: file.id,
    previousContent: currentContent,
    title: file.name,
    updatedAt: updated.updatedAt.toISOString(),
    workspacePath: maps.filePathById.get(file.id) ?? file.name,
  };
}

export async function executeListNotes(
  ctx: NoteOperationContext,
  input: ListNotesInput
) {
  const [maps, allFiles] = await Promise.all([
    buildWorkspacePathMaps(ctx.workspaceId, ctx.userId),
    listWorkspaceFiles(ctx.workspaceId, ctx.userId),
  ]);
  const noteFiles = allFiles.filter(isMarkdownFile);
  const maxNotes = input.maxNotes ?? 20;

  const notes: Array<{
    contentPreview: string;
    fileId: string;
    tags?: string[];
    title: string;
    updatedAt: string;
    wordCount: number;
    workspacePath: string;
  }> = [];

  for (const file of noteFiles.slice(0, maxNotes)) {
    try {
      const content = await fetchWorkspaceFileText(file);
      notes.push({
        contentPreview: content.slice(0, 200),
        fileId: file.id,
        tags: getFileTags(file),
        title: file.name,
        updatedAt: file.updatedAt,
        wordCount: content.split(/\s+/).length,
        workspacePath: maps.filePathById.get(file.id) ?? file.name,
      });
    } catch {}
  }

  return {
    notes,
    totalCount: noteFiles.length,
  };
}

export async function executeUpdateNoteTags(
  ctx: NoteOperationContext,
  input: UpdateNoteTagsInput
) {
  const [maps, file] = await Promise.all([
    buildWorkspacePathMaps(ctx.workspaceId, ctx.userId),
    getFileAssetById(ctx.workspaceId, input.fileId),
  ]);

  if (!file) {
    throw new Error(`Note not found: ${input.fileId}`);
  }

  const currentTags = getFileTags(file);
  const mode = input.mode ?? "replace";

  const nextTags =
    mode === "replace"
      ? [...input.tags]
      : mode === "add"
        ? [...new Set([...currentTags, ...input.tags])]
        : currentTags.filter((tag) => !input.tags.includes(tag));

  const currentPage = file.page ?? {
    bannerUrl: null as string | null,
    icon: null as string | null,
    properties: {},
  };

  const updated = await updateFileAsset(ctx.workspaceId, file.id, ctx.userId, {
    metadata: {
      page: {
        ...currentPage,
        properties: {
          ...(currentPage as { properties?: Record<string, unknown> })
            .properties,
          tags: {
            type: "multi_select" as const,
            value: nextTags,
          },
        },
      },
    },
  });

  if (!updated) {
    throw new Error("Unable to update note tags.");
  }

  return {
    fileId: file.id,
    tags: nextTags,
  };
}
