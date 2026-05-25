import type { UIMessage } from "@avenire/ai/message-types";
import type { ActivityAction } from "@/components/chat/rolling-tool-activity-types";

export type ToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` }
>;
export type CompletedToolPart = Extract<
  ToolPart,
  { state: "output-available" }
>;

export const HIDDEN_TOOL_TYPES = new Set([
  "tool-ingestion_job",
  "tool-ingest_file",
  "tool-background_task",
  "tool-system_call",
  "tool-internal",
]);

export const TOOL_LABELS: Record<string, string> = {
  "tool-note_agent": "Notes",
  "tool-search_materials": "Search",
  "tool-web_search": "Web search",
  "tool-generate_flashcards": "Mindset Set",
  "tool-get_due_cards": "Due cards",
  "tool-quiz_me": "Quiz",
  "tool-load_skill": "Skill",
  "tool-visualize_read_me": "Visual guide",
  "tool-show_widget": "Widget",
  "tool-avenire_agent": "Research",
  "tool-file_manager_agent": "Files",
};

export function getToolLabel(toolType: string): string {
  return (
    TOOL_LABELS[toolType] ??
    toolType
      .replace(/^tool-/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function extractQueryFromPart(part: ToolPart): string {
  if ("input" in part && part.input) {
    if ("query" in part.input) {
      return String((part.input as { query?: string }).query ?? "");
    }
    if ("task" in part.input) {
      return String((part.input as { task?: string }).task ?? "");
    }
  }

  if (part.state === "output-available" && "output" in part) {
    if ("query" in part.output) {
      return String((part.output as { query?: string }).query ?? "");
    }
    if ("task" in part.output) {
      return String((part.output as { task?: string }).task ?? "");
    }
  }

  return "";
}

function extractCitationMatches(part: ToolPart): string[] {
  if (part.state !== "output-available" || !("citations" in part.output)) {
    return [];
  }
  if (!Array.isArray(part.output.citations)) {
    return [];
  }
  return part.output.citations
    .map((citation) =>
      typeof citation.workspacePath === "string" ? citation.workspacePath : null
    )
    .filter((path): path is string => Boolean(path))
    .slice(0, 6);
}

function extractFileReadActions(part: ToolPart): ActivityAction[] {
  if (part.state !== "output-available" || !("files" in part.output)) {
    return [];
  }

  const files = Array.isArray(part.output.files) ? part.output.files : [];
  const actions: ActivityAction[] = [];
  for (const file of files) {
    if (!file || typeof file.workspacePath !== "string") {
      continue;
    }

    const maybeExcerpt = (file as { excerpt?: unknown }).excerpt;
    if (typeof maybeExcerpt !== "string") {
      continue;
    }

    actions.push({
      kind: "read",
      pending: false,
      value: file.workspacePath,
      preview: {
        content: maybeExcerpt,
        path: file.workspacePath,
      },
    });
  }
  return actions;
}

export function buildAgentActionsFromToolPart(
  part: ToolPart
): ActivityAction[] {
  if (
    part.type !== "tool-avenire_agent" &&
    part.type !== "tool-file_manager_agent"
  ) {
    return [];
  }

  const taskLabel =
    part.type === "tool-avenire_agent" ? "query" : "workspace files";
  const query = extractQueryFromPart(part);
  const actions: ActivityAction[] = [];

  if (query) {
    if (part.type === "tool-avenire_agent") {
      const matches = extractCitationMatches(part);
      actions.push({
        kind: "search",
        pending: part.state !== "output-available",
        value: query,
        preview:
          matches.length > 0
            ? {
                matches,
                query,
              }
            : undefined,
      });
    } else {
      actions.push({
        kind: "list",
        pending: part.state !== "output-available",
        value: taskLabel,
      });
    }
  }

  actions.push(...extractFileReadActions(part));
  return actions;
}
