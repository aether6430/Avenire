import { generateText, Output, type ToolSet, tool } from "@avenire/ai";
import type {
  AgentActivityAction,
  AgentActivityData,
} from "@avenire/ai/message-types";
import { apollo } from "@avenire/ai/models";
import {
  AVAILABLE_STUDY_SKILLS,
  AVAILABLE_VISUAL_SKILLS,
  loadSkills,
} from "@avenire/ai/skills";
import {
  chatToolSchemas,
  legacyShowWidgetInputSchema,
} from "@avenire/ai/tools";
import { tavily } from "@tavily/core";
import type { z } from "zod";
import {
  improveMisconceptionForTool,
  listMisconceptionsForTool,
  logMisconceptionForTool,
  resolveMisconceptionForTool,
} from "@/lib/chat-tools/chat-tool-misconception-runtime";
import {
  agentSelectionSchema,
  buildAgentSelectionPrompt,
  buildFileManagerSelectionPrompt,
} from "@/lib/chat-tools/chat-tool-models";
import { executeNoteAgent } from "@/lib/chat-tools/chat-tool-note-agent-runtime";
import {
  generateFlashcardsFromMisconception,
  generateFlashcardsFromSource,
  generateQuizFromSource,
} from "@/lib/chat-tools/chat-tool-study-runtime";
import {
  buildCitationMarkdown,
  matchesTaxonomyScope,
} from "@/lib/chat-tools/study-tool-helpers";
import {
  buildWorkspacePathMaps,
  getWorkspacePathForFile,
  resolveFileExcerpt,
  resolveWorkspaceSearchMatches,
} from "@/lib/chat-tools/workspace-file-helpers";
import { listWorkspaceFiles } from "@/lib/file-data";
import {
  getFlashcardDashboardForUser,
  listDueFlashcardsForUser,
  normalizeFlashcardTaxonomy,
} from "@/lib/flashcards";

export { getActiveMisconceptionContext } from "@/lib/chat-tools/chat-tool-misconception-runtime";

const DEFAULT_SEARCH_LIMIT = 8;
const DEFAULT_WEB_SEARCH_LIMIT = 5;
const _DEFAULT_FILE_LIST_LIMIT = 50;
const DEFAULT_DUE_CARD_LIMIT = 5;
const NOTES_FOLDER_NAME = "Notes";
const AGENT_DEFAULT_MATCH_LIMIT = 10;
const AGENT_DEFAULT_MAX_FILES = 3;
const AGENT_MAX_FILE_CHARS = 4000;
const AGENT_MAX_OUTPUT_TOKENS = 220;
const FILE_MANAGER_DEFAULT_MAX_FILES = 4;
const FILE_MANAGER_LIST_LIMIT = 120;
const FILE_MANAGER_MAX_FILE_CHARS = 5000;
const FILE_MANAGER_MAX_OUTPUT_TOKENS = 260;

interface ChatToolContext {
  agentActivityId: string;
  chatSlug: string;
  emitAgentActivity?: (data: AgentActivityData) => void;
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

interface ChatToolOptions {
  legacyShowWidgetSchema?: boolean;
}

function emitAgentActivityUpdate(
  ctx: ChatToolContext,
  actions: AgentActivityAction[],
  status: AgentActivityData["status"] = "running"
) {
  ctx.emitAgentActivity?.({
    actions,
    id: ctx.agentActivityId,
    status,
  });
}

async function runWebSearch(
  input: z.infer<typeof chatToolSchemas.web_search.input>
) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is required for web_search.");
  }

  const client = tavily({ apiKey });
  const response = await client.search(input.query, {
    includeAnswer: input.includeAnswer ?? true,
    includeFavicon: true,
    maxResults: input.maxResults ?? DEFAULT_WEB_SEARCH_LIMIT,
    searchDepth: "advanced",
    topic: input.topic ?? "general",
  });

  return {
    answer: response.answer?.trim() || undefined,
    query: response.query,
    results: response.results.map((result) => ({
      content: result.content,
      favicon: result.favicon,
      publishedDate: result.publishedDate,
      score: result.score,
      title: result.title,
      url: result.url,
    })),
    totalResults: response.results.length,
  };
}

export function createChatTools(
  ctx: ChatToolContext,
  options: ChatToolOptions = {}
): ToolSet {
  const showWidgetInputSchema = options.legacyShowWidgetSchema
    ? (legacyShowWidgetInputSchema as unknown as typeof chatToolSchemas.show_widget.input)
    : chatToolSchemas.show_widget.input;

  return {
    web_search: tool({
      description:
        "Search the public web with Tavily and return relevant sources. Use when the user asks for current events, recent facts, external sources, or information outside the workspace.",
      inputSchema: chatToolSchemas.web_search.input,
      outputSchema: chatToolSchemas.web_search.output,
      execute: runWebSearch,
    }),
    search_materials: tool({
      description:
        "Semantic search over workspace materials with file citations. Use only when the user asks about their files/workspace or requests a workspace search.",
      inputSchema: chatToolSchemas.search_materials.input,
      outputSchema: chatToolSchemas.search_materials.output,
      execute: async (input) => {
        const { matches } = await resolveWorkspaceSearchMatches({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          query: input.query,
          limit: input.limit ?? DEFAULT_SEARCH_LIMIT,
          mode: input.mode ?? "auto",
          sourceType: input.sourceType,
        });

        return {
          citationMarkdown: buildCitationMarkdown(matches),
          matches,
          query: input.query,
          totalMatches: matches.length,
        };
      },
    }),
    avenire_agent: tool({
      description:
        "Run the Avenire retrieval agent to gather workspace context and return a consolidated summary. Use only when the user asks about their files/workspace or explicitly wants workspace context.",
      inputSchema: chatToolSchemas.avenire_agent.input,
      outputSchema: chatToolSchemas.avenire_agent.output,
      execute: async (input) => {
        const maxMatches = input.maxMatches ?? AGENT_DEFAULT_MATCH_LIMIT;
        const maxFiles = input.maxFiles ?? AGENT_DEFAULT_MAX_FILES;
        const activityActions: AgentActivityAction[] = [
          {
            kind: "search",
            pending: true,
            value: input.query,
            preview: { query: input.query, matches: [] },
          },
        ];

        emitAgentActivityUpdate(ctx, activityActions, "running");

        const { maps, matches } = await resolveWorkspaceSearchMatches({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          query: input.query,
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

        const searchMatches = matches
          .map((match) => match.workspacePath)
          .filter(Boolean)
          .slice(0, 6);

        activityActions[0] = {
          kind: "search",
          pending: false,
          value: input.query,
          preview: { query: input.query, matches: searchMatches },
        };
        emitAgentActivityUpdate(ctx, activityActions, "running");

        let selectedFileIds: string[] = [];
        if (indexedMatches.length > 0) {
          const selection = await generateText({
            model: apollo.languageModel("apollo-agent"),
            output: Output.object({ schema: agentSelectionSchema }),
            prompt: buildAgentSelectionPrompt({
              query: input.query,
              matches: indexedMatches,
              maxFiles,
            }),
          });

          const selectedIndices = Array.from(
            new Set(
              selection.output.indices.filter(
                (index) =>
                  Number.isFinite(index) &&
                  index >= 0 &&
                  index < indexedMatches.length
              )
            )
          ).slice(0, maxFiles);

          selectedFileIds = selectedIndices
            .map((index) => indexedMatches[index]?.fileId)
            .filter((fileId): fileId is string => Boolean(fileId));
        }

        const readActionIndexByFileId = new Map<string, number>();
        for (const fileId of selectedFileIds) {
          const workspacePath =
            maps.filePathById.get(fileId) ?? "workspace file";
          readActionIndexByFileId.set(fileId, activityActions.length);
          activityActions.push({
            kind: "read",
            pending: true,
            value: workspacePath,
          });
        }

        if (selectedFileIds.length > 0) {
          emitAgentActivityUpdate(ctx, activityActions, "running");
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
          if (preview) {
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
        }

        const contextBlocks =
          files.length > 0
            ? files.map(
                (file) => `File: ${file.workspacePath}\n${file.excerpt.trim()}`
              )
            : matches
                .slice(0, 6)
                .map(
                  (match) =>
                    `Match: ${match.workspacePath}\n${match.snippet.trim()}`
                );

        const context = contextBlocks.join("\n\n").trim();
        const summaryResult = await generateText({
          model: apollo.languageModel("apollo-agent"),
          prompt: [
            "Summarize the retrieved workspace context for the user's query.",
            "Use 2-4 concise sentences.",
            "If nothing relevant was found, say that clearly.",
            `Query: ${input.query}`,
            "Context:",
            context || "No relevant workspace content found.",
          ].join("\n\n"),
          maxOutputTokens: AGENT_MAX_OUTPUT_TOKENS,
          temperature: 0.3,
        });

        const summary =
          summaryResult.text.trim() || "No relevant context found.";
        emitAgentActivityUpdate(ctx, activityActions, "done");

        return {
          citationMarkdown: buildCitationMarkdown(matches),
          citations: matches.slice(0, maxMatches),
          context: context || "No relevant workspace content found.",
          files,
          query: input.query,
          summary,
        };
      },
    }),
    file_manager_agent: tool({
      description: `Inspect and manage workspace files and folders. Handles listing, reading, moving, deleting files, and creating/managing folders. Use when the user asks about their files, wants to organize their workspace, or needs file operations.

Internal capabilities:
- list_files: List files and folders
- read_workspace_file: Read file content
- get_file_summary: Get ingestion metadata
- move_file: Move file to folder
- delete_file: Move file to trash
- create_folder: Create new folder
- move_folder: Move folder
- delete_folder: Move folder to trash

The agent decides which operations to perform based on the task.`,
      inputSchema: chatToolSchemas.file_manager_agent.input,
      outputSchema: chatToolSchemas.file_manager_agent.output,
      execute: async (input) => {
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
            (left, right) =>
              Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
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
            output: Output.object({ schema: agentSelectionSchema }),
            prompt: buildFileManagerSelectionPrompt({
              files: candidateFiles,
              maxFiles,
              task: input.task,
            }),
          });

          selectedFileIds = Array.from(
            new Set(
              selection.output.indices
                .filter(
                  (index) =>
                    Number.isFinite(index) &&
                    index >= 0 &&
                    index < candidateFiles.length
                )
                .map((index) => candidateFiles[index]?.fileId)
                .filter((fileId): fileId is string => Boolean(fileId))
            )
          ).slice(0, maxFiles);
        }

        const readActionIndexByFileId = new Map<string, number>();
        for (const fileId of selectedFileIds) {
          const workspacePath =
            maps.filePathById.get(fileId) ?? "workspace file";
          readActionIndexByFileId.set(fileId, activityActions.length);
          activityActions.push({
            kind: "read",
            pending: true,
            value: workspacePath,
          });
        }

        if (selectedFileIds.length > 0) {
          emitAgentActivityUpdate(ctx, activityActions, "running");
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

        const context =
          filesToInspect.length > 0
            ? filesToInspect
                .map(
                  (file) =>
                    `File: ${file.workspacePath}\n${file.excerpt.trim()}`
                )
                .join("\n\n")
            : candidateFiles
                .slice(0, Math.min(maxFiles, 8))
                .map(
                  (file) =>
                    `Path: ${file.workspacePath}\nMime: ${file.mimeType ?? "unknown"}\nUpdated: ${file.updatedAt}`
                )
                .join("\n\n");

        const summaryResult = await generateText({
          model: apollo.languageModel("apollo-agent"),
          prompt: [
            "You are a file manager agent.",
            "Summarize the relevant workspace files for the task.",
            "Do not claim that any files were moved or deleted unless that already happened outside this tool.",
            "If the task is ambiguous, say what still needs clarification.",
            `Task: ${input.task}`,
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
          task: input.task,
        };
      },
    }),
    note_agent: tool({
      description: `Manage markdown notes in the workspace. Handles creating, reading, and updating notes. Use when the user asks about their notes or wants to create/modify notes.

Internal capabilities:
- create_note: Create new markdown note
- read_note: Read existing note content
- update_note: Append or replace note content (append, replace_entire, replace_section)
- update_tags: Read and update note tags stored in file properties

The agent decides which operations to perform based on the task.`,
      inputSchema: chatToolSchemas.note_agent.input,
      outputSchema: chatToolSchemas.note_agent.output,
      execute: async (input) => executeNoteAgent(ctx, input),
    }),
    log_misconception: tool({
      description:
        "Record a misconception only when the user explicitly reports a durable misunderstanding or the conversation clearly establishes a wrong mental model. Do not use it for normal questions, feature checks, or one-off clarifications.",
      inputSchema: chatToolSchemas.log_misconception.input,
      outputSchema: chatToolSchemas.log_misconception.output,
      execute: async (input) => logMisconceptionForTool(ctx, input),
    }),
    list_misconceptions: tool({
      description:
        "List the current active misconceptions in the workspace. Use this before deciding whether to reinforce, resolve, or generate study material.",
      inputSchema: chatToolSchemas.list_misconceptions.input,
      outputSchema: chatToolSchemas.list_misconceptions.output,
      execute: async (input) => listMisconceptionsForTool(ctx, input),
    }),
    resolve_misconception: tool({
      description:
        "Mark a misconception as resolved after the user demonstrates understanding. Use after a correct explanation or a clean review streak.",
      inputSchema: chatToolSchemas.resolve_misconception.input,
      outputSchema: chatToolSchemas.resolve_misconception.output,
      execute: async (input) => resolveMisconceptionForTool(ctx, input),
    }),
    clear_misconception: tool({
      description:
        "Clear a misconception once it has been fully corrected. This is the explicit version of resolve_misconception.",
      inputSchema: chatToolSchemas.clear_misconception.input,
      outputSchema: chatToolSchemas.clear_misconception.output,
      execute: async (input) => resolveMisconceptionForTool(ctx, input),
    }),
    improve_misconception: tool({
      description:
        "List the current misconception first, then reduce the confidence of an active misconception after the user shows partial improvement.",
      inputSchema: chatToolSchemas.improve_misconception.input,
      outputSchema: chatToolSchemas.improve_misconception.output,
      execute: async (input) => improveMisconceptionForTool(ctx, input),
    }),
    generate_flashcards: tool({
      description:
        "Generate a persisted mindset set from a file, search query, or provided source text. Use only when the user explicitly asks for a mindset set, flashcards, mindset cards, or study cards.",
      inputSchema: chatToolSchemas.generate_flashcards.input,
      outputSchema: chatToolSchemas.generate_flashcards.output,
      execute: async (input) => generateFlashcardsFromSource(ctx, input),
    }),
    generate_flashcards_from_misconception: tool({
      description:
        "Generate a mindset set from an active misconception so the user can train the correct model directly.",
      inputSchema: chatToolSchemas.generate_flashcards_from_misconception.input,
      outputSchema:
        chatToolSchemas.generate_flashcards_from_misconception.output,
      execute: async (input) => generateFlashcardsFromMisconception(ctx, input),
    }),
    get_due_cards: tool({
      description:
        "Show how many study cards are due and preview the next due items. Use when the user asks about due cards or study progress, and also when the user is clearly struggling with a topic and you want to check whether relevant cards are due.",
      inputSchema: chatToolSchemas.get_due_cards.input,
      outputSchema: chatToolSchemas.get_due_cards.output,
      execute: async (input) => {
        const [dashboard, dueCards] = await Promise.all([
          getFlashcardDashboardForUser(ctx.userId, ctx.workspaceId),
          listDueFlashcardsForUser({
            limit: 100,
            userId: ctx.userId,
            workspaceId: ctx.workspaceId,
          }),
        ]);

        const hasScope = Boolean(input.subject || input.topic || input.concept);
        const matchingCardIds = hasScope
          ? new Set(
              (dashboard?.cardSnapshots ?? [])
                .filter((snapshot) => {
                  const taxonomy = normalizeFlashcardTaxonomy(
                    snapshot.card.source
                  );
                  return Boolean(
                    taxonomy &&
                      matchesTaxonomyScope(taxonomy, {
                        concept: input.concept,
                        subject: input.subject,
                        topic: input.topic,
                      })
                  );
                })
                .map((snapshot) => snapshot.card.id)
            )
          : null;
        const filteredDueCards =
          matchingCardIds && hasScope
            ? dueCards.filter((entry) => matchingCardIds.has(entry.card.id))
            : dueCards;
        const previewDueCards = filteredDueCards.slice(
          0,
          input.limit ?? DEFAULT_DUE_CARD_LIMIT
        );

        return {
          dueCards: previewDueCards.map((entry) => ({
            cardId: entry.card.id,
            dueAt: entry.reviewState?.dueAt ?? null,
            frontMarkdown: entry.card.frontMarkdown,
            kind: entry.card.kind,
            remainingDueCount: entry.remainingDueCount,
            setId: entry.set.id,
            setTitle: entry.set.title,
          })),
          totalDueCount: hasScope
            ? filteredDueCards.length
            : (dashboard?.dueCount ?? 0),
        };
      },
    }),
    quiz_me: tool({
      description:
        "Generate a persisted multiple choice quiz set from a file, query, or provided source text. Use only when the user explicitly asks for a quiz.",
      inputSchema: chatToolSchemas.quiz_me.input,
      outputSchema: chatToolSchemas.quiz_me.output,
      execute: async (input) => generateQuizFromSource(ctx, input),
    }),
    load_skill: tool({
      description:
        "Load a study-guideline skill into context. Use this before acting on structured study tasks like explanations, summaries, notes, mindset cards, or quizzes.",
      inputSchema: chatToolSchemas.load_skill.input,
      outputSchema: chatToolSchemas.load_skill.output,
      execute: async (input) => {
        const skills = input.skills.filter((skillName) =>
          AVAILABLE_STUDY_SKILLS.includes(
            skillName as (typeof AVAILABLE_STUDY_SKILLS)[number]
          )
        );
        if (skills.length === 0) {
          throw new Error("No valid skills provided for load_skill.");
        }
        return {
          content: loadSkills(skills),
          skills,
        };
      },
    }),
    visualize_read_me: tool({
      description:
        "Load visualization guidelines for widget generation. Call this before generating widgets to get detailed instructions for interactive HTML/CSS/SVG fragments.",
      inputSchema: chatToolSchemas.visualize_read_me.input,
      outputSchema: chatToolSchemas.visualize_read_me.output,
      execute: async (input) => {
        const modules = input.modules.filter((moduleName) =>
          AVAILABLE_VISUAL_SKILLS.includes(
            moduleName as (typeof AVAILABLE_VISUAL_SKILLS)[number]
          )
        );
        if (modules.length === 0) {
          throw new Error("No valid modules provided for visualize_read_me.");
        }
        return {
          content: loadSkills(modules),
          modules,
        };
      },
    }),
    show_widget: tool({
      description:
        "Render an interactive HTML/CSS/JS widget in the chat. Use for visualizations, diagrams, charts, simulations, and interactive explainers.",
      inputSchema: showWidgetInputSchema,
      outputSchema: chatToolSchemas.show_widget.output,
      execute: async (input) => {
        if (!input.i_have_seen_read_me) {
          throw new Error(
            "You must call visualize_read_me before show_widget."
          );
        }

        const widgetCode = input.widget_code ?? "";
        const isSVG = widgetCode.trimStart().startsWith("<svg");
        const width = input.width ?? 800;
        const height = input.height ?? 600;

        return {
          success: true,
          details: {
            title: input.title,
            width,
            height,
            isSVG,
          },
          widget_code: input.widget_code,
          widget_spec: input.widget_spec,
          filePath: null,
        };
      },
    }),
  };
}
