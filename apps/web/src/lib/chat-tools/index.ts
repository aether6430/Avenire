import { type ToolSet, tool } from "@avenire/ai";
import type { AgentActivityData } from "@avenire/ai/message-types";
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
import { executeNoteAgent } from "@/lib/chat-tools/chat-tool-note-agent-runtime";
import {
  generateFlashcardsFromMisconception,
  generateFlashcardsFromSource,
  generateQuizFromSource,
} from "@/lib/chat-tools/chat-tool-study-runtime";
import {
  executeAvenireAgent,
  executeFileManagerAgent,
  executeSearchMaterials,
} from "@/lib/chat-tools/chat-tool-workspace-agent-runtime";
import { matchesTaxonomyScope } from "@/lib/chat-tools/study-tool-helpers";
import {
  getFlashcardDashboardForUser,
  listDueFlashcardsForUser,
  normalizeFlashcardTaxonomy,
} from "@/lib/flashcards";

const DEFAULT_WEB_SEARCH_LIMIT = 5;
const _DEFAULT_FILE_LIST_LIMIT = 50;
const DEFAULT_DUE_CARD_LIMIT = 5;
const NOTES_FOLDER_NAME = "Notes";

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
      execute: async (input) => executeSearchMaterials(ctx, input),
    }),
    avenire_agent: tool({
      description:
        "Run the Avenire retrieval agent to gather workspace context and return a consolidated summary. Use only when the user asks about their files/workspace or explicitly wants workspace context.",
      inputSchema: chatToolSchemas.avenire_agent.input,
      outputSchema: chatToolSchemas.avenire_agent.output,
      execute: async (input) => executeAvenireAgent(ctx, input),
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
      execute: async (input) => executeFileManagerAgent(ctx, input),
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
