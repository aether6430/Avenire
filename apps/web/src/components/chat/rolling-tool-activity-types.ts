import type { UIMessage } from "@avenire/ai/message-types";

export type ToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` }
>;

export interface ReadPreview {
  content: string;
  path: string;
}

export interface SearchPreview {
  matches: string[];
  query: string;
}

export interface NotePreview {
  noteCount: number;
  operation: "created" | "listed" | "read" | "updated";
  title?: string;
}

export interface FlashcardPreview {
  cardCount: number;
  setId: string;
  title: string;
}

export interface QuizPreview {
  questionCount: number;
  setId: string;
  title: string;
}

export type ActivityAction =
  | {
      error?: string;
      kind: "error";
      pending: boolean;
    }
  | {
      kind: "create" | "delete" | "edit";
      path: string;
      pending: boolean;
    }
  | {
      from: string;
      kind: "move";
      pending: boolean;
      to?: string;
    }
  | {
      kind: "list";
      pending: boolean;
      value: string;
    }
  | {
      kind: "read";
      pending: boolean;
      preview?: ReadPreview;
      value: string;
    }
  | {
      kind: "search";
      pending: boolean;
      preview?: SearchPreview;
      value: string;
    }
  | {
      kind: "notes";
      pending: boolean;
      preview?: NotePreview;
      value: string;
    }
  | {
      kind: "flashcards";
      pending: boolean;
      preview?: FlashcardPreview;
      value: string;
    }
  | {
      kind: "quiz";
      pending: boolean;
      preview?: QuizPreview;
      value: string;
    };

export type ExploreAction = Extract<
  ActivityAction,
  { kind: "list" | "read" | "search" }
>;
export type MutationAction = Exclude<ActivityAction, ExploreAction>;

export interface ExploreItem {
  action: ExploreAction;
  label: string;
  value: string;
}

export type ActionGroup =
  | { items: ExploreItem[]; type: "explore" }
  | { action: MutationAction; type: "mutation" };

const ROLLING_TOOL_TYPES = new Set([
  "tool-avenire_agent",
  "tool-file_manager_agent",
  "tool-generate_flashcards",
  "tool-get_due_cards",
  "tool-note_agent",
  "tool-quiz_me",
  "tool-web_search",
  "tool-search_materials",
]);

const EXPLORE_KINDS = new Set<ActivityAction["kind"]>([
  "list",
  "read",
  "search",
]);

export function isRollingToolActionExplore(
  action: ActivityAction
): action is ExploreAction {
  return EXPLORE_KINDS.has(action.kind);
}

export function isRollingToolPart(part: ToolPart) {
  return (
    part.state !== "approval-requested" &&
    part.state !== "approval-responded" &&
    ROLLING_TOOL_TYPES.has(part.type)
  );
}
