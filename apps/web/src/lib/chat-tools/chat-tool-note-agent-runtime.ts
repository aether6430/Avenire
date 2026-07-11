import { deleteIngestionDataForFile } from "@avenire/database";
import type { z } from "zod";
import {
  enqueueIngestionForFile,
  generateNoteDraftFromTask,
  resolveCreateNoteFolder,
  rewriteNoteFromTask,
  updateFileTags,
} from "@/lib/chat-tools/chat-tool-note-runtime";
import {
  buildNoteContent,
  extractTagDirective,
  getFileTags,
  parseRequestedNoteDestination,
  toMarkdownFileName,
} from "@/lib/chat-tools/note-file-helpers";
import {
  buildWorkspacePathMaps,
  fetchWorkspaceFileText,
  findTargetNoteFile,
  isMarkdownFile,
  publishTreeMutationEvents,
} from "@/lib/chat-tools/workspace-file-helpers";
import {
  createWorkspaceNoteFile,
  listWorkspaceFiles,
  updateNoteContent,
  userCanEditFile,
} from "@/lib/file-data";

interface NoteAgentRuntimeContext {
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

type NoteAgentInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["note_agent"]["input"]
>;

export async function executeNoteAgent(
  ctx: NoteAgentRuntimeContext,
  input: NoteAgentInput
) {
  const maxNotes = input.maxNotes ?? 3;
  const task = input.task.toLowerCase();

  const [maps, allFiles] = await Promise.all([
    buildWorkspacePathMaps(ctx.workspaceId, ctx.userId),
    listWorkspaceFiles(ctx.workspaceId, ctx.userId),
  ]);
  const noteFiles = allFiles.filter(isMarkdownFile);

  let operation: "created" | "read" | "updated" | "listed" = "listed";
  const notes: Array<{
    contentPreview: string;
    fileId: string;
    tags?: string[];
    title: string;
    updatedAt: string;
    wordCount: number;
    workspacePath: string;
  }> = [];

  if (
    task.includes("create") ||
    task.includes("new") ||
    task.includes("write")
  ) {
    operation = "created";
    const tagDirective = extractTagDirective(input.task);
    const destination = parseRequestedNoteDestination(input.task);
    const draft = await generateNoteDraftFromTask({
      task: input.task,
      titleHint: destination.title,
    });
    const targetFolderId = await resolveCreateNoteFolder(
      ctx,
      maps,
      destination.folderHint
    );
    const content = buildNoteContent({
      content: draft.bodyMarkdown,
      title: draft.title,
    });
    const fileName = destination.fileName || toMarkdownFileName(draft.title);
    const file = await createWorkspaceNoteFile({
      baseContent: content,
      content,
      folderId: targetFolderId,
      metadata: {
        agentNote: true,
        ...(tagDirective && tagDirective.tags.length > 0
          ? {
              page: {
                bannerUrl: null,
                icon: null,
                properties: {
                  tags: {
                    type: "multi_select",
                    value: tagDirective.tags,
                  },
                },
              },
            }
          : {}),
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
    notes.push({
      contentPreview: content.slice(0, 500),
      fileId: file.id,
      tags: getFileTags(file),
      title: file.name,
      updatedAt: file.updatedAt,
      wordCount: content.split(/\s+/).length,
      workspacePath: newMaps.filePathById.get(file.id) ?? file.name,
    });
  } else if (
    task.includes("read") ||
    task.includes("show") ||
    task.includes("what")
  ) {
    operation = "read";
    const requestedDestination = parseRequestedNoteDestination(input.task);
    const hasExplicitTarget = Boolean(
      requestedDestination.fileName ||
        input.task.match(/workspace-file:\/\/[a-z0-9-]+/i) ||
        input.task.match(/\bfile\s*id\b\s*[:=]\s*([a-z0-9-]+)/i) ||
        input.task.match(/\bfileId\b\s*[:=]\s*([a-z0-9-]+)/i)
    );
    const targetNote = findTargetNoteFile({
      maps,
      noteFiles,
      task: input.task,
    });
    if (!targetNote && hasExplicitTarget) {
      throw new Error("The requested note could not be found.");
    }

    const relevantNotes = targetNote
      ? [targetNote]
      : noteFiles.slice(0, maxNotes);
    for (const file of relevantNotes) {
      try {
        const content = await fetchWorkspaceFileText(file, 500);
        const trimmedContent = content.trim();
        if (!trimmedContent) {
          if (targetNote?.id === file.id) {
            throw new Error("The requested note has no readable content.");
          }
          continue;
        }
        notes.push({
          contentPreview: trimmedContent.slice(0, 500),
          fileId: file.id,
          tags: getFileTags(file),
          title: file.name,
          updatedAt: file.updatedAt,
          wordCount: trimmedContent.split(/\s+/).length,
          workspacePath: maps.filePathById.get(file.id) ?? file.name,
        });
      } catch (error) {
        if (targetNote?.id === file.id) {
          throw error;
        }
      }
    }
  } else if (
    task.includes("update") ||
    task.includes("add") ||
    task.includes("append")
  ) {
    operation = "updated";
    const requestedDestination = parseRequestedNoteDestination(input.task);
    const hasExplicitTarget = Boolean(
      requestedDestination.fileName ||
        input.task.match(/workspace-file:\/\/[a-z0-9-]+/i) ||
        input.task.match(/\bfile\s*id\b\s*[:=]\s*([a-z0-9-]+)/i) ||
        input.task.match(/\bfileId\b\s*[:=]\s*([a-z0-9-]+)/i)
    );
    const noteFile = findTargetNoteFile({
      maps,
      noteFiles,
      requireExplicitTarget: true,
      task: input.task,
    });
    if (noteFile) {
      const tagDirective = extractTagDirective(input.task);
      const canEdit = await userCanEditFile({
        workspaceId: ctx.workspaceId,
        fileId: noteFile.id,
        userId: ctx.userId,
      });
      if (canEdit) {
        const currentContent = await fetchWorkspaceFileText(noteFile, 50_000);
        const nextContent = await rewriteNoteFromTask({
          currentMarkdown: currentContent,
          fileName: noteFile.name,
          task: input.task,
        });
        const updated = await updateNoteContent({
          baseContent: currentContent,
          fileId: noteFile.id,
          userId: ctx.userId,
          content: nextContent,
        });
        if (updated) {
          const fileWithTags = await updateFileTags({
            file: noteFile,
            tagDirective,
            userId: ctx.userId,
            workspaceId: ctx.workspaceId,
          });
          await deleteIngestionDataForFile(ctx.workspaceId, noteFile.id);
          await publishTreeMutationEvents({
            fileId: noteFile.id,
            folderId: noteFile.folderId,
            reason: "file.updated",
            workspaceId: ctx.workspaceId,
          });
          await enqueueIngestionForFile({
            fileId: noteFile.id,
            folderId: noteFile.folderId,
            workspaceId: ctx.workspaceId,
          });
          notes.push({
            contentPreview: nextContent.slice(0, 500),
            fileId: noteFile.id,
            tags: getFileTags(fileWithTags),
            title: noteFile.name,
            updatedAt: updated.updatedAt.toISOString(),
            wordCount: nextContent.split(/\s+/).length,
            workspacePath: maps.filePathById.get(noteFile.id) ?? noteFile.name,
          });
        } else if (hasExplicitTarget) {
          throw new Error("Unable to update the requested note.");
        }
      } else if (hasExplicitTarget) {
        throw new Error("The requested note is read-only.");
      }
    } else if (hasExplicitTarget) {
      throw new Error("The requested note could not be found.");
    }
  } else {
    operation = "listed";
    for (const file of noteFiles.slice(0, maxNotes)) {
      try {
        const content = await fetchWorkspaceFileText(file, 200);
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
  }

  return {
    notes,
    operation,
    summary: `${operation} ${notes.length} note(s)`,
    task: input.task,
  };
}
