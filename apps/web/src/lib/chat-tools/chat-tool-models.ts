import { z } from "zod";

export const flashcardGenerationSchema = z.object({
  cards: z
    .array(
      z.object({
        backMarkdown: z.string().min(1),
        frontMarkdown: z.string().min(1),
        notesMarkdown: z.string().nullable().optional(),
        tags: z.array(z.string()).max(12).optional(),
      })
    )
    .min(1)
    .max(24),
  title: z.string().min(1),
});

export const quizGenerationSchema = z.object({
  questions: z
    .array(
      z.object({
        backMarkdown: z.string().min(1),
        correctOptionIndex: z.number().int().nonnegative(),
        explanation: z.string().nullable().optional(),
        frontMarkdown: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(8),
        tags: z.array(z.string()).max(12).optional(),
      })
    )
    .min(3)
    .max(5),
  title: z.string().min(1),
});

export const agentSelectionSchema = z.object({
  indices: z.array(z.number().int().nonnegative()).max(6),
});

export const noteDraftSchema = z.object({
  bodyMarkdown: z.string().min(1),
  title: z.string().min(1).max(120),
});

export const noteRewriteSchema = z.object({
  markdown: z.string().min(1),
});

export function buildAgentSelectionPrompt(params: {
  query: string;
  matches: Array<{
    fileId: string | null;
    workspacePath: string;
    snippet: string;
    sourceType: string;
  }>;
  maxFiles: number;
}) {
  const matchLines =
    params.matches.length > 0
      ? params.matches
          .map(
            (match, index) =>
              `${index}. ${match.workspacePath} (${match.sourceType}) fileId=${match.fileId ?? "none"} :: ${match.snippet.slice(0, 220)}`
          )
          .join("\n")
      : "None";

  return [
    "You are a retrieval agent.",
    "Select the most relevant files to open based on the query.",
    "Prefer markdown/text files when possible.",
    `Select up to ${params.maxFiles} items.`,
    'Return JSON with this shape: {"indices": number[]}.',
    `Query: ${params.query}`,
    "Results:",
    matchLines,
  ].join("\n\n");
}

export function buildFileManagerSelectionPrompt(params: {
  files: Array<{
    fileId: string;
    mimeType: string | null;
    updatedAt: string;
    workspacePath: string;
  }>;
  maxFiles: number;
  task: string;
}) {
  const fileLines =
    params.files.length > 0
      ? params.files
          .map(
            (file, index) =>
              `${index}. ${file.workspacePath} :: fileId=${file.fileId} :: mime=${file.mimeType ?? "unknown"} :: updatedAt=${file.updatedAt}`
          )
          .join("\n")
      : "None";

  return [
    "You are a file manager agent.",
    "Select the files that should be inspected before responding to the task.",
    "Prefer files whose paths clearly match the task.",
    `Select up to ${params.maxFiles} items.`,
    'Return JSON with this shape: {"indices": number[]}.',
    `Task: ${params.task}`,
    "Workspace files:",
    fileLines,
  ].join("\n\n");
}
