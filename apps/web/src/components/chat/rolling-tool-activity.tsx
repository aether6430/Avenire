"use client";

import type { UIMessage } from "@avenire/ai/message-types";
import { Collapsible } from "@avenire/ui/components/collapsible";
import {
  CaretRight as ChevronRight,
  CaretDown as ChevronDown,
} from "@phosphor-icons/react";
import { motion, useSpring } from "framer-motion";
import {
  type ComponentProps,
  type ReactNode,
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

type ReadPreview = {
  content: string;
  path: string;
};

type SearchPreview = {
  matches: string[];
  query: string;
};

type NotePreview = {
  noteCount: number;
  operation: "created" | "listed" | "read" | "updated";
  title?: string;
};

type FlashcardPreview = {
  cardCount: number;
  setId: string;
  title: string;
};

type QuizPreview = {
  questionCount: number;
  setId: string;
  title: string;
};

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

type ExploreAction = Extract<
  ActivityAction,
  { kind: "list" | "read" | "search" }
>;
type MutationAction = Exclude<ActivityAction, ExploreAction>;

type ExploreItem = {
  action: ExploreAction;
  label: string;
  value: string;
};

type ActionGroup =
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
const ROW_HEIGHT = 22;
const VISIBLE_ROWS = 3;
const WINDOW_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

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

function toReadPreview(part: ToolPart): ReadPreview | undefined {
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
  return undefined;
}

function toSearchPreview(part: ToolPart): SearchPreview | undefined {
  if (
    (part.type !== "tool-search_materials" && part.type !== "tool-web_search") ||
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
  if (part.type === "tool-search_materials" || part.type === "tool-web_search") {
    return part.input?.query ?? "search";
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

  if (part.type === "tool-search_materials" || part.type === "tool-web_search") {
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
        groups.push({ items: [item], type: "explore" });
      }
      continue;
    }

    groups.push({ action, type: "mutation" });
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
    <motion.span
      animate={{ opacity: [0.15, 0.7, 0.15] }}
      aria-hidden="true"
      className="inline-block size-[3px] rounded-full bg-current"
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
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

type ControllableStateOptions<T> = {
  prop?: T;
  defaultProp: T;
  onChange?: (value: T) => void;
};

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
          className={cn("not-prose mb-4", className)}
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
          : `took ${duration} seconds`;

    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-foreground/60",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <span className="font-semibold text-foreground/72">Reasoning</span>
            <span className="text-[12px] text-foreground/35">{detail}</span>
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
  ({ className, children, ...props }: ReasoningContentProps) => {
    const lines = children
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    return (
      <div
        className={cn(
          "relative mt-[3px] overflow-hidden",
          className
        )}
        style={{ height: WINDOW_HEIGHT }}
        {...props}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)) 15%, transparent 100%)",
            height: ROW_HEIGHT * 1.4,
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--background)) 15%, transparent 100%)",
            height: ROW_HEIGHT * 1.4,
          }}
        />
        <motion.div
          className="relative z-10 font-mono text-[11px] text-foreground/40"
          animate={{
            y:
              lines.length > VISIBLE_ROWS
                ? -(lines.length - VISIBLE_ROWS) * ROW_HEIGHT
                : 0,
          }}
          initial={false}
          transition={{
            damping: 20,
            mass: 0.5,
            stiffness: 160,
          }}
          style={{ willChange: "transform" }}
        >
          {lines.map((line, index) => (
            <div
              className="flex items-start gap-2 pl-4"
              key={`${index}-${line}`}
              style={{ minHeight: ROW_HEIGHT }}
            >
              <span className="whitespace-pre-wrap break-words leading-5">
                {line}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    );
  }
);

export type ReasoningActionProps = {
  content: string;
  isStreaming: boolean;
  workspaceUuid?: string;
  className?: string;
};

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
  open,
  workspaceUuid,
}: {
  content: string;
  open: boolean;
  workspaceUuid?: string;
}) {
  return (
    <motion.div
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      initial={false}
      role="region"
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
    >
      <ReasoningContent workspaceUuid={workspaceUuid}>
        {content}
      </ReasoningContent>
    </motion.div>
  );
}

function ReasoningBlock({
  className,
  content,
  isStreaming,
  workspaceUuid,
}: ReasoningActionProps) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const panelId = useId();
  const summary = isStreaming
    ? "thinking..."
    : content.length > 0
      ? "ready"
      : "";

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
      return;
    }
    setOpen(false);
  }, [isStreaming]);

  return (
    <div className={cn("mb-0.5", className)}>
      {isStreaming ? (
        <div
          aria-label={`Reasoning: ${summary || "starting"}`}
          aria-live="polite"
          className="flex h-7 items-center gap-2"
          role="status"
        >
          <span className="font-semibold text-foreground/32 text-sm">
            Reasoning
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
          <span className="font-semibold text-sm">Reasoning</span>
          {summary ? (
            <span className="text-[11px] text-foreground/26">{summary}</span>
          ) : null}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            aria-hidden="true"
            className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ChevronRight className="size-3 rotate-90" strokeWidth={2} />
          </motion.span>
        </button>
      )}

      {content ? (
        <ReasoningPanel
          content={content}
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
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          aria-hidden="true"
          className="ml-0.5 text-foreground/22"
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <ChevronDown className="size-3" strokeWidth={2} />
        </motion.span>
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
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        aria-hidden="true"
        className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <ChevronDown className="size-3" strokeWidth={2} />
      </motion.span>
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
    <motion.div
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      initial={false}
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        className={cn(
          "mt-[3px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]",
          className
        )}
      >
        {children}
      </div>
    </motion.div>
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
        className="relative mt-[3px]"
        style={{ height: WINDOW_HEIGHT, overflow: "hidden" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background)) 15%, transparent 100%)",
            height: ROW_HEIGHT * 1.4,
          }}
        />
        <motion.div style={{ y: springY }}>
          {items.map((item, index) => (
            <div
              className="flex items-baseline gap-2 pl-4"
              key={`${item.label}-${item.value}-${index}`}
              style={{ height: ROW_HEIGHT }}
            >
              <span className="w-14 shrink-0 font-semibold text-[11px] text-foreground/45">
                {item.label}
              </span>
              <span className="truncate font-mono text-[11px] text-foreground/22">
                {item.value}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
      <ul className="sr-only">
        {items.map((item, index) => (
          <li key={`${item.label}-${item.value}-${index}`}>
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
    <motion.div
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      initial={false}
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="mt-0.5 mb-1.5 ml-[60px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]">
        <div className="border-foreground/[0.06] border-b px-2.5 pt-1.5 pb-1">
          <span className="block truncate font-mono text-[10px] text-foreground/28">
            {preview.path}
          </span>
        </div>
        <pre className="overflow-hidden px-2.5 py-1.5 font-mono text-[10.5px] text-foreground/32 leading-[1.55]">
          {lines.join("\n")}
        </pre>
      </div>
    </motion.div>
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
    <motion.div
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      initial={false}
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="mt-0.5 mb-1.5 ml-[60px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]">
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
    </motion.div>
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
      <span className="w-14 shrink-0 font-semibold text-[11px] text-foreground/32">
        {item.label}
      </span>
      <span className="flex-1 truncate font-mono text-[11px] text-foreground/20">
        {item.value}
      </span>
      {hasPreview ? (
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          aria-hidden="true"
          className="mr-2 shrink-0 text-foreground/18 transition-colors duration-150 group-hover:text-foreground/36"
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronRight className="size-3" strokeWidth={1.5} />
        </motion.span>
      ) : null}
    </div>
  );

  return (
    <motion.li
      animate={{ opacity: parentOpen ? 1 : 0 }}
      initial={{ opacity: 0 }}
      key={`${item.label}-${item.value}-${index}`}
      transition={{ delay: parentOpen ? index * 0.025 : 0, duration: 0.16 }}
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
    </motion.li>
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
    <motion.div
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      id={id}
      initial={false}
      role="region"
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
    >
      <ul aria-label="Files accessed" className="mt-[3px]">
        {items.map((item, index) => (
          <AccordionFileRow
            index={index}
            item={item}
            key={`${item.label}-${item.value}-${index}`}
            parentOpen={open}
          />
        ))}
      </ul>
    </motion.div>
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
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            aria-hidden="true"
            className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ChevronRight className="size-3 rotate-90" strokeWidth={2} />
          </motion.span>
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

function MutationBlock({ action }: { action: MutationAction }) {
  if (action.kind === "error") {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 flex items-baseline gap-2 text-sm"
        initial={{ opacity: 0, y: 5 }}
        role="listitem"
        transition={{ duration: 0.28, ease: "easeOut" }}
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
      </motion.div>
    );
  }

  if (action.kind === "flashcards") {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 flex items-baseline gap-2 text-sm"
        initial={{ opacity: 0, y: 5 }}
        role="listitem"
        transition={{ duration: 0.28, ease: "easeOut" }}
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
      </motion.div>
    );
  }

  if (action.kind === "notes") {
    const summary = action.preview
      ? `${action.preview.noteCount} note${action.preview.noteCount === 1 ? "" : "s"} ${action.preview.operation}`
      : null;
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 overflow-hidden rounded-xl border border-foreground/[0.08] bg-foreground/[0.03]"
        initial={{ opacity: 0, y: 5 }}
        role="listitem"
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[15px] text-foreground/72">
              {action.pending ? "Generating notes" : "Notes updated"}
            </p>
            <p className="truncate font-semibold text-base text-foreground">
              {action.preview?.title || action.value || "Workspace notes"}
            </p>
            {summary ? (
              <p className="mt-0.5 font-mono text-[11px] text-foreground/35">
                {summary}
              </p>
            ) : null}
          </div>
          {action.pending ? (
            <div className="shrink-0 border-l border-foreground/[0.08] pl-3">
              <span className="font-mono text-[11px] text-foreground/42">
                writing
                <ThinkingDots />
              </span>
            </div>
          ) : null}
        </div>
      </motion.div>
    );
  }

  if (action.kind === "quiz") {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 flex items-baseline gap-2 text-sm"
        initial={{ opacity: 0, y: 5 }}
        role="listitem"
        transition={{ duration: 0.28, ease: "easeOut" }}
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
      </motion.div>
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
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-1 flex items-baseline gap-2 text-sm"
      initial={{ opacity: 0, y: 5 }}
      role="listitem"
      transition={{ duration: 0.28, ease: "easeOut" }}
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
    </motion.div>
  );
}

export function isRollingToolPart(part: ToolPart) {
  return toAction(part) !== null;
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

    const isLastGroup = groupIndex === groups.length - 1;
    return !(isLastGroup && isStreaming);
  };

  return (
    <div aria-label="Agent activity" className="mb-0.5 font-mono" role="list">
      {groups.map((group, index) => {
        if (group.type === "explore") {
          return (
            <ExploreBlock
              done={isGroupDone(index)}
              items={group.items}
              key={`agent-explore-${index}`}
            />
          );
        }

        return (
          <MutationBlock
            action={group.action}
            key={`agent-mutation-${index}`}
          />
        );
      })}
    </div>
  );
}

export function RollingToolActivity({
  isStreaming,
  parts,
}: {
  isStreaming: boolean;
  parts: ToolPart[];
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

    const isLastGroup = groupIndex === groups.length - 1;
    return !(isLastGroup && isStreaming);
  };

  return (
    <div aria-label="Agent activity" className="mb-0.5 font-mono" role="list">
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
          <MutationBlock action={group.action} key={`mutation-${index}`} />
        );
      })}
    </div>
  );
}
