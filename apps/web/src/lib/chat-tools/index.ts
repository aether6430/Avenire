import { type ToolSet, tool } from "@avenire/ai";
import type { AgentActivityData } from "@avenire/ai/message-types";
import { chatToolSchemas } from "@avenire/ai/tools";
import { executeGetDueCards } from "@/lib/chat-tools/chat-tool-due-cards-runtime";
import {
  improveMisconceptionForTool,
  listMisconceptionsForTool,
  logMisconceptionForTool,
  prewarmActiveMisconceptionsCache,
  resolveMisconceptionForTool,
} from "@/lib/chat-tools/chat-tool-misconception-runtime";
import {
  generateFlashcardsFromMisconception,
  generateFlashcardsFromSource,
  generateQuizFromSource,
} from "@/lib/chat-tools/chat-tool-study-runtime";
import {
  executeLoadSkill,
  executeShowWidgetWithOptions,
  executeVisualizeReadMe,
  runWebSearch,
} from "@/lib/chat-tools/chat-tool-utility-runtime";
import {
  executeAvenireAgent,
  executeSearchMaterials,
} from "@/lib/chat-tools/chat-tool-workspace-agent-runtime";
import {
  executeCreateFolder,
  executeDeleteFile,
  executeGetFileInfo,
  executeListFiles,
  executeMoveFile,
  executeReadFile,
} from "@/lib/chat-tools/chat-tool-file-operations-runtime";
import {
  executeCreateNote,
  executeListNotes,
  executeReadNote,
  executeUpdateNote,
  executeUpdateNoteTags,
} from "@/lib/chat-tools/chat-tool-note-operations-runtime";

interface ChatToolContext {
  agentActivityId: string;
  chargeWidgetGeneration?: () => Promise<void>;
  chatSlug: string;
  emitAgentActivity?: (data: AgentActivityData) => void;
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

export { prewarmActiveMisconceptionsCache };

function fileOpsCtx(ctx: ChatToolContext) {
  return {
    rootFolderId: ctx.rootFolderId,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  };
}

function noteOpsCtx(ctx: ChatToolContext) {
  return {
    rootFolderId: ctx.rootFolderId,
    userId: ctx.userId,
    workspaceId: ctx.workspaceId,
  };
}

export function createChatTools(ctx: ChatToolContext): ToolSet {
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
        "Semantic search over workspace materials with file citations. Use only when the user asks about their files/workspace or requests a workspace search. Returns real file IDs you must use in subsequent file/note operations.",
      inputSchema: chatToolSchemas.search_materials.input,
      outputSchema: chatToolSchemas.search_materials.output,
      execute: async (input) => executeSearchMaterials(ctx, input),
    }),
    avenire_agent: tool({
      description:
        "Run the Avenire retrieval agent to gather workspace context and return a consolidated summary. Use only when the user asks about their files/workspace or explicitly wants workspace context. Returns real file IDs you must use in subsequent file/note operations.",
      inputSchema: chatToolSchemas.avenire_agent.input,
      outputSchema: chatToolSchemas.avenire_agent.output,
      execute: async (input) => executeAvenireAgent(ctx, input),
    }),

    // --- File operations (granular, replacing file_manager_agent) ---

    list_files: tool({
      description:
        "List workspace files, optionally filtered by folder path. Returns file IDs you must pass to other tools (read_file, move_file, delete_file, get_file_info). Always start file operations by calling this or search_materials first to discover real file IDs — never invent file IDs.",
      inputSchema: chatToolSchemas.list_files.input,
      outputSchema: chatToolSchemas.list_files.output,
      execute: async (input) => executeListFiles(fileOpsCtx(ctx), input),
    }),
    read_file: tool({
      description:
        "Read the content of a workspace file by its file ID. Use file IDs obtained from list_files, search_materials, or avenire_agent. Never guess or hallucinate file IDs — always discover them first.",
      inputSchema: chatToolSchemas.read_file.input,
      outputSchema: chatToolSchemas.read_file.output,
      execute: async (input) => executeReadFile(fileOpsCtx(ctx), input),
    }),
    move_file: tool({
      description:
        "Move a file to a different folder. Requires a real file ID (obtained from list_files or search_materials) and a real destination folder ID (obtained from list_files). Never invent file IDs or folder IDs.",
      inputSchema: chatToolSchemas.move_file.input,
      outputSchema: chatToolSchemas.move_file.output,
      execute: async (input) => executeMoveFile(fileOpsCtx(ctx), input),
    }),
    delete_file: tool({
      description:
        "Soft-delete (move to trash) a workspace file. Requires a real file ID obtained from list_files or search_materials. Never invent file IDs — always discover them first.",
      inputSchema: chatToolSchemas.delete_file.input,
      outputSchema: chatToolSchemas.delete_file.output,
      execute: async (input) => executeDeleteFile(fileOpsCtx(ctx), input),
    }),
    create_folder: tool({
      description:
        "Create a new folder in the workspace. Optionally specify a parent folder ID (obtained from list_files).",
      inputSchema: chatToolSchemas.create_folder.input,
      outputSchema: chatToolSchemas.create_folder.output,
      execute: async (input) => executeCreateFolder(fileOpsCtx(ctx), input),
    }),
    get_file_info: tool({
      description:
        "Get metadata about a workspace file (mime type, updated date, path). Requires a real file ID obtained from list_files or search_materials. Never invent file IDs.",
      inputSchema: chatToolSchemas.get_file_info.input,
      outputSchema: chatToolSchemas.get_file_info.output,
      execute: async (input) => executeGetFileInfo(fileOpsCtx(ctx), input),
    }),

    // --- Note operations (granular, replacing note_agent) ---

    create_note: tool({
      description:
        "Create a new markdown note with explicit title and content. You provide the title and content directly — no AI drafting is used. Specify tags and an optional folder path. Use list_files first to find the folder ID if targeting a specific folder.",
      inputSchema: chatToolSchemas.create_note.input,
      outputSchema: chatToolSchemas.create_note.output,
      execute: async (input) => executeCreateNote(noteOpsCtx(ctx), input),
    }),
    read_note: tool({
      description:
        "Read a markdown note's full content by file ID. Requires a real file ID obtained from list_notes, list_files, or search_materials. Never invent file IDs — always discover them first.",
      inputSchema: chatToolSchemas.read_note.input,
      outputSchema: chatToolSchemas.read_note.output,
      execute: async (input) => executeReadNote(noteOpsCtx(ctx), input),
    }),
    update_note: tool({
      description:
        "Update a markdown note's content by file ID. Requires a real file ID obtained from list_notes, list_files, or search_materials. In mode 'replace_entire' the new content replaces everything. In mode 'append' the new content is appended. Without a mode, the content is treated as an edit instruction and the LLM rewrites the note intelligently. Never invent file IDs — always discover them with list_notes or list_files first.",
      inputSchema: chatToolSchemas.update_note.input,
      outputSchema: chatToolSchemas.update_note.output,
      execute: async (input) => executeUpdateNote(noteOpsCtx(ctx), input),
    }),
    list_notes: tool({
      description:
        "List all markdown notes in the workspace with content previews, tags, and word counts. Returns real file IDs you must use in read_note, update_note, or update_note_tags. Always call this or list_files first to discover real file IDs before operating on notes.",
      inputSchema: chatToolSchemas.list_notes.input,
      outputSchema: chatToolSchemas.list_notes.output,
      execute: async (input) => executeListNotes(noteOpsCtx(ctx), input),
    }),
    update_note_tags: tool({
      description:
        "Update tags on a markdown note. Requires a real file ID from list_notes or list_files. Use mode 'replace' to set tags, 'add' to append, or 'remove' to delete specific tags. Never invent file IDs.",
      inputSchema: chatToolSchemas.update_note_tags.input,
      outputSchema: chatToolSchemas.update_note_tags.output,
      execute: async (input) => executeUpdateNoteTags(noteOpsCtx(ctx), input),
    }),



    log_misconception: tool({
      description:
        "Record a misconception only when the user explicitly reports a durable misunderstanding or the conversation clearly establishes a wrong mental model. Use confidence for the learner's current confidence with the concept, not classifier certainty. Do not use it for normal questions, feature checks, or one-off clarifications.",
      inputSchema: chatToolSchemas.log_misconception.input,
      outputSchema: chatToolSchemas.log_misconception.output,
      execute: async (input) => logMisconceptionForTool(ctx, input),
    }),
    list_misconceptions: tool({
      description:
        "List the current active misconceptions in the workspace through the low-latency cache. Call this near the beginning of each substantive response after a brief first pass on the user's request.",
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
        "Generate a persisted Mindset Set from a file, search query, or provided source text. Use only when the user explicitly asks for a Mindset Set, flashcards, mindset cards, or study cards.",
      inputSchema: chatToolSchemas.generate_flashcards.input,
      outputSchema: chatToolSchemas.generate_flashcards.output,
      execute: async (input) => generateFlashcardsFromSource(ctx, input),
    }),
    generate_flashcards_from_misconception: tool({
      description:
        "Generate a Mindset Set from an active misconception so the user can train the correct model directly.",
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
      inputSchema: chatToolSchemas.show_widget.input,
      outputSchema: chatToolSchemas.show_widget.output,
      execute: async (input) =>
        executeShowWidgetWithOptions(input, {
          chargeWidgetGeneration: ctx.chargeWidgetGeneration,
        }),
    }),
  };
}
