"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { Collapsible } from "@avenire/ui/components/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@avenire/ui/components/context-menu";
import {
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { m, useSpring } from "framer-motion";
import {
  type ComponentProps,
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChatSpinnerGlyph } from "@/components/chat/spinner";
import { getTreeFileIconComponent } from "@/components/files/tree-file-icon";
import { cn } from "@/lib/utils";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";
import { useWorkspacePaneNavigation } from "@/lib/workspace-panes";

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

interface ReadPreview {
  content: string;
  path: string;
}

interface SearchPreview {
  matches: string[];
  query: string;
}

interface NotePreview {
  content?: string;
  fileId?: string;
  noteCount: number;
  operation: "created" | "listed" | "read" | "updated";
  previousContent?: string;
  title?: string;
}

interface FlashcardPreview {
  cardCount: number;
  setId: string;
  title: string;
}

interface QuizPreview {
  questionCount: number;
  setId: string;
  title: string;
}

interface MisconceptionPreview {
  concept?: string;
  confidence?: number;
  topic?: string;
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
    }
  | {
      kind: "misconception";
      pending: boolean;
      preview?: MisconceptionPreview;
      value: string;
    };

type ExploreAction = Extract<
  ActivityAction,
  { kind: "list" | "read" | "search" }
>;
type MutationAction = Exclude<ActivityAction, ExploreAction>;

interface ExploreItem {
  action: ExploreAction;
  label: string;
  value: string;
}

type ActionGroup =
  | { items: ExploreItem[]; type: "explore"; groupUid: number }
  | { action: MutationAction; type: "mutation"; groupUid: number };

const ROLLING_TOOL_TYPES = new Set([
  "tool-avenire_agent",
  "tool-file_manager_agent",
  "tool-search_materials",
  "tool-web_search",
  "tool-list_files",
  "tool-read_file",
  "tool-move_file",
  "tool-delete_file",
  "tool-create_folder",
  "tool-get_file_info",
  "tool-generate_flashcards",
  "tool-get_due_cards",
  "tool-log_misconception",
  "tool-note_agent",
  "tool-quiz_me",
  "tool-create_note",
  "tool-read_note",
  "tool-update_note",
  "tool-list_notes",
  "tool-update_note_tags",
]);

const EXPLORE_KINDS = new Set<ActivityAction["kind"]>([
  "list",
  "read",
  "search",
]);
const ROW_HEIGHT = 22;
const VISIBLE_ROWS = 3;
const WINDOW_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
const MUTATION_ROW_ENTER_CLASS =
  "animate-in fade-in-0 slide-in-from-bottom-1 duration-200";
const INLINE_MUTATION_TOOL_TYPES = new Set([
  "tool-create_note",
  "tool-update_note",
]);

function isOutputAvailable(part: ToolPart) {
  return part.state === "output-available";
}

function isPending(part: ToolPart) {
  return part.state === "input-streaming" || part.state === "input-available";
}

function isExploreAction(action: ActivityAction): action is ExploreAction {
  return EXPLORE_KINDS.has(action.kind);
}

function toPreviewContent(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value.trim();
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function _toReadPreview(part: ToolPart): ReadPreview | undefined {
  if (
    part.type === "tool-avenire_agent" ||
    part.type === "tool-file_manager_agent"
  ) {
    if (!(isOutputAvailable(part) && "files" in part.output)) {
      return undefined;
    }
    const files = Array.isArray(part.output.files) ? part.output.files : [];
    const firstFile = files[0];
    if (!firstFile || typeof firstFile.excerpt !== "string") {
      return undefined;
    }
    return {
      content: toPreviewContent(firstFile.excerpt),
      path: firstFile.workspacePath,
    };
  }
  // Granular read_file
  if (part.type === "tool-read_file" && isOutputAvailable(part)) {
    return {
      content: toPreviewContent(part.output.content),
      path: part.output.workspacePath,
    };
  }
  if (part.type === "tool-read_note" && isOutputAvailable(part)) {
    return {
      content: toPreviewContent(part.output.content),
      path: part.output.workspacePath,
    };
  }
  return undefined;
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
  if (part.type === "tool-note_agent" && isOutputAvailable(part)) {
    return {
      noteCount: Array.isArray(part.output.notes) ? part.output.notes.length : 0,
      operation: part.output.operation,
      title: part.output.notes[0]?.title,
    };
  }
  // Granular note tools
  if (part.type === "tool-create_note" && isOutputAvailable(part)) {
    return {
      content: part.output.content,
      fileId: part.output.fileId,
      noteCount: 1,
      operation: "created",
      title: part.output.title,
    };
  }
  if (part.type === "tool-create_note" && isPending(part)) {
    const input = recordValue(part.input);
    return {
      content: stringField(input, "content"),
      noteCount: 1,
      operation: "created",
      title: stringField(input, "title"),
    };
  }
  if (part.type === "tool-read_note" && isOutputAvailable(part)) {
    return {
      noteCount: 1,
      operation: "read",
      title: part.output.title,
    };
  }
  if (part.type === "tool-update_note" && isOutputAvailable(part)) {
    return {
      content: part.output.content,
      fileId: part.output.fileId,
      noteCount: 1,
      operation: "updated",
      previousContent: part.output.previousContent,
      title: part.output.title ?? part.output.workspacePath,
    };
  }
  if (part.type === "tool-update_note" && isPending(part)) {
    const input = recordValue(part.input);
    return {
      content: stringField(input, "content"),
      fileId: stringField(input, "fileId"),
      noteCount: 1,
      operation: "updated",
      title: stringField(input, "fileId"),
    };
  }
  if (part.type === "tool-list_notes" && isOutputAvailable(part)) {
    return undefined;
  }
  return undefined;
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
  // Granular file operations
  if (
    part.type === "tool-list_files" ||
    part.type === "tool-read_file" ||
    part.type === "tool-get_file_info"
  ) {
    if (isOutputAvailable(part) && "workspacePath" in part.output) {
      return (part.output as { workspacePath?: string }).workspacePath ?? "file";
    }
    if (part.input && "fileId" in part.input) {
      return (part.input as { fileId?: string }).fileId ?? "file";
    }
    return "file";
  }
  if (part.type === "tool-move_file") {
    if (isOutputAvailable(part)) {
      return (part.output as { workspacePath?: string }).workspacePath ?? "file";
    }
    return (part.input as { fileId?: string }).fileId ?? "file";
  }
  if (part.type === "tool-delete_file") {
    if (isOutputAvailable(part)) {
      return (part.output as { workspacePath?: string }).workspacePath ?? "file";
    }
    return (part.input as { fileId?: string }).fileId ?? "file";
  }
  if (part.type === "tool-create_folder") {
    if (isOutputAvailable(part)) {
      return (part.output as { folderPath?: string }).folderPath ?? "folder";
    }
    return (part.input as { name?: string }).name ?? "folder";
  }
  // Granular note operations
  if (
    part.type === "tool-create_note" ||
    part.type === "tool-read_note" ||
    part.type === "tool-update_note" ||
    part.type === "tool-list_notes" ||
    part.type === "tool-update_note_tags"
  ) {
    if (part.type === "tool-list_notes" && isOutputAvailable(part)) {
      return `${part.output.totalCount} notes`;
    }
    if (isOutputAvailable(part) && "workspacePath" in part.output) {
      return (part.output as { workspacePath?: string }).workspacePath ?? "note";
    }
    if (isOutputAvailable(part) && "title" in part.output) {
      return (part.output as { title?: string }).title ?? "note";
    }
    if (part.input && "fileId" in part.input) {
      return (part.input as { fileId?: string }).fileId ?? "note";
    }
    return "note";
  }
  return "";
}

function toAction(part: ToolPart): ActivityAction | null {
  if (
    part.state === "approval-requested" ||
    part.state === "approval-responded" ||
    !ROLLING_TOOL_TYPES.has(part.type)
  ) {
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

  // Granular file operations
  if (part.type === "tool-list_files") {
    return {
      kind: "list",
      pending: isPending(part),
      value: toActionValue(part),
    };
  }
  if (part.type === "tool-read_file" || part.type === "tool-get_file_info") {
    return {
      kind: "read",
      pending: isPending(part),
      preview: _toReadPreview(part),
      value: toActionValue(part),
    };
  }
  if (part.type === "tool-move_file") {
    return {
      from: toActionValue(part),
      kind: "move",
      pending: isPending(part),
    };
  }
  if (part.type === "tool-delete_file") {
    return {
      kind: "delete",
      path: toActionValue(part),
      pending: isPending(part),
    };
  }
  if (part.type === "tool-create_folder") {
    return {
      kind: "create",
      path: toActionValue(part),
      pending: isPending(part),
    };
  }

  // Granular note operations
  if (part.type === "tool-create_note") {
    return {
      kind: "notes",
      pending: isPending(part),
      preview: toNotePreview(part),
      value: toActionValue(part),
    };
  }
  if (part.type === "tool-read_note") {
    return {
      kind: "read",
      pending: isPending(part),
      preview: _toReadPreview(part),
      value: toActionValue(part),
    };
  }
  if (part.type === "tool-update_note") {
    return {
      kind: "notes",
      pending: isPending(part),
      preview: toNotePreview(part),
      value: toActionValue(part),
    };
  }
  if (part.type === "tool-list_notes") {
    return {
      kind: "list",
      pending: isPending(part),
      value: toActionValue(part),
    };
  }
  if (part.type === "tool-update_note_tags") {
    return {
      kind: "edit",
      path: toActionValue(part),
      pending: isPending(part),
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
      value: part.input?.title ?? "flashcards",
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

  if (part.type === "tool-get_due_cards") {
    const totalDueCount = isOutputAvailable(part)
      ? part.output.totalDueCount
      : undefined;
    return {
      kind: "flashcards",
      pending: isPending(part),
      preview:
        typeof totalDueCount === "number"
          ? {
              cardCount: totalDueCount,
              setId: "",
              title: "Due cards",
            }
          : undefined,
      value: "due cards",
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

function groupActions(actions: ActivityAction[]): ActionGroup[] {
  const groups: ActionGroup[] = [];
  let groupUid = 0;

  for (const action of actions) {
    if (isExploreAction(action)) {
      const item: ExploreItem = {
        action,
        label: labelFor(action),
        value: action.value,
      };
      const lastGroup = groups.at(-1);
      if (lastGroup?.type === "explore") {
        lastGroup.items.push(item);
      } else {
        groups.push({ items: [item], type: "explore", groupUid: ++groupUid });
      }
      continue;
    }

    groups.push({ action, type: "mutation", groupUid: ++groupUid });
  }

  return groups;
}

function buildSummary(items: ExploreItem[]) {
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

function Dot({ delay }: { delay: number }) {
  return (
    <m.span
      animate={{ opacity: [0.15, 0.7, 0.15] }}
      aria-hidden="true"
      className="inline-block size-[3px] rounded-full bg-current opacity-30"
      transition={{
        delay,
        duration: 1.5,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
      }}
    />
  );
}

export function ThinkingDots() {
  return (
    <span
      aria-hidden="true"
      className="ml-1 inline-flex -translate-y-px items-center gap-[3px]"
    >
      <Dot delay={0} />
      <Dot delay={0.25} />
      <Dot delay={0.5} />
    </span>
  );
}

interface ReasoningContextValue {
  duration: number | undefined;
  isOpen: boolean;
  isStreaming: boolean;
  setIsOpen: (open: boolean) => void;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

interface ControllableStateOptions<T> {
  defaultProp: T;
  onChange?: (value: T) => void;
  prop?: T;
}

const useControllableState = <T,>({
  prop,
  defaultProp,
  onChange,
}: ControllableStateOptions<T>) => {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultProp);

  const isControlled = prop !== undefined;
  const value = isControlled ? (prop as T) : uncontrolled;

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const nextValue =
        typeof next === "function" ? (next as (previous: T) => T)(value) : next;

      if (!isControlled) {
        setUncontrolled(nextValue);
      }

      if (nextValue !== value) {
        onChange?.(nextValue);
      }
    },
    [isControlled, onChange, value]
  );

  return [value, setValue] as const;
};

export const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;
const MS_IN_MINUTE = 60_000;

function formatThoughtDurationDetail(elapsedMs?: number | null) {
  if (!(typeof elapsedMs === "number" && Number.isFinite(elapsedMs))) {
    return "for a few seconds";
  }

  const seconds = Math.max(1, Math.round(elapsedMs / MS_IN_S));
  if (seconds < 60) {
    return `for ${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  }

  const minutes = Math.max(1, Math.round(elapsedMs / MS_IN_MINUTE));
  return `for ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const resolvedDefaultOpen = defaultOpen ?? isStreaming;
    const isExplicitlyClosed = defaultOpen === false;

    const [isOpen, setIsOpen] = useControllableState<boolean>({
      defaultProp: resolvedDefaultOpen,
      onChange: onOpenChange,
      prop: open,
    });
    const [duration, setDuration] = useControllableState<number | undefined>({
      defaultProp: undefined,
      prop: durationProp,
    });

    const hasEverStreamedRef = useRef(isStreaming);
    const [hasAutoClosed, setHasAutoClosed] = useState(false);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
      if (isStreaming) {
        hasEverStreamedRef.current = true;
        if (startTimeRef.current === null) {
          startTimeRef.current = Date.now();
        }
      } else if (startTimeRef.current !== null) {
        setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
        startTimeRef.current = null;
      }
    }, [isStreaming, setDuration]);

    useEffect(() => {
      if (isStreaming && !isOpen && !isExplicitlyClosed) {
        setIsOpen(true);
      }
    }, [isStreaming, isOpen, setIsOpen, isExplicitlyClosed]);

    useEffect(() => {
      if (
        hasEverStreamedRef.current &&
        !isStreaming &&
        isOpen &&
        !hasAutoClosed
      ) {
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosed(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, setIsOpen, hasAutoClosed]);

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setIsOpen(newOpen);
      },
      [setIsOpen]
    );

    const contextValue = useMemo(
      () => ({ duration, isOpen, isStreaming, setIsOpen }),
      [duration, isOpen, isStreaming, setIsOpen]
    );

    return (
      <ReasoningContext.Provider value={contextValue}>
        <Collapsible
          className={cn("not-prose mb-2", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<"div"> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    getThinkingMessage,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, duration } = useReasoning();
    const detail = getThinkingMessage
      ? getThinkingMessage(isStreaming, duration)
      : isStreaming || duration === 0
        ? "thinking..."
        : duration === undefined
          ? "for a few seconds"
          : formatThoughtDurationDetail(duration * MS_IN_S);
    const label = isStreaming ? "Thinking" : "Thought";

    return (
      <div
        className={cn(
          "flex items-center gap-2 text-foreground/52 text-sm",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <span className="font-semibold">{label}</span>
            <span className="text-[11px] text-foreground/26">{detail}</span>
            {isStreaming ? <ThinkingDots /> : null}
          </>
        )}
      </div>
    );
  }
);

export type ReasoningContentProps = ComponentProps<"div"> & {
  children: string;
  workspaceUuid?: string;
};

export const ReasoningContent = memo(
  ({
    className,
    children,
    workspaceUuid: _workspaceUuid,
    ...props
  }: ReasoningContentProps) => {
    const lines = children
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    const targetY =
      lines.length > VISIBLE_ROWS
        ? -(lines.length - VISIBLE_ROWS) * ROW_HEIGHT
        : 0;
    const springY = useSpring(targetY, {
      damping: 20,
      mass: 0.5,
      stiffness: 160,
    });

    useEffect(() => {
      springY.set(targetY);
    }, [springY, targetY]);

    return (
      <div
        className={cn("relative mt-[3px] overflow-hidden", className)}
        style={{
          height: WINDOW_HEIGHT,
          maskImage:
            "linear-gradient(to bottom, transparent 0, black 22px, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, black 22px, black 100%)",
        }}
        {...props}
      >
        <m.div style={{ y: springY, willChange: "transform" }}>
          {lines.map((line, index) => (
            <div
              className="truncate pl-4 font-mono text-[11px] text-foreground/22 leading-[22px]"
              key={`${line}-${index}`}
              style={{ height: ROW_HEIGHT }}
            >
              {line}
            </div>
          ))}
        </m.div>
      </div>
    );
  }
);

export interface ReasoningActionProps {
  className?: string;
  content: string;
  isStreaming: boolean;
  workspaceUuid?: string;
}

export function ReasoningAction({
  className,
  content,
  isStreaming,
  workspaceUuid,
}: ReasoningActionProps) {
  if (!content) {
    return null;
  }

  return (
    <ReasoningBlock
      className={className}
      content={content}
      isStreaming={isStreaming}
      workspaceUuid={workspaceUuid}
    />
  );
}

function ReasoningPanel({
  content,
  id,
  open,
  workspaceUuid,
}: {
  content: string;
  id: string;
  open: boolean;
  workspaceUuid?: string;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
      id={id}
      role="region"
    >
      <div className="min-h-0 overflow-hidden">
        <ReasoningContent workspaceUuid={workspaceUuid}>
          {content}
        </ReasoningContent>
      </div>
    </div>
  );
}

function ReasoningBlock({
  className,
  content,
  isStreaming,
  workspaceUuid,
}: ReasoningActionProps) {
  const [open, setOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const triggerId = useId();
  const panelId = useId();
  const summary = isStreaming
    ? "Thinking..."
    : content.length > 0
      ? formatThoughtDurationDetail(elapsedMs)
      : "";

  useEffect(() => {
    if (isStreaming) {
      if (startedAtRef.current === null) {
        startedAtRef.current = performance.now();
      }
      setOpen(true);
      return;
    }
    if (startedAtRef.current !== null) {
      setElapsedMs(performance.now() - startedAtRef.current);
      startedAtRef.current = null;
    }
    setOpen(false);
  }, [isStreaming]);

  return (
    <div className={cn("mb-0.5", className)}>
      {isStreaming ? (
        <div
          aria-label={`Thinking: ${summary || "starting"}`}
          aria-live="polite"
          className="flex h-7 items-center gap-2"
          role="status"
        >
          <span className="font-semibold text-foreground/32 text-sm">
            Thinking
          </span>
          {summary ? (
            <span aria-hidden="true" className="text-[11px] text-foreground/26">
              {summary}
            </span>
          ) : null}
          <ThinkingDots />
        </div>
      ) : (
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className={cn(
            "group flex h-7 w-full items-center gap-2 rounded-sm text-left",
            "text-foreground/52 transition-colors duration-200 hover:text-foreground/72",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          )}
          id={triggerId}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="font-semibold text-sm">Thought</span>
          {summary ? (
            <span className="text-[11px] text-foreground/26">{summary}</span>
          ) : null}
          <m.span
            animate={{ rotate: open ? 180 : 0 }}
            aria-hidden="true"
            className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ChevronRight className="size-3 rotate-90" strokeWidth={2} />
          </m.span>
        </button>
      )}

      {content ? (
        <ReasoningPanel
          content={content}
          id={panelId}
          open={isStreaming || open}
          workspaceUuid={workspaceUuid}
        />
      ) : null}
    </div>
  );
}

export function RollingStatusHeader({
  children,
  className,
  done,
  interactive = true,
  onClick,
  open,
  summary,
  title,
}: {
  children?: ReactNode;
  className?: string;
  done: boolean;
  interactive?: boolean;
  onClick?: () => void;
  open?: boolean;
  summary?: ReactNode;
  title: string;
}) {
  if (!done) {
    return (
      <div
        aria-label={`${title}: ${typeof summary === "string" ? summary : "running"}`}
        aria-live="polite"
        className={cn("flex h-7 items-center gap-2", className)}
        role="status"
      >
        <span className="font-semibold text-foreground/32 text-sm">
          {title}
        </span>
        {summary ? (
          <span aria-hidden="true" className="text-[11px] text-foreground/26">
            {summary}
          </span>
        ) : null}
        <ThinkingDots />
        {children}
      </div>
    );
  }

  if (!interactive) {
    return (
      <div
        className={cn(
          "group flex h-7 w-full items-center gap-2 rounded-sm text-left text-foreground/52",
          className
        )}
      >
        <span className="font-semibold text-sm">{title}</span>
        {summary ? (
          <span className="text-[11px] text-foreground/26">{summary}</span>
        ) : null}
        <m.span
          animate={{ rotate: open ? 180 : 0 }}
          aria-hidden="true"
          className="ml-0.5 text-foreground/22"
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <ChevronDown className="size-3" strokeWidth={2} />
        </m.span>
        {children}
      </div>
    );
  }

  return (
    <button
      aria-expanded={open}
      className={cn(
        "group flex h-7 w-full items-center gap-2 rounded-sm text-left",
        "text-foreground/52 transition-colors duration-200 hover:text-foreground/72",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className
      )}
      onClick={onClick}
      type="button"
    >
      <span className="font-semibold text-sm">{title}</span>
      {summary ? (
        <span className="text-[11px] text-foreground/26">{summary}</span>
      ) : null}
      <m.span
        animate={{ rotate: open ? 180 : 0 }}
        aria-hidden="true"
        className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <ChevronDown className="size-3" strokeWidth={2} />
      </m.span>
      {children}
    </button>
  );
}

export function RollingPreviewPanel({
  children,
  className,
  open,
}: {
  children: ReactNode;
  className?: string;
  open: boolean;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "mt-[3px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]",
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function RollingWindow({ items }: { items: ExploreItem[] }) {
  const targetY =
    items.length > VISIBLE_ROWS
      ? -(items.length - VISIBLE_ROWS) * ROW_HEIGHT
      : 0;
  const springY = useSpring(targetY, {
    damping: 20,
    mass: 0.5,
    stiffness: 160,
  });

  useEffect(() => {
    springY.set(targetY);
  }, [springY, targetY]);

  return (
    <>
      <div
        aria-hidden="true"
        className="relative mt-[3px] overflow-hidden"
        style={{
          height: WINDOW_HEIGHT,
          maskImage:
            "linear-gradient(to bottom, transparent 0, black 22px, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, black 22px, black 100%)",
        }}
      >
        <m.div style={{ y: springY }}>
          {items.map((item, index) => (
            <div
              className="flex items-baseline gap-2 pl-4"
              key={`${item.label}-${item.value}-${index}`}
              style={{ height: ROW_HEIGHT }}
            >
              <span className="w-11 shrink-0 font-semibold text-[11px] text-foreground/45">
                {item.label}
              </span>
              <span className="truncate font-mono text-[11px] text-foreground/22">
                {item.value}
              </span>
            </div>
          ))}
        </m.div>
      </div>
      <ul className="sr-only">
        {items.map((item, index) => (
          <li key={`${item.label}-${item.value}`}>
            {item.label}: {item.value}
          </li>
        ))}
      </ul>
    </>
  );
}

function ReadPreviewPanel({
  open,
  preview,
}: {
  open: boolean;
  preview: ReadPreview;
}) {
  const lines = preview.content
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(0, 2);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="mt-0.5 mb-1.5 ml-[48px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]">
          <div className="border-foreground/[0.06] border-b px-2.5 pt-1.5 pb-1">
            <span className="block truncate font-mono text-[10px] text-foreground/28">
              {preview.path}
            </span>
          </div>
          <pre className="overflow-hidden whitespace-pre-wrap break-words px-2.5 py-1.5 font-mono text-[10.5px] text-foreground/32 leading-[1.55]">
            {lines.join("\n")}
          </pre>
        </div>
      </div>
    </div>
  );
}

function SearchPreviewPanel({
  open,
  preview,
}: {
  open: boolean;
  preview: SearchPreview;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="mt-0.5 mb-1.5 ml-[48px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]">
          <div className="border-foreground/[0.06] border-b px-2.5 pt-1.5 pb-1">
            <span className="font-mono text-[10px] text-foreground/28">
              {preview.matches.length} match
              {preview.matches.length === 1 ? "" : "es"}
              {" · "}
              <span className="text-foreground/40">{preview.query}</span>
            </span>
          </div>
          <ul className="space-y-[3px] px-2.5 py-1.5">
            {preview.matches.map((match, index) => (
              <li
                className="truncate font-mono text-[10.5px] text-foreground/30"
                key={`${match}-${index}`}
              >
                {match}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AccordionFileRow({
  index,
  item,
  parentOpen,
}: {
  index: number;
  item: ExploreItem;
  parentOpen: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const rowId = useId();
  const panelId = useId();

  const hasPreview =
    (item.action.kind === "read" && item.action.preview) ||
    (item.action.kind === "search" && item.action.preview);

  useEffect(() => {
    if (!parentOpen) {
      setExpanded(false);
    }
  }, [parentOpen]);

  const rowContent = (
    <div
      className="flex items-baseline gap-2 pl-4"
      style={{ height: ROW_HEIGHT }}
    >
      <span className="w-11 shrink-0 font-semibold text-[11px] text-foreground/32">
        {item.label}
      </span>
      <span className="flex-1 truncate font-mono text-[11px] text-foreground/20">
        {item.value}
      </span>
      {hasPreview ? (
        <m.span
          animate={{ rotate: expanded ? 90 : 0 }}
          aria-hidden="true"
          className="mr-2 shrink-0 text-foreground/18 transition-colors duration-150 group-hover:text-foreground/36"
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronRight className="size-3" strokeWidth={1.5} />
        </m.span>
      ) : null}
    </div>
  );

  return (
    <m.li
      className="fade-in-0 animate-in duration-150"
      key={`${item.label}-${item.value}-${index}`}
      style={{ animationDelay: parentOpen ? `${index * 25}ms` : undefined }}
    >
      {hasPreview ? (
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className={cn(
            "group w-full rounded-sm text-left transition-colors duration-150 hover:bg-foreground/[0.03]",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          )}
          id={rowId}
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {rowContent}
        </button>
      ) : (
        <div>{rowContent}</div>
      )}

      {item.action.kind === "read" && item.action.preview ? (
        <div aria-labelledby={rowId} id={panelId} role="region">
          <ReadPreviewPanel open={expanded} preview={item.action.preview} />
        </div>
      ) : null}
      {item.action.kind === "search" && item.action.preview ? (
        <div aria-labelledby={rowId} id={panelId} role="region">
          <SearchPreviewPanel open={expanded} preview={item.action.preview} />
        </div>
      ) : null}
    </m.li>
  );
}

function AccordionPanel({
  id,
  items,
  open,
}: {
  id: string;
  items: ExploreItem[];
  open: boolean;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
      id={id}
      role="region"
    >
      <div className="min-h-0 overflow-hidden">
        <ul aria-label="Files accessed" className="mt-[3px]">
          {items.map((item, index) => (
            <AccordionFileRow
              index={index}
              item={item}
              key={`${item.label}-${item.value}`}
              parentOpen={open}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ExploreBlock({
  done,
  items,
}: {
  done: boolean;
  items: ExploreItem[];
}) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = useId();
  const summary = buildSummary(items);

  useEffect(() => {
    if (!done) {
      setOpen(false);
    }
  }, [done]);

  return (
    <div className="mb-0.5">
      {done ? (
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className={cn(
            "group flex h-7 w-full items-center gap-2 rounded-sm text-left",
            "text-foreground/52 transition-colors duration-200 hover:text-foreground/72",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          )}
          id={triggerId}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="font-semibold text-sm">Explored</span>
          {summary ? (
            <span className="text-[11px] text-foreground/26">{summary}</span>
          ) : null}
          <m.span
            animate={{ rotate: open ? 180 : 0 }}
            aria-hidden="true"
            className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ChevronRight className="size-3 rotate-90" strokeWidth={2} />
          </m.span>
        </button>
      ) : (
        <div
          aria-label={`Exploring: ${summary || "starting"}`}
          aria-live="polite"
          className="flex h-7 items-center gap-2"
          role="status"
        >
          <span className="font-semibold text-foreground/32 text-sm">
            Exploring
          </span>
          {summary ? (
            <span aria-hidden="true" className="text-[11px] text-foreground/26">
              {summary}
            </span>
          ) : null}
          <ThinkingDots />
        </div>
      )}

      {!done && items.length > 0 ? <RollingWindow items={items} /> : null}
      {done ? <AccordionPanel id={panelId} items={items} open={open} /> : null}
    </div>
  );
}

function splitPreviewLines(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/&nbsp;/g, "").split("\n");
}

function buildNotePreviewLines(preview: NotePreview) {
  const contentLines = splitPreviewLines(preview.content ?? "");
  if (
    preview.operation !== "updated" ||
    preview.previousContent === undefined
  ) {
    return contentLines.map((text) => ({ kind: "added" as const, text }));
  }

  const previousLines = splitPreviewLines(preview.previousContent);
  const lines: Array<{
    kind: "added" | "removed" | "unchanged";
    text: string;
  }> = [];
  const max = Math.max(contentLines.length, previousLines.length);
  for (let index = 0; index < max; index += 1) {
    const next = contentLines[index];
    const previous = previousLines[index];
    if (next === previous) {
      lines.push({ kind: "unchanged", text: next ?? "" });
      continue;
    }
    if (previous !== undefined) {
      lines.push({ kind: "removed", text: previous });
    }
    if (next !== undefined) {
      lines.push({ kind: "added", text: next });
    }
  }
  return lines;
}

function countChangedLines(preview: NotePreview) {
  const previousLines = splitPreviewLines(preview.previousContent ?? "");
  return splitPreviewLines(preview.content ?? "").filter(
    (line, index) => line !== previousLines[index]
  ).length;
}

function NoteMutationPreview({ preview }: { preview?: NotePreview }) {
  if (!(preview?.content && preview.content.trim().length > 0)) {
    return null;
  }

  const lines = buildNotePreviewLines(preview);
  const addedCount = countChangedLines(preview);

  return (
    <div className="overflow-hidden border-border border-t bg-muted/20">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-card via-card/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-card via-card/85 to-transparent" />
        <div className="max-h-80 overflow-auto py-1 font-mono text-[12px] leading-5">
          {lines.map((line, index) => (
            <div
              className={cn(
                "flex gap-2 px-3",
                line.kind === "added" && "bg-emerald-500/10 text-foreground",
                line.kind === "removed" &&
                  "bg-destructive/10 text-muted-foreground line-through",
                line.kind === "unchanged" && "text-muted-foreground"
              )}
              key={`${index}-${line.text}`}
            >
              <span className="w-3 shrink-0 select-none text-emerald-600 dark:text-emerald-400">
                {line.kind === "added"
                  ? "+"
                  : line.kind === "removed"
                    ? "-"
                    : ""}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                {line.text || " "}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteMutationHeader({
  action,
  addedCount,
  route,
  workspaceUuid,
}: {
  action: Extract<ActivityAction, { kind: "notes" }>;
  addedCount: number;
  route: string | null;
  workspaceUuid?: string;
}) {
  const navigation = useWorkspacePaneNavigation();
  const canOpen = Boolean(route && !action.pending);

  const openRoute = (options?: {
    openInNewPane?: boolean;
    openInNewTab?: boolean;
  }) => {
    if (!route) {
      return;
    }
    navigation.navigate(route, options);
  };

  const title = action.preview?.title || action.value || "Workspace note";
  const FileIcon = getTreeFileIconComponent(title);

  const header = (
    <button
      className={cn(
        "flex h-9 w-full items-center gap-2 px-3 text-left transition-colors",
        canOpen
          ? "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          : "cursor-default"
      )}
      disabled={!canOpen}
      onClick={() => openRoute()}
      type="button"
    >
      {action.pending ? (
        <ChatSpinnerGlyph className="size-4 shrink-0 place-content-center" />
      ) : (
        <FileIcon className="size-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground">
        {title}
      </span>
      {action.pending ? (
        <span className="shrink-0 font-mono text-[11px] text-foreground/42">
          writing
          <ThinkingDots />
        </span>
      ) : null}
      {addedCount > 0 ? (
        <span className="shrink-0 font-mono text-[12px] text-emerald-600 dark:text-emerald-400">
          +{addedCount}
        </span>
      ) : null}
      {canOpen ? (
        <ArrowSquareOut className="size-3.5 shrink-0 text-muted-foreground/55" />
      ) : null}
    </button>
  );

  if (!(route && workspaceUuid)) {
    return header;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div className="contents" />}>
        {header}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44 rounded-lg p-1">
        <ContextMenuItem onClick={() => openRoute()}>
          <ArrowSquareOut className="mr-2 size-3.5" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => openRoute({ openInNewPane: true })}>
          <ArrowSquareOut className="mr-2 size-3.5" />
          Open in new pane
        </ContextMenuItem>
        <ContextMenuItem onClick={() => openRoute({ openInNewTab: true })}>
          <ArrowSquareOut className="mr-2 size-3.5" />
          Open in new tab
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function NoteMutationBlock({
  action,
  workspaceUuid,
}: {
  action: Extract<ActivityAction, { kind: "notes" }>;
  workspaceUuid?: string;
}) {
  const summary = action.preview
    ? `${action.preview.noteCount} note${action.preview.noteCount === 1 ? "" : "s"} ${action.preview.operation}`
    : null;
  const [route, setRoute] = useState<string | null>(null);
  const fileId = action.preview?.fileId;
  const addedCount = action.preview ? countChangedLines(action.preview) : 0;

  useEffect(() => {
    if (!(workspaceUuid && fileId)) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    void resolveWorkspaceFileRoute(workspaceUuid, fileId)
      .then((resolvedRoute) => {
        if (!cancelled) {
          setRoute(resolvedRoute);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoute(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, workspaceUuid]);

  return (
    <li
      className={cn(
        "mb-1 overflow-hidden rounded-md border border-border/80 bg-card shadow-sm",
        MUTATION_ROW_ENTER_CLASS
      )}

    >
      <NoteMutationHeader
        action={action}
        addedCount={addedCount}
        route={route}
        workspaceUuid={workspaceUuid}
      />
      {summary ? (
        <span className="sr-only">
          {action.preview?.operation === "updated" ? "+" : ""}
          {summary}
        </span>
      ) : null}
      <NoteMutationPreview preview={action.preview} />
    </li>
  );
}

function MutationBlock({
  action,
  workspaceUuid,
}: {
  action: MutationAction;
  workspaceUuid?: string;
}) {
  if (action.kind === "error") {
    return (
      <li
        className={cn(
          "mb-1 flex items-baseline gap-2 text-sm",
          MUTATION_ROW_ENTER_CLASS
        )}

      >
        <span className="font-semibold text-destructive">Error</span>
        <span className="font-mono text-[12px] text-destructive/80">
          {action.error ?? "Unknown error"}
        </span>
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            running
            <ThinkingDots />
          </span>
        ) : null}
      </li>
    );
  }

  if (action.kind === "flashcards") {
    return (
      <li
        className={cn(
          "mb-1 flex items-baseline gap-2 text-sm",
          MUTATION_ROW_ENTER_CLASS
        )}

      >
        <span className="font-semibold text-foreground/72">Mindset</span>
        <span className="font-mono text-[12px] text-foreground/62">
          {action.preview?.title || action.value || "flashcards"}
        </span>
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            creating
            <ThinkingDots />
          </span>
        ) : null}
      </li>
    );
  }

  if (action.kind === "notes") {
    return (
      <NoteMutationBlock action={action} workspaceUuid={workspaceUuid} />
    );
  }

  if (action.kind === "quiz") {
    return (
      <li
        className={cn(
          "mb-1 flex items-baseline gap-2 text-sm",
          MUTATION_ROW_ENTER_CLASS
        )}

      >
        <span className="font-semibold text-foreground/72">Quiz</span>
        <span className="font-mono text-[12px] text-foreground/62">
          {action.value || "generating..."}
        </span>
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            creating
            <ThinkingDots />
          </span>
        ) : null}
      </li>
    );
  }

  if (action.kind === "misconception") {
    const confidence =
      typeof action.preview?.confidence === "number"
        ? `${Math.round(action.preview.confidence * 100)}%`
        : null;

    return (
      <li
        className={cn(
          "mb-1 flex items-baseline gap-2 text-sm",
          MUTATION_ROW_ENTER_CLASS
        )}

      >
        <span className="font-semibold text-foreground/72">Misconception</span>
        <span className="min-w-0 truncate font-mono text-[12px] text-foreground/62">
          {action.preview?.concept || action.value || "learning memory"}
        </span>
        {confidence ? (
          <span className="font-mono text-[11px] text-foreground/35">
            {confidence}
          </span>
        ) : null}
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            checking
            <ThinkingDots />
          </span>
        ) : null}
      </li>
    );
  }

  const path =
    action.kind === "move" ? (action.to ?? action.from) : action.path;
  const pathParts = path.split("/");
  const filename = pathParts.pop() ?? path;
  const directory = pathParts.length > 0 ? `${pathParts.join("/")}/` : "";
  const label =
    action.kind === "create"
      ? "Create"
      : action.kind === "delete"
        ? "Delete"
        : action.kind === "move"
          ? "Move"
          : "Edit";

  return (
    <li
      className={cn(
        "mb-1 flex items-baseline gap-2 text-sm",
        MUTATION_ROW_ENTER_CLASS
      )}

    >
      <span className="font-semibold text-foreground/72">{label}</span>
      <span className="font-mono text-[12px] text-foreground/62">
        {filename}
      </span>
      <span className="font-mono text-[11px] text-foreground/20">
        {directory}
      </span>
      {action.kind === "move" ? (
        <span className="font-mono text-[11px] text-foreground/32">
          {action.from}
          {action.to ? ` -> ${action.to}` : ""}
        </span>
      ) : null}
      {action.pending ? (
        <span className="font-mono text-[11px] text-foreground/28">
          running
          <ThinkingDots />
        </span>
      ) : null}
    </li>
  );
}

export function isRollingToolPart(part: ToolPart) {
  if (INLINE_MUTATION_TOOL_TYPES.has(part.type)) {
    return false;
  }
  return toAction(part) !== null;
}

export function InlineToolMutationActivity({
  part,
  workspaceUuid,
}: {
  part: ToolPart;
  workspaceUuid?: string;
}) {
  const action = toAction(part);

  if (!action || isExploreAction(action)) {
    return null;
  }

  return (
    <ul aria-label="Tool activity" className="mb-2 font-mono">
      <MutationBlock action={action} workspaceUuid={workspaceUuid} />
    </ul>
  );
}

export function RollingAgentActivity({
  actions,
  isStreaming,
}: {
  actions: ActivityAction[];
  isStreaming: boolean;
}) {
  const groups = useMemo(() => groupActions(actions), [actions]);

  if (groups.length === 0) {
    return null;
  }

  const isGroupDone = (groupIndex: number) => {
    const group = groups[groupIndex];
    if (!group || group.type !== "explore") {
      return true;
    }

    if (!group.items.some((item) => item.action.pending)) {
      return true;
    }

    const isLastGroup = groupIndex === groups.length - 1;
    return !(isLastGroup && isStreaming);
  };

  return (
    <ul aria-label="Agent activity" className="mb-0.5 font-mono">
      {groups.map((group, index) => {
        if (group.type === "explore") {
          return (
            <ExploreBlock
              done={isGroupDone(index)}
              items={group.items}
              key={`agent-${group.groupUid}`}
            />
          );
        }

        return (
          <MutationBlock
            action={group.action}
            key={`agent-${group.groupUid}`}
          />
      })}
    </ul>
  );
}

export function RollingToolActivity({
  isStreaming,
  parts,
  workspaceUuid,
}: {
  isStreaming: boolean;
  parts: ToolPart[];
  workspaceUuid?: string;
}) {
  const actions = useMemo(
    () => parts.map((part) => toAction(part)).filter((part) => part !== null),
    [parts]
  );
  const groups = useMemo(() => groupActions(actions), [actions]);

  if (groups.length === 0) {
    return null;
  }

  const isGroupDone = (groupIndex: number) => {
    const group = groups[groupIndex];
    if (!group || group.type !== "explore") {
      return true;
    }

    if (!group.items.some((item) => item.action.pending)) {
      return true;
    }

    const isLastGroup = groupIndex === groups.length - 1;
    return !(isLastGroup && isStreaming);
  };

  return (
    <ul aria-label="Agent activity" className="mb-0.5 font-mono">
      {groups.map((group, index) => {
        if (group.type === "explore") {
          return (
            <ExploreBlock
              done={isGroupDone(index)}
              items={group.items}
              key={`explore-${index}`}
            />
          );
        }

        return (
          <MutationBlock
            action={group.action}
            key={`mutation-${index}`}
            workspaceUuid={workspaceUuid}
          />
        );
      })}
    </ul>
  );
}
