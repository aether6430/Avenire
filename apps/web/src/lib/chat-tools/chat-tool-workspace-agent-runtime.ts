import { generateText, Output, zodSchema } from "@avenire/ai";
import type {
  AgentActivityAction,
  AgentActivityData,
} from "@avenire/ai/message-types";
import { apollo } from "@avenire/ai/models";
import type { z } from "zod";
import {
  agentSelectionSchema,
  buildAgentSelectionPrompt,
  buildFileManagerSelectionPrompt,
} from "@/lib/chat-tools/chat-tool-models";
import { buildCitationMarkdown } from "@/lib/chat-tools/study-tool-helpers";
import {
  buildWorkspacePathMaps,
  getWorkspacePathForFile,
  resolveFileExcerpt,
  resolveWorkspaceSearchMatches,
} from "@/lib/chat-tools/workspace-file-helpers";
import { listWorkspaceFiles } from "@/lib/file-data";

const DEFAULT_SEARCH_LIMIT = 8;
const AGENT_DEFAULT_MATCH_LIMIT = 10;
const AGENT_DEFAULT_MAX_FILES = 3;
const AGENT_MAX_FILE_CHARS = 4000;
const AGENT_MAX_OUTPUT_TOKENS = 220;
const FILE_MANAGER_DEFAULT_MAX_FILES = 4;
const FILE_MANAGER_LIST_LIMIT = 120;
const FILE_MANAGER_MAX_FILE_CHARS = 5000;
const FILE_MANAGER_MAX_OUTPUT_TOKENS = 260;

type SearchMaterialsInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["search_materials"]["input"]
>;

type AvenireAgentInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["avenire_agent"]["input"]
>;

type FileManagerAgentInput = z.infer<
  typeof import("@avenire/ai/tools").chatToolSchemas["file_manager_agent"]["input"]
>;

interface WorkspaceAgentRuntimeContext {
  agentActivityId: string;
  emitAgentActivity?: (data: AgentActivityData) => void;
  userId: string;
  workspaceId: string;
}

function emitAgentActivityUpdate(
  ctx: WorkspaceAgentRuntimeContext,
  actions: AgentActivityAction[],
  status: AgentActivityData["status"] = "running"
) {
  ctx.emitAgentActivity?.({
    actions,
    id: ctx.agentActivityId,
    status,
  });
}

export async function executeSearchMaterials(
  ctx: WorkspaceAgentRuntimeContext,
  input: SearchMaterialsInput
) {
  const query = input.query.trim();
  if (!query) {
    throw new Error("A workspace search query is required.");
  }

  const { matches } = await resolveWorkspaceSearchMatches({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    query,
    limit: input.limit ?? DEFAULT_SEARCH_LIMIT,
    mode: input.mode ?? "auto",
    sourceType: input.sourceType,
  });

  return {
    citationMarkdown: buildCitationMarkdown(matches),
    matches,
    query,
    totalMatches: matches.length,
  };
}

export async function executeAvenireAgent(
  ctx: WorkspaceAgentRuntimeContext,
  input: AvenireAgentInput
) {
  const query = input.query.trim();
  if (!query) {
    throw new Error("A workspace search query is required.");
  }

  const maxMatches = input.maxMatches ?? AGENT_DEFAULT_MATCH_LIMIT;
  const maxFiles = input.maxFiles ?? AGENT_DEFAULT_MAX_FILES;
  const activityActions: AgentActivityAction[] = [
    {
      kind: "search",
      pending: true,
      value: query,
      preview: { query, matches: [] },
    },
  ];

  emitAgentActivityUpdate(ctx, activityActions, "running");

  const { maps, matches } = await resolveWorkspaceSearchMatches({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    query,
    limit: maxMatches,
    sourceType: undefined,
  });

  const indexedMatches = matches.map((match, index) => ({
    index,
    fileId: match.fileId,
    snippet: match.snippet,
    sourceType: match.sourceType,
    workspacePath: match.workspacePath,
  }));
  const selectableMatches = indexedMatches.filter(
    (match): match is typeof match & { fileId: string } => Boolean(match.fileId)
  );

  const searchMatches = matches
    .map((match) => match.workspacePath)
    .filter(Boolean)
    .slice(0, 6);

  activityActions[0] = {
    kind: "search",
    pending: false,
    value: query,
    preview: { query, matches: searchMatches },
  };
  emitAgentActivityUpdate(ctx, activityActions, "running");

  let selectedFileIds: string[] = [];
  if (selectableMatches.length > 0) {
    const selection = await generateText({
      model: apollo.languageModel("apollo-agent"),
      output: Output.object({ schema: zodSchema(agentSelectionSchema) }),
      prompt: buildAgentSelectionPrompt({
        query: input.query,
        matches: selectableMatches,
        maxFiles,
      }),
    });

    const selectedIndices = Array.from(
      new Set(
        selection.output.indices.filter(
          (index) =>
            Number.isFinite(index) &&
            index >= 0 &&
            index < selectableMatches.length
        )
      )
    ).slice(0, maxFiles);

    selectedFileIds = selectedIndices
      .map((index) => selectableMatches[index]?.fileId)
      .filter((fileId): fileId is string => Boolean(fileId));
  }

  const readActionIndexByFileId = new Map<string, number>();
  for (const fileId of selectedFileIds) {
    const workspacePath = maps.filePathById.get(fileId) ?? "workspace file";
    readActionIndexByFileId.set(fileId, activityActions.length);
    activityActions.push({
      kind: "read",
      pending: true,
      value: workspacePath,
    });
  }

  if (selectedFileIds.length > 0) {
    emitAgentActivityUpdate(ctx, activityActions, "running");
  } else if (selectableMatches.length > 0) {
    emitAgentActivityUpdate(ctx, activityActions, "done");
    return {
      citationMarkdown: buildCitationMarkdown(matches),
      citations: matches.slice(0, maxMatches),
      context: "No relevant workspace content found.",
      files: [],
      query,
      summary: "No relevant workspace content found.",
    };
  }

  const files: Array<{
    excerpt: string;
    fileId: string | null;
    workspacePath: string;
  }> = [];

  for (const fileId of selectedFileIds) {
    const preview = await resolveFileExcerpt({
      workspaceId: ctx.workspaceId,
      fileId,
      maxChars: AGENT_MAX_FILE_CHARS,
      maps,
    });
    if (!preview) {
      continue;
    }

    files.push(preview);
    const actionIndex = readActionIndexByFileId.get(fileId);
    if (actionIndex !== undefined) {
      activityActions[actionIndex] = {
        kind: "read",
        pending: false,
        value: preview.workspacePath,
        preview: {
          content: preview.excerpt,
          path: preview.workspacePath,
        },
      };
      emitAgentActivityUpdate(ctx, activityActions, "running");
    }
  }

  if (selectedFileIds.length > 0 && files.length === 0) {
    emitAgentActivityUpdate(ctx, activityActions, "done");
    return {
      citationMarkdown: buildCitationMarkdown(matches),
      citations: matches.slice(0, maxMatches),
      context: "No relevant workspace content found.",
      files: [],
      query,
      summary: "No relevant workspace content found.",
    };
  }

  const contextBlocks =
    files.length > 0
      ? files.map(
          (file) => `File: ${file.workspacePath}\n${file.excerpt.trim()}`
        )
      : matches
          .slice(0, 6)
          .map(
            (match) => `Match: ${match.workspacePath}\n${match.snippet.trim()}`
          );

  const context = contextBlocks.join("\n\n").trim();
  if (!context) {
    emitAgentActivityUpdate(ctx, activityActions, "done");
    return {
      citationMarkdown: buildCitationMarkdown(matches),
      citations: matches.slice(0, maxMatches),
      context: "No relevant workspace content found.",
      files,
      query,
      summary: "No relevant workspace content found.",
    };
  }

  const summaryResult = await generateText({
    model: apollo.languageModel("apollo-agent"),
    prompt: [
      "Summarize the retrieved workspace context for the user's query.",
      "Use 2-4 concise sentences.",
      "If nothing relevant was found, say that clearly.",
      `Query: ${query}`,
      "Context:",
      context || "No relevant workspace content found.",
    ].join("\n\n"),
    maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
    temperature: 0.3,
  });

  const summary = summaryResult.text.trim() || "No relevant context found.";
  emitAgentActivityUpdate(ctx, activityActions, "done");

  return {
    citationMarkdown: buildCitationMarkdown(matches),
    citations: matches.slice(0, maxMatches),
    context: context || "No relevant workspace content found.",
    files,
    query,
    summary,
  };
}

export async function executeFileManagerAgent(
  ctx: WorkspaceAgentRuntimeContext,
  input: FileManagerAgentInput
) {
  const task = input.task.trim();
  if (!task) {
    throw new Error("A file manager task is required.");
  }

  const maxFiles = input.maxFiles ?? FILE_MANAGER_DEFAULT_MAX_FILES;
  const activityActions: AgentActivityAction[] = [
    {
      kind: "list",
      pending: true,
      value: "workspace files",
    },
  ];

  emitAgentActivityUpdate(ctx, activityActions, "running");

  const [maps, files] = await Promise.all([
    buildWorkspacePathMaps(ctx.workspaceId, ctx.userId),
    listWorkspaceFiles(ctx.workspaceId, ctx.userId),
  ]);

  const candidateFiles = [...files]
    .sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
    )
    .slice(0, FILE_MANAGER_LIST_LIMIT)
    .map((file) => ({
      fileId: file.id,
      mimeType: file.mimeType ?? null,
      updatedAt: file.updatedAt,
      workspacePath: getWorkspacePathForFile(file, maps),
    }));

  activityActions[0] = {
    kind: "list",
    pending: false,
    value: "workspace files",
  };
  emitAgentActivityUpdate(ctx, activityActions, "running");

  let selectedFileIds: string[] = [];
  if (candidateFiles.length > 0) {
    const selection = await generateText({
      model: apollo.languageModel("apollo-agent"),
      output: Output.object({ schema: zodSchema(agentSelectionSchema) }),
      prompt: buildFileManagerSelectionPrompt({
        files: candidateFiles,
        maxFiles,
        task,
      }),
    });

    selectedFileIds = Array.from(
      new Set(
        selection.output.indices.flatMap((index) => {
            if (
              !Number.isFinite(index) ||
              index < 0 ||
              index >= candidateFiles.length
            ) {
              return [];
            }
            const fileId = candidateFiles[index]?.fileId;
            return fileId ? [fileId] : [];
          })
      )
    ).slice(0, maxFiles);
  }

  const readActionIndexByFileId = new Map<string, number>();
  for (const fileId of selectedFileIds) {
    const workspacePath = maps.filePathById.get(fileId) ?? "workspace file";
    readActionIndexByFileId.set(fileId, activityActions.length);
    activityActions.push({
      kind: "read",
      pending: true,
      value: workspacePath,
    });
  }

  if (selectedFileIds.length > 0) {
    emitAgentActivityUpdate(ctx, activityActions, "running");
  } else {
    emitAgentActivityUpdate(ctx, activityActions, "done");
    return {
      files: [],
      summary: "No relevant files found.",
      task,
    };
  }

  const filesToInspect: Array<{
    excerpt: string;
    fileId: string | null;
    workspacePath: string;
  }> = [];

  for (const fileId of selectedFileIds) {
    const preview = await resolveFileExcerpt({
      workspaceId: ctx.workspaceId,
      fileId,
      maxChars: FILE_MANAGER_MAX_FILE_CHARS,
      maps,
    });

    if (!preview) {
      continue;
    }

    filesToInspect.push(preview);
    const actionIndex = readActionIndexByFileId.get(fileId);
    if (actionIndex !== undefined) {
      activityActions[actionIndex] = {
        kind: "read",
        pending: false,
        value: preview.workspacePath,
        preview: {
          content: preview.excerpt,
          path: preview.workspacePath,
        },
      };
      emitAgentActivityUpdate(ctx, activityActions, "running");
    }
  }

  if (selectedFileIds.length > 0 && filesToInspect.length === 0) {
    emitAgentActivityUpdate(ctx, activityActions, "done");
    return {
      files: [],
      summary: "No relevant files found.",
      task: input.task,
    };
  }

  const context =
    filesToInspect.length > 0
      ? filesToInspect
          .map((file) => `File: ${file.workspacePath}\n${file.excerpt.trim()}`)
          .join("\n\n")
      : candidateFiles
          .slice(0, Math.min(maxFiles, 8))
          .map(
            (file) =>
              `Path: ${file.workspacePath}\nMime: ${file.mimeType ?? "unknown"}\nUpdated: ${file.updatedAt}`
          )
          .join("\n\n");

  if (!context) {
    emitAgentActivityUpdate(ctx, activityActions, "done");
    return {
      files: filesToInspect,
      summary: "No relevant files found.",
      task,
    };
  }

  const summaryResult = await generateText({
    model: apollo.languageModel("apollo-agent"),
    prompt: [
      "You are a file manager agent.",
      "Summarize the relevant workspace files for the task.",
      "Do not claim that any files were moved or deleted unless that already happened outside this tool.",
      "If the task is ambiguous, say what still needs clarification.",
      `Task: ${task}`,
      "Context:",
      context || "No relevant files found.",
    ].join("\n\n"),
    maxOutputTokens: FILE_MANAGER_MAX_OUTPUT_TOKENS,
    temperature: 0.2,
  });

  emitAgentActivityUpdate(ctx, activityActions, "done");

  return {
    files: filesToInspect,
    summary: summaryResult.text.trim() || "No relevant files found.",
    task,
  };
}
