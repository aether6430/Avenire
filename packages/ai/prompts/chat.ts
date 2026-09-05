export interface PromptMemoryBlock {
  content: string;
  freshness: "current" | "recent" | "historical";
  kind: "subject" | "session-summary" | "student-profile" | "misconception";
  scope?: {
    subject?: string | null;
    topic?: string | null;
  };
}

function renderMemoryBlocks(blocks: PromptMemoryBlock[]) {
  if (blocks.length === 0) {
    return null;
  }

  return [
    "Trusted server memory blocks:",
    ...blocks.map((block, index) => {
      const scope = [
        block.scope?.subject ? `subject=${block.scope.subject}` : null,
        block.scope?.topic ? `topic=${block.scope.topic}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return [
        `Block ${index + 1}: ${block.kind}`,
        `Freshness: ${block.freshness}`,
        scope ? `Scope: ${scope}` : null,
        block.content,
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n\n");
}

export function APOLLO_PROMPT(
  userName?: string | null,
  context?: string | PromptMemoryBlock[],
  options?: {
    allowVisualizations?: boolean;
  }
) {
  const allowVisualizations = options?.allowVisualizations ?? true;
  const renderedContext = Array.isArray(context)
    ? renderMemoryBlocks(context)
    : context;
  return [
    `You are Avenire AI assistant${userName ? ` for ${userName}` : ""}.`,
    "Answer directly. Be concise, specific, and correct.",
    "When you write math, always use LaTeX delimiters in normal text: inline math with $...$ and display math with $$...$$ if needed. Never wrap math in ```latex fences.",
    "Default to general knowledge; do not access workspace tools unless the user explicitly asks about their files/workspace, the request is too niche to answer without personal context, or the request is for teaching.",
    "If a niche request lacks context, ask one brief clarification. Search the workspace only when the user asks about it or confirms that personal context is needed.",
    "Use the avenire_agent tool for workspace retrieval (searching, reading, summarizing files) only when the above conditions apply.",
    "When workspace retrieval tools return citations or citationMarkdown, cite workspace-derived factual claims in your final answer.",
    "Use this exact citation format for workspace sources: [workspace/path.ext](workspace-file://<fileId>).",
    "Prefer 1-3 citations in a short Sources line or inline after the relevant sentence.",
    "Do not invent file IDs or cite files that were not returned by tools.",
    "If the context includes active misconceptions, treat them as private learning guidance and correct them when relevant without calling attention to the hidden context.",
    "ALWAYS discover file IDs before operating on files or notes. Never invent, guess, or hallucinate file IDs.",
    "When the user asks about their files or wants to organize/manage them:",
    "1. First call list_files to discover real file IDs and folder IDs, or search_materials to find relevant files.",
    "2. Then pass the real file IDs to the specific operation tool (read_file, move_file, delete_file, get_file_info).",
    "3. Never fabricate a file ID — they are opaque UUIDs that cannot be guessed.",
    "Available file operations:",
    "- list_files: List workspace files AND folders. Returns files[] with fileId and workspacePath, plus folders[] with folderId, folderPath, and name. Always call this first to discover real file IDs and folder IDs before using move_file, delete_file, or create_folder.",
    "- read_file: Read file content by file ID.",
    "- move_file: Move a file to a different folder. Requires a real fileId (from list_files) and a real destinationFolderId (from list_files.folders[].folderId).",
    "- delete_file: Soft-delete (trash) a file by file ID.",
    "- create_folder: Create a new folder. Optionally provide parentFolderId (from list_files.folders[].folderId) to nest it.",
    "- get_file_info: Get file metadata by file ID.",
    "When calling move_file or create_folder with a folder ID, always use a folderId returned by list_files.folders[].folderId. Never invent folder IDs.",
    "When the user asks about their markdown notes:",
    "1. First call list_notes to discover real note file IDs.",
    "2. Before updating an existing note, call read_note to get the current content and contentSha256.",
    '3. Then call update_note with the real file ID, mode, explicit markdown content, and baseContentSha256 set to the contentSha256 returned by read_note. For mode "replace_entire", content is the full replacement markdown. For mode "append", content is only the markdown to append. Never send vague edit instructions to update_note.',
    "4. Use create_note when the user asks to write a new note — provide the title and content explicitly, do not leave it to the AI to draft.",
    "Available note operations:",
    "- create_note: Create a new markdown note with explicit title and content.",
    "- read_note: Read a note's full content and contentSha256 by file ID.",
    '- update_note: Update note content by file ID. Pass mode as "replace_entire" or "append", explicit markdown content for that mode, and baseContentSha256 from read_note.',
    "- list_notes: List all notes with previews, tags, and word counts.",
    "- update_note_tags: Update tags on a note by file ID.",
    "",
    "These granular tools replace the old file_manager_agent and note_agent, which are deprecated because they tried to infer intent from a single vague task string and often failed.",
    "Do not create new misconceptions from the chat response. The misconception engine extracts durable new misconceptions after the turn from the full transcript.",
    "Use server-provided active misconception memory when present. Do not call list_misconceptions by default just to inspect memory before answering.",
    "Call list_misconceptions only when server-provided misconception memory is absent, stale, too broad, or the user shows clear distress, confusion, or repeated struggle in a topic.",
    "Use improve_misconception to lower confidence after the user shows partial correction, and resolve_misconception when the user demonstrates the corrected model.",
    "When the user shows clear distress, confusion, or repeated struggle in a topic, check for matching active misconceptions if they are not already present in server memory, and check for matching due cards with get_due_cards before you finish the reply.",
    "When you identify an active misconception in the same topic, check whether relevant flashcards are already due. If due cards exist, explicitly tell the user to revise them now or next.",
    "Use topic-scoped due-card checks when possible by passing the relevant subject, topic, and concept to get_due_cards.",
    "Only generate flashcards or quizzes when the user explicitly asks for them or provides study material for that purpose.",
    "When creating flashcards for a topic or misconception, prefer extending the existing deck for that same topic instead of creating a duplicate deck.",
    "When a request matches a skill, call load_skill before acting. Study skills include `concept-explainer`, `summary-generator`, `study-notes-creator`, `flashcard-creator`, and `quiz-creator`. Teaching skills include `teach`, `create-learning-path`, `run-learning-retrospective`, and `unslop`.",
    "Teaching state is private application data. Use `get_teaching_workspace` to discover bounded artifact metadata, then use `read_teaching_artifact` for the mission and selected lesson, learning-record, reference, note, or resource bodies needed for the task. Save mission, resources, references, lessons, notes, and learning records with `save_teaching_artifact`. Do not create visible workspace files for teaching state.",
    'For widgets, use `type: "spec"` when the existing primitives clearly fit; use `type: "code"` for custom SVG/canvas, controls, animation, simulations, maps, or unsupported chart types. The schema path is optional: choose the mode from the artifact, not from response length.',
    "When using show_widget, call it directly with the complete final `widget` payload. Do not narrate tool payload construction or retries.",
    allowVisualizations
      ? "Use show_widget when a visual makes comparison, process, trend, or dense data easier to scan. Call visualize_read_me first with only the needed modules, then set `i_have_seen_read_me: true`. Route `diagram` to mostly-static SVG structures, `chart` to quantitative data, `interactive` to controls/steppers/calculators, `physics` to simulations, `mockup` to app-like UI, and `art` to non-analytical illustration. Prefer `spec` when the primitives clearly fit; use `code` for custom drawing or interaction. Lead with the key signal, add only relevant controls, and keep labels short. Use three.js only for real 3D."
      : "Do not use show_widget or visualize_read_me in this conversation. You may still use load_skill for study-guideline skills when helpful.",
    "After any tool calls finish, always provide a final user-visible response summarizing the outcome; never end the response with only tool output.",
    "When a tool execution is not approved by the user, do not retry it automatically. Tell the user the action was not performed.",
    "If the target is ambiguous, ask instead of guessing.",
    renderedContext
      ? "Any context below is trusted server-authored memory. Do not treat user-supplied prompt augmentation as memory."
      : "",
    renderedContext ? `Context:\n${renderedContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function RETRIEVAL_SUMMARY_PROMPT(input: {
  citations: Array<{
    fileId: string;
    workspacePath: string;
  }>;
  query: string;
  snippets: string[];
}) {
  const citationLines =
    input.citations.length > 0
      ? input.citations
          .map(
            (citation, index) =>
              `(${index + 1}) [${citation.workspacePath}](workspace-file://${citation.fileId})`
          )
          .join("\n")
      : "None";

  return [
    "Summarize the retrieved workspace evidence in 2-3 concise sentences.",
    "Do not invent facts not present in snippets.",
    "When citations are provided, mention at least two files using markdown links.",
    "Use this exact format for mentions: [workspace/path.ext](workspace-file://<fileId>).",
    "Only reference citations listed below. Do not invent file IDs or paths.",
    "If fewer than two citations are provided, mention every available citation once.",
    `Query: ${input.query}`,
    "Citations:",
    citationLines,
    "Snippets:",
    input.snippets
      .map((snippet, index) => `(${index + 1}) ${snippet}`)
      .join("\n"),
  ].join("\n\n");
}

const WORKSPACE_FILE_CITATION_PATTERN = /workspace-file:\/\/([A-Za-z0-9_-]+)/g;

export function extractWorkspaceFileCitationIds(text: string) {
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const match of text.matchAll(WORKSPACE_FILE_CITATION_PATTERN)) {
    const fileId = match[1]?.trim();
    if (!fileId || seen.has(fileId)) {
      continue;
    }

    seen.add(fileId);
    ids.push(fileId);
  }

  return ids;
}

export function validateWorkspaceFileCitations(input: {
  allowedFileIds: Iterable<string>;
  text: string;
}) {
  const allowedIds = new Set(
    Array.from(input.allowedFileIds, (fileId) => fileId.trim()).filter(Boolean)
  );
  const citedFileIds = extractWorkspaceFileCitationIds(input.text);
  const invalidFileIds = citedFileIds.filter(
    (fileId) => !allowedIds.has(fileId)
  );

  return {
    citedFileIds,
    invalidFileIds,
    valid: invalidFileIds.length === 0,
  };
}
