import { type ToolSet, tool } from "@avenire/ai";
import type { AgentActivityData } from "@avenire/ai/message-types";
import {
  chatToolSchemas,
  legacyShowWidgetInputSchema,
} from "@avenire/ai/tools";
import { executeGetDueCards } from "@/lib/chat-tools/chat-tool-due-cards-runtime";
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
  executeLoadSkill,
  executeShowWidget,
  executeVisualizeReadMe,
  runWebSearch,
} from "@/lib/chat-tools/chat-tool-utility-runtime";
import {
  executeAvenireAgent,
  executeFileManagerAgent,
  executeSearchMaterials,
} from "@/lib/chat-tools/chat-tool-workspace-agent-runtime";

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
      execute: async (input) => executeGetDueCards(ctx, input),
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
      execute: async (input) => executeLoadSkill(input),
    }),
    visualize_read_me: tool({
      description:
        "Load visualization guidelines for widget generation. Call this before generating widgets to get detailed instructions for interactive HTML/CSS/SVG fragments.",
      inputSchema: chatToolSchemas.visualize_read_me.input,
      outputSchema: chatToolSchemas.visualize_read_me.output,
      execute: async (input) => executeVisualizeReadMe(input),
    }),
    show_widget: tool({
      description:
        "Render an interactive HTML/CSS/JS widget in the chat. Use for visualizations, diagrams, charts, simulations, and interactive explainers.",
      inputSchema: showWidgetInputSchema,
      outputSchema: chatToolSchemas.show_widget.output,
      execute: async (input) => executeShowWidget(input),
    }),
  };
}
