"use client";

import { Collapsible } from "@avenire/ui/components/collapsible";
import { cn } from "@avenire/ui/lib/utils";
import { CaretRight as ChevronRight } from "@phosphor-icons/react";
import { CaretDown as ChevronDown } from "@phosphor-icons/react/CaretDown";
import type { ComponentProps, ReactNode } from "react";
import {
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
import { Shimmer } from "./shimmer";

const ROW_HEIGHT = 22;
const VISIBLE_ROWS = 3;
const WINDOW_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

function buildOccurrenceKey(baseKey: string, seenKeys: Map<string, number>) {
  const occurrence = seenKeys.get(baseKey) ?? 0;
  seenKeys.set(baseKey, occurrence + 1);
  return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[3px] rounded-full bg-current [animation:avenire-dot-pulse_1.5s_ease-in-out_infinite]"
      style={{ animationDelay: `${delay}s` }}
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
          "flex items-center gap-2 text-foreground/60 text-sm",
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
    const seenLineKeys = new Map<string, number>();

    return (
      <div
        className={cn("relative mt-[3px] overflow-hidden", className)}
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
        <div
          className="relative z-10 font-mono text-[11px] text-foreground/40"
          style={{
            willChange: "transform",
            transform: `translateY(${
              lines.length > VISIBLE_ROWS
                ? -(lines.length - VISIBLE_ROWS) * ROW_HEIGHT
                : 0
            }px)`,
            transition: "transform 220ms ease-out",
          }}
        >
          {lines.map((line) => (
            <div
              className="flex items-start gap-2 pl-4"
              key={buildOccurrenceKey(line, seenLineKeys)}
              style={{ minHeight: ROW_HEIGHT }}
            >
              <span className="whitespace-pre-wrap break-words leading-5">
                {line}
              </span>
            </div>
          ))}
        </div>
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
  open,
  workspaceUuid,
}: {
  content: string;
  open: boolean;
  workspaceUuid?: string;
}) {
  return (
    <div
      role="region"
      style={{
        maxHeight: open ? "12rem" : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 360ms ease, opacity 360ms ease",
      }}
    >
      <ReasoningContent workspaceUuid={workspaceUuid}>
        {content}
      </ReasoningContent>
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
          <Shimmer as="span" className="font-semibold text-foreground text-sm">
            Reasoning
          </Shimmer>
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
          <span
            aria-hidden="true"
            className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
            style={{
              display: "inline-flex",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 250ms ease-in-out",
            }}
          >
            <ChevronRight className="size-3 rotate-90" strokeWidth={2} />
          </span>
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
        <Shimmer as="span" className="font-semibold text-foreground text-sm">
          {title}
        </Shimmer>
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
        <span
          aria-hidden="true"
          className="ml-0.5 text-foreground/22"
          style={{
            display: "inline-flex",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 250ms ease-in-out",
          }}
        >
          <ChevronDown className="size-3" strokeWidth={2} />
        </span>
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
      <span
        aria-hidden="true"
        className="ml-0.5 text-foreground/22 transition-colors duration-200 group-hover:text-foreground/42"
        style={{
          display: "inline-flex",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 250ms ease-in-out",
        }}
      >
        <ChevronDown className="size-3" strokeWidth={2} />
      </span>
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
      style={{
        maxHeight: open ? "18rem" : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 360ms ease, opacity 360ms ease",
      }}
    >
      <div
        className={cn(
          "mt-[3px] overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.025]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
