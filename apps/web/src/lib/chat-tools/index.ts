import { type ToolSet, tool, zodSchema } from "@avenire/ai";
import type { AgentActivityData } from "@avenire/ai/message-types";
import { chatToolSchemas } from "@avenire/ai/tools";
import { executeGetDueCards } from "@/lib/chat-tools/chat-tool-due-cards-runtime";
import {
  executeCreateFolder,
  executeDeleteFile,
  executeGetFileInfo,
  executeListFiles,
  executeMoveFile,
  executeReadFile,
} from "@/lib/chat-tools/chat-tool-file-operations-runtime";
import {
  getActiveMisconceptionContext,
  improveMisconceptionForTool,
  listMisconceptionsForTool,
  logMisconceptionForTool,
  prewarmActiveMisconceptionsCache,
  resolveMisconceptionForTool,
} from "@/lib/chat-tools/chat-tool-misconception-runtime";
import {
  executeCreateNote,
  executeListNotes,
  executeReadNote,
  executeUpdateNote,
  executeUpdateNoteTags,
} from "@/lib/chat-tools/chat-tool-note-operations-runtime";
import {
  generateFlashcardsFromMisconception,
  generateFlashcardsFromSource,
  generateQuizFromSource,
} from "@/lib/chat-tools/chat-tool-study-runtime";
import {
  executeLoadSkill,
  executeGetTeachingWorkspace,
  executeReadTeachingArtifact,
  executeSaveTeachingArtifact,
  executeShowWidgetWithOptions,
  executeVisualizeReadMe,
  runWebSearch,
} from "@/lib/chat-tools/chat-tool-utility-runtime";
import {
  executeAvenireAgent,
  executeSearchMaterials,
} from "@/lib/chat-tools/chat-tool-workspace-agent-runtime";

interface ChatToolContext {
  agentActivityId: string;
  chargeWidgetGeneration?: () => Promise<void>;
  chatSlug: string;
  emitAgentActivity?: (data: AgentActivityData) => void;
  rootFolderId: string;
  userId: string;
  workspaceId: string;
}

export { getActiveMisconceptionContext, prewarmActiveMisconceptionsCache };

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

const toolSchema = zodSchema;

export function createChatTools(ctx: ChatToolContext): ToolSet {
  return {
    web_search: tool({
      description:
        "Search the public web with Firecrawl and return relevant sources. Use when the user asks for current events, recent facts, external sources, or information outside the workspace.",
      inputSchema: toolSchema(chatToolSchemas.web_search.input),
      outputSchema: toolSchema(chatToolSchemas.web_search.output),
      execute: runWebSearch,
    }),
    search_materials: tool({
      description:
        "Semantic search over workspace materials with file citations. Use only when the user asks about their files/workspace or requests a workspace search. Returns real file IDs you must use in subsequent file/note operations.",
      inputSchema: toolSchema(chatToolSchemas.search_materials.input),
      outputSchema: toolSchema(chatToolSchemas.search_materials.output),
      execute: async (input) => executeSearchMaterials(ctx, input),
    }),
    avenire_agent: tool({
      description:
        "Run the Avenire retrieval agent to gather workspace context and return a consolidated summary. Use only when the user asks about their files/workspace or explicitly wants workspace context. Returns real file IDs you must use in subsequent file/note operations.",
      inputSchema: toolSchema(chatToolSchemas.avenire_agent.input),
      outputSchema: toolSchema(chatToolSchemas.avenire_agent.output),
      execute: async (input) => executeAvenireAgent(ctx, input),
    }),

    // --- File operations (granular, replacing file_manager_agent) ---

    list_files: tool({
      description:
        "List workspace files, optionally filtered by folder path. Returns file IDs you must pass to other tools (read_file, move_file, delete_file, get_file_info). Always start file operations by calling this or search_materials first to discover real file IDs — never invent file IDs.",
      inputSchema: toolSchema(chatToolSchemas.list_files.input),
      outputSchema: toolSchema(chatToolSchemas.list_files.output),
      execute: async (input) => executeListFiles(fileOpsCtx(ctx), input),
    }),
    read_file: tool({
      description:
        "Read the content of a workspace file by its file ID. Use file IDs obtained from list_files, search_materials, or avenire_agent. Never guess or hallucinate file IDs — always discover them first.",
      inputSchema: toolSchema(chatToolSchemas.read_file.input),
      outputSchema: toolSchema(chatToolSchemas.read_file.output),
      execute: async (input) => executeReadFile(fileOpsCtx(ctx), input),
    }),
    move_file: tool({
      description:
        "Move a file to a different folder. Requires a real file ID (obtained from list_files or search_materials) and a real destination folder ID (obtained from list_files). Never invent file IDs or folder IDs.",
      inputSchema: toolSchema(chatToolSchemas.move_file.input),
      outputSchema: toolSchema(chatToolSchemas.move_file.output),
      execute: async (input) => executeMoveFile(fileOpsCtx(ctx), input),
    }),
    delete_file: tool({
      description:
        "Soft-delete (move to trash) a workspace file. Requires a real file ID obtained from list_files or search_materials. Never invent file IDs — always discover them first.",
      inputSchema: toolSchema(chatToolSchemas.delete_file.input),
      outputSchema: toolSchema(chatToolSchemas.delete_file.output),
      execute: async (input) => executeDeleteFile(fileOpsCtx(ctx), input),
    }),
    create_folder: tool({
      description:
        "Create a new folder in the workspace. Optionally specify a parent folder ID (obtained from list_files).",
      inputSchema: toolSchema(chatToolSchemas.create_folder.input),
      outputSchema: toolSchema(chatToolSchemas.create_folder.output),
      execute: async (input) => executeCreateFolder(fileOpsCtx(ctx), input),
    }),
    get_file_info: tool({
      description:
        "Get metadata about a workspace file (mime type, updated date, path). Requires a real file ID obtained from list_files or search_materials. Never invent file IDs.",
      inputSchema: toolSchema(chatToolSchemas.get_file_info.input),
      outputSchema: toolSchema(chatToolSchemas.get_file_info.output),
      execute: async (input) => executeGetFileInfo(fileOpsCtx(ctx), input),
    }),

    // --- Note operations (granular, replacing note_agent) ---

    create_note: tool({
      description:
        "Create a new markdown note with explicit title and content. You provide the title and content directly — no AI drafting is used. Specify tags and an optional folder path. Use list_files first to find the folder ID if targeting a specific folder.",
      inputSchema: toolSchema(chatToolSchemas.create_note.input),
      outputSchema: toolSchema(chatToolSchemas.create_note.output),
      execute: async (input) => executeCreateNote(noteOpsCtx(ctx), input),
    }),
    read_note: tool({
      description:
        "Read a markdown note's full content by file ID. Requires a real file ID obtained from list_notes, list_files, or search_materials. Never invent file IDs — always discover them first.",
      inputSchema: toolSchema(chatToolSchemas.read_note.input),
      outputSchema: toolSchema(chatToolSchemas.read_note.output),
      execute: async (input) => executeReadNote(noteOpsCtx(ctx), input),
    }),
    update_note: tool({
      description:
        "Update a markdown note's content by file ID. Requires a real file ID obtained from list_notes, list_files, or search_materials. First call read_note, then provide mode, explicit markdown content for that mode, and the returned contentSha256 as baseContentSha256. Never invent file IDs — always discover them with list_notes or list_files first.",
      inputSchema: toolSchema(chatToolSchemas.update_note.input),
      outputSchema: toolSchema(chatToolSchemas.update_note.output),
      execute: async (input) => executeUpdateNote(noteOpsCtx(ctx), input),
    }),
    list_notes: tool({
      description:
        "List all markdown notes in the workspace with content previews, tags, and word counts. Returns real file IDs you must use in read_note, update_note, or update_note_tags. Always call this or list_files first to discover real file IDs before operating on notes.",
      inputSchema: toolSchema(chatToolSchemas.list_notes.input),
      outputSchema: toolSchema(chatToolSchemas.list_notes.output),
      execute: async (input) => executeListNotes(noteOpsCtx(ctx), input),
    }),
    update_note_tags: tool({
      description:
        "Update tags on a markdown note. Requires a real file ID from list_notes or list_files. Use mode 'replace' to set tags, 'add' to append, or 'remove' to delete specific tags. Never invent file IDs.",
      inputSchema: toolSchema(chatToolSchemas.update_note_tags.input),
      outputSchema: toolSchema(chatToolSchemas.update_note_tags.output),
      execute: async (input) => executeUpdateNoteTags(noteOpsCtx(ctx), input),
    }),

    log_misconception: tool({
      description:
        "Record a misconception only when the user explicitly reports a durable misunderstanding or the conversation clearly establishes a wrong mental model. Use confidence for the learner's current confidence with the concept, not classifier certainty. Do not use it for normal questions, feature checks, or one-off clarifications.",
      inputSchema: toolSchema(chatToolSchemas.log_misconception.input),
      outputSchema: toolSchema(chatToolSchemas.log_misconception.output),
      execute: async (input) => logMisconceptionForTool(ctx, input),
    }),
    list_misconceptions: tool({
      description:
        "List the current active misconceptions in the workspace through the low-latency cache. Use when server-provided misconception memory is absent, stale, or too broad, or when the user shows clear distress, confusion, or repeated struggle in a topic.",
      inputSchema: toolSchema(chatToolSchemas.list_misconceptions.input),
      outputSchema: toolSchema(chatToolSchemas.list_misconceptions.output),
      execute: async (input) => listMisconceptionsForTool(ctx, input),
    }),
    resolve_misconception: tool({
      description:
        "Mark a misconception as resolved after the user demonstrates understanding. Use after a correct explanation or a clean review streak.",
      inputSchema: toolSchema(chatToolSchemas.resolve_misconception.input),
      outputSchema: toolSchema(chatToolSchemas.resolve_misconception.output),
      execute: async (input) => resolveMisconceptionForTool(ctx, input),
    }),
    clear_misconception: tool({
      description:
        "Clear a misconception once it has been fully corrected. This is the explicit version of resolve_misconception.",
      inputSchema: toolSchema(chatToolSchemas.clear_misconception.input),
      outputSchema: toolSchema(chatToolSchemas.clear_misconception.output),
      execute: async (input) => resolveMisconceptionForTool(ctx, input),
    }),
    improve_misconception: tool({
      description:
        "List the current misconception first, then reduce the confidence of an active misconception after the user shows partial improvement.",
      inputSchema: toolSchema(chatToolSchemas.improve_misconception.input),
      outputSchema: toolSchema(chatToolSchemas.improve_misconception.output),
      execute: async (input) => improveMisconceptionForTool(ctx, input),
    }),
    generate_flashcards: tool({
      description:
        "Generate a persisted Mindset Set from a file, search query, or provided source text. Use only when the user explicitly asks for a Mindset Set, flashcards, mindset cards, or study cards.",
      inputSchema: toolSchema(chatToolSchemas.generate_flashcards.input),
      outputSchema: toolSchema(chatToolSchemas.generate_flashcards.output),
      execute: async (input) => generateFlashcardsFromSource(ctx, input),
    }),
    generate_flashcards_from_misconception: tool({
      description:
        "Generate a Mindset Set from an active misconception so the user can train the correct model directly.",
      inputSchema: toolSchema(
        chatToolSchemas.generate_flashcards_from_misconception.input
      ),
      outputSchema: toolSchema(
        chatToolSchemas.generate_flashcards_from_misconception.output
      ),
      execute: async (input) => generateFlashcardsFromMisconception(ctx, input),
    }),
    get_due_cards: tool({
      description:
        "Show how many study cards are due and preview the next due items. Use when the user asks about due cards or study progress, and also when the user is clearly struggling with a topic and you want to check whether relevant cards are due.",
      inputSchema: toolSchema(chatToolSchemas.get_due_cards.input),
      outputSchema: toolSchema(chatToolSchemas.get_due_cards.output),
      execute: async (input) => executeGetDueCards(ctx, input),
    }),
    quiz_me: tool({
      description:
        "Generate a persisted multiple choice quiz set from a file, query, or provided source text. Use only when the user explicitly asks for a quiz.",
      inputSchema: toolSchema(chatToolSchemas.quiz_me.input),
      outputSchema: toolSchema(chatToolSchemas.quiz_me.output),
      execute: async (input) => generateQuizFromSource(ctx, input),
    }),
    load_skill: tool({
      description:
        "Load a study or teaching skill into context before acting on a matching task.",
      inputSchema: toolSchema(chatToolSchemas.load_skill.input),
      outputSchema: toolSchema(chatToolSchemas.load_skill.output),
      execute: async (input) => executeLoadSkill(input),
    }),
    get_teaching_workspace: tool({
      description:
        "Read the private teaching workspace for this user and workspace. Use it before teaching, planning a learning path, or running a learning retrospective. This state is not a visible workspace file.",
      inputSchema: toolSchema(chatToolSchemas.get_teaching_workspace.input),
      outputSchema: toolSchema(chatToolSchemas.get_teaching_workspace.output),
      execute: async (input) => executeGetTeachingWorkspace(ctx, input),
    }),
    read_teaching_artifact: tool({
      description:
        "Read one full teaching artifact (mission, resource, note, reference, lesson, or learning-record) by kind and slug after get_teaching_workspace identifies it. Use for targeted content reads.",
      inputSchema: toolSchema(chatToolSchemas.read_teaching_artifact.input),
      outputSchema: toolSchema(chatToolSchemas.read_teaching_artifact.output),
      execute: async (input) => executeReadTeachingArtifact(ctx, input),
    }),
    save_teaching_artifact: tool({
      description:
        "Save mission, resource, note, reference, lesson, or learning-record content to the private teaching workspace. Use explicit complete content; do not create visible workspace files for teaching state.",
      inputSchema: toolSchema(chatToolSchemas.save_teaching_artifact.input),
      outputSchema: toolSchema(chatToolSchemas.save_teaching_artifact.output),
      execute: async (input) => executeSaveTeachingArtifact(ctx, input),
    }),
    visualize_read_me: tool({
      description:
        "Load visualization guidelines for widget generation. Call this before generating widgets to get detailed instructions for interactive HTML/CSS/SVG fragments.",
      inputSchema: toolSchema(chatToolSchemas.visualize_read_me.input),
      outputSchema: toolSchema(chatToolSchemas.visualize_read_me.output),
      execute: async (input) => executeVisualizeReadMe(input),
    }),
    show_widget: tool({
      description:
        "Render an interactive HTML/CSS/JS widget in the chat. Use for visualizations, diagrams, charts, simulations, and interactive explainers.",
      inputSchema: toolSchema(chatToolSchemas.show_widget.input),
      outputSchema: toolSchema(chatToolSchemas.show_widget.output),
      execute: async (input) =>
        executeShowWidgetWithOptions(input, {
          chargeWidgetGeneration: ctx.chargeWidgetGeneration,
        }),
    }),
  };
}
