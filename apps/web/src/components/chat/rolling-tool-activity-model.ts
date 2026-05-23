import type {
  ActionGroup,
  ActivityAction,
  ExploreAction,
  ExploreItem,
  NotePreview,
  SearchPreview,
  ToolPart,
} from "@/components/chat/rolling-tool-activity-types";
import {
  isRollingToolActionExplore,
  isRollingToolPart,
} from "@/components/chat/rolling-tool-activity-types";

function isOutputAvailable(part: ToolPart) {
  return part.state === "output-available";
}

function isPending(part: ToolPart) {
  return part.state === "input-streaming" || part.state === "input-available";
}

function toPreviewContent(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value.trim();
}

function toSearchPreview(part: ToolPart): SearchPreview | undefined {
  if (
    (part.type !== "tool-search_materials" &&
      part.type !== "tool-web_search") ||
    !isOutputAvailable(part)
  ) {
    return undefined;
  }

  return {
    matches:
      part.type === "tool-search_materials"
        ? part.output.matches
            .map((match) => match.workspacePath)
            .filter(Boolean)
            .slice(0, 6)
        : part.output.results
            .map((result) => result.title || result.url)
            .filter(Boolean)
            .slice(0, 6),
    query: part.output.query,
  };
}

function toNotePreview(part: ToolPart): NotePreview | undefined {
  if (part.type !== "tool-note_agent" || !isOutputAvailable(part)) {
    return undefined;
  }

  return {
    noteCount: Array.isArray(part.output.notes) ? part.output.notes.length : 0,
    operation: part.output.operation,
    title: part.output.notes[0]?.title,
  };
}

function toActionValue(part: ToolPart) {
  if (
    part.type === "tool-avenire_agent" ||
    part.type === "tool-file_manager_agent"
  ) {
    if (isOutputAvailable(part) && "files" in part.output) {
      const files = Array.isArray(part.output.files) ? part.output.files : [];
      return files[0]?.workspacePath ?? "workspace";
    }
    if (part.input && "query" in part.input) {
      return part.input.query ?? "workspace";
    }
    if (part.input && "task" in part.input) {
      return part.input.task ?? "workspace";
    }
    return "workspace";
  }
  if (part.type === "tool-note_agent") {
    if (isOutputAvailable(part)) {
      return part.output.notes[0]?.workspacePath ?? "note";
    }
    return part.input?.task ?? "note";
  }
  if (
    part.type === "tool-search_materials" ||
    part.type === "tool-web_search"
  ) {
    return part.input?.query ?? "search";
  }
  return "";
}

export function toRollingToolAction(part: ToolPart): ActivityAction | null {
  if (!isRollingToolPart(part)) {
    return null;
  }

  if (part.state === "output-error") {
    return {
      error: part.errorText ?? "Unknown error",
      kind: "error",
      pending: false,
    };
  }

  if (
    part.type === "tool-avenire_agent" ||
    part.type === "tool-file_manager_agent"
  ) {
    let query = "workspace";
    if (part.input && "query" in part.input) {
      query = part.input.query ?? "workspace";
    } else if (part.input && "task" in part.input) {
      query = part.input.task ?? "workspace";
    }
    if (part.type === "tool-avenire_agent") {
      return {
        kind: "search",
        pending: isPending(part),
        preview: toSearchPreview(part),
        value: query,
      };
    }
    return {
      kind: "list",
      pending: isPending(part),
      value: query,
    };
  }

  if (part.type === "tool-note_agent") {
    const operation = isOutputAvailable(part)
      ? part.output.operation
      : "listed";
    const pending = isPending(part);
    const path = isOutputAvailable(part)
      ? (part.output.notes[0]?.workspacePath ?? "note")
      : (part.input?.task ?? "note");
    if (pending || operation === "created" || operation === "updated") {
      return {
        kind: "notes",
        pending,
        preview: toNotePreview(part),
        value: path,
      };
    }
    return {
      kind: "read",
      pending,
      preview: isOutputAvailable(part)
        ? {
            content: part.output.notes[0]?.contentPreview?.slice(0, 200) ?? "",
            path,
          }
        : undefined,
      value: path,
    };
  }

  if (
    part.type === "tool-search_materials" ||
    part.type === "tool-web_search"
  ) {
    return {
      kind: "search",
      pending: isPending(part),
      preview: toSearchPreview(part),
      value: toActionValue(part) || "search",
    };
  }

  if (part.type === "tool-generate_flashcards") {
    return {
      kind: "flashcards",
      pending: isPending(part),
      preview:
        isOutputAvailable(part) &&
        part.output &&
        Array.isArray(part.output.cards)
          ? {
              cardCount: part.output.cards.length,
              setId: part.output.setId,
              title: part.output.title,
            }
          : undefined,
      value: part.input?.title ?? "Mindset Set",
    };
  }

  if (part.type === "tool-quiz_me") {
    return {
      kind: "quiz",
      pending: isPending(part),
      preview:
        isOutputAvailable(part) && part.output
          ? {
              questionCount: part.output.questionCount,
              setId: part.output.setId,
              title: part.output.title,
            }
          : undefined,
      value: part.input?.title ?? "quiz",
    };
  }

  if (part.type === "tool-log_misconception") {
    const output = isOutputAvailable(part) ? part.output : null;
    const misconception = output?.misconception;

    return {
      kind: "misconception",
      pending: isPending(part),
      preview: misconception
        ? {
            confidence: misconception.confidence,
            concept: misconception.concept,
            topic: misconception.topic,
          }
        : undefined,
      value:
        misconception?.concept ?? part.input?.concept ?? "misconception memory",
    };
  }

  return null;
}

function labelFor(action: ExploreAction): string {
  switch (action.kind) {
    case "read":
      return "Read";
    case "search":
      return "Search";
    case "list":
      return "List";
    default:
      return "";
  }
}

export function groupRollingToolActions(
  actions: ActivityAction[]
): ActionGroup[] {
  const groups: ActionGroup[] = [];

  for (const action of actions) {
    if (isRollingToolActionExplore(action)) {
      const item: ExploreItem = {
        action,
        label: labelFor(action),
        value: action.value,
      };
      const lastGroup = groups.at(-1);
      if (lastGroup?.type === "explore") {
        lastGroup.items.push(item);
      } else {
        groups.push({ items: [item], type: "explore" });
      }
      continue;
    }

    groups.push({ action, type: "mutation" });
  }

  return groups;
}

export function buildRollingToolSummary(items: ExploreItem[]) {
  const reads = items.filter((item) => item.action.kind === "read").length;
  const searches = items.filter((item) => item.action.kind === "search").length;
  const lists = items.filter((item) => item.action.kind === "list").length;
  const parts: string[] = [];

  if (reads > 0) {
    parts.push(`${reads} read${reads === 1 ? "" : "s"}`);
  }
  if (searches > 0) {
    parts.push(`${searches} search${searches === 1 ? "" : "es"}`);
  }
  if (lists > 0) {
    parts.push(`${lists} list${lists === 1 ? "" : "s"}`);
  }

  return parts.join(", ");
}
