import { generateText, Output } from "@avenire/ai";
import { apollo } from "@avenire/ai/models";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import {
  noteDraftSchema,
  noteRewriteSchema,
} from "@/lib/chat-tools/chat-tool-models";
import {
  getFileTags,
  normalizeTagList,
  sanitizeNoteTitle,
  stripLeadingTitleHeading,
  type TagDirective,
} from "@/lib/chat-tools/note-file-helpers";
import {
  type ExplorerFileLike,
  ensureWritableTargetFolder,
  resolveFolderIdByPathHint,
  type WorkspacePathMaps,
} from "@/lib/chat-tools/workspace-file-helpers";
import { createFolder, updateFileAsset } from "@/lib/file-data";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";

const NOTES_FOLDER_NAME = "Notes";

interface NoteRuntimeContext {
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

export async function generateNoteDraftFromTask(input: {
  task: string;
  titleHint?: string | null;
}) {
  const result = await generateText({
    model: apollo.languageModel("apollo-core"),
    output: Output.object({ schema: noteDraftSchema }),
    prompt: [
      "Write a clean markdown note from the request.",
      "Return a concise, specific title and a polished markdown body.",
      "Do not include frontmatter or code fences unless the note explicitly needs them.",
      "Do not include a top-level H1 heading in bodyMarkdown.",
      input.titleHint
        ? `Use this exact note title: ${sanitizeNoteTitle(input.titleHint)}`
        : "Generate the note title from the request.",
      `Request:\n${input.task}`,
    ].join("\n\n"),
    maxOutputTokens: 5000,
    temperature: 0.25,
  });

  const title = sanitizeNoteTitle(input.titleHint ?? result.output.title);
  const body = stripLeadingTitleHeading(result.output.bodyMarkdown, title);

  return {
    bodyMarkdown: body.length > 0 ? body : result.output.bodyMarkdown.trim(),
    title,
  };
}

export async function rewriteNoteFromTask(input: {
  currentMarkdown: string;
  fileName: string;
  task: string;
}) {
  const result = await generateText({
    model: apollo.languageModel("apollo-core"),
    output: Output.object({ schema: noteRewriteSchema }),
    prompt: [
      "Revise the markdown note to satisfy the edit request.",
      "Return the full updated markdown note, not a diff.",
      "Preserve useful structure and existing detail unless the request clearly asks to remove or reorganize content.",
      "Do not add commentary outside the note.",
      `Edit request:\n${input.task}`,
      `Current note (${input.fileName}):\n${input.currentMarkdown}`,
    ].join("\n\n"),
    maxOutputTokens: 8000,
    temperature: 0.2,
  });

  return `${result.output.markdown.trim()}\n`;
}

export async function updateFileTags(params: {
  file: ExplorerFileLike;
  tagDirective: TagDirective | null;
  userId: string;
  workspaceId: string;
}) {
  if (!params.tagDirective) {
    return params.file;
  }

  const currentTags = getFileTags(params.file);
  const directive = params.tagDirective;
  const nextTags =
    directive.action === "replace"
      ? directive.tags
      : directive.action === "add"
        ? normalizeTagList([...currentTags, ...directive.tags])
        : currentTags.filter((tag) => !directive.tags.includes(tag));

  const currentPage = params.file.page ?? {
    bannerUrl: null,
    icon: null,
    properties: {},
  };

  const nextFile = await updateFileAsset(
    params.workspaceId,
    params.file.id,
    params.userId,
    {
      metadata: {
        page: {
          ...currentPage,
          properties: {
            ...currentPage.properties,
            tags: {
              type: "multi_select",
              value: nextTags,
            },
          },
        },
      },
    }
  );

  return nextFile ?? params.file;
}

async function ensureNotesFolder(input: NoteRuntimeContext) {
  const folder = await createFolder(
    input.workspaceId,
    input.rootFolderId,
    NOTES_FOLDER_NAME,
    input.userId
  );

  if (!folder) {
    throw new Error("Unable to create or resolve the Notes folder.");
  }

  return folder;
}

export async function resolveCreateNoteFolder(
  ctx: NoteRuntimeContext,
  maps: WorkspacePathMaps,
  hint?: string
) {
  if (hint && hint.trim().length > 0) {
    const existingFolderId = resolveFolderIdByPathHint(
      maps,
      ctx.rootFolderId,
      hint
    );
    if (existingFolderId) {
      await ensureWritableTargetFolder(ctx, existingFolderId);
      return existingFolderId;
    }
  }

  const notesFolder = await ensureNotesFolder(ctx);
  await ensureWritableTargetFolder(ctx, notesFolder.id);
  return notesFolder.id;
}

export async function enqueueIngestionForFile(input: {
  fileId: string;
  folderId?: string;
  workspaceId: string;
}) {
  const ingestionJob = await scheduleIngestionJob({
    workspaceId: input.workspaceId,
    fileId: input.fileId,
  }).catch(() => null);

  await Promise.allSettled([
    publishWorkspaceStreamEvent({
      workspaceUuid: input.workspaceId,
      type: "upload.finalized",
      payload: {
        deduplicated: false,
        fileId: input.fileId,
        folderId: input.folderId ?? null,
        workspaceUuid: input.workspaceId,
      },
    }),
    ...(ingestionJob
      ? [
          publishWorkspaceStreamEvent({
            workspaceUuid: input.workspaceId,
            type: "ingestion.job",
            payload: {
              createdAt: new Date().toISOString(),
              eventType: "job.queued",
              jobId: ingestionJob.id,
              payload: { status: "queued", source: "chat.tools" },
              workspaceId: input.workspaceId,
            },
          }),
        ]
      : []),
  ]);

  return ingestionJob;
}
