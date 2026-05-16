"use client";

import { CaretRight as ChevronRight } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  buildRollingToolSummary,
  groupRollingToolActions,
  toRollingToolAction,
} from "@/components/chat/rolling-tool-activity-model";
import type {
  ActionGroup,
  ActivityAction,
  ExploreItem,
  MutationAction,
  ReadPreview,
  SearchPreview,
  ToolPart,
} from "@/components/chat/rolling-tool-activity-types";
import { Shimmer } from "@/components/chat/shimmer";
import { cn } from "@/lib/utils";
import { ThinkingDots } from "./rolling-reasoning";

const ROW_HEIGHT = 22;
const VISIBLE_ROWS = 3;
const WINDOW_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

function buildOccurrenceKeys<T>(
  items: readonly T[],
  toBaseKey: (item: T) => string
) {
  const seenKeys = new Map<string, number>();
  return items.map((item) => {
    const baseKey = toBaseKey(item);
    const occurrence = seenKeys.get(baseKey) ?? 0;
    seenKeys.set(baseKey, occurrence + 1);
    return occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`;
  });
}

function RollingWindow({ items }: { items: ExploreItem[] }) {
  const targetY =
    items.length > VISIBLE_ROWS
      ? -(items.length - VISIBLE_ROWS) * ROW_HEIGHT
      : 0;

  const itemKeys = useMemo(
    () =>
      buildOccurrenceKeys(items, (item) => `${item.label}\u0000${item.value}`),
    [items]
  );

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
        <div
          style={{
            transform: `translateY(${targetY}px)`,
            transition: "transform 220ms ease-out",
          }}
        >
          {items.map((item, index) => (
            <div
              className="flex items-baseline gap-2 pl-4"
              key={itemKeys[index]}
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
        </div>
      </div>
      <ul className="sr-only">
        {items.map((item, index) => (
          <li key={itemKeys[index]}>
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
      style={{
        maxHeight: open ? "12rem" : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 240ms ease, opacity 240ms ease",
      }}
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
  const matchKeys = useMemo(
    () => buildOccurrenceKeys(preview.matches, (match) => match),
    [preview.matches]
  );

  return (
    <div
      aria-hidden={!open}
      style={{
        maxHeight: open ? "12rem" : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 240ms ease, opacity 240ms ease",
      }}
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
              key={matchKeys[index]}
            >
              {match}
            </li>
          ))}
        </ul>
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
      <span className="w-14 shrink-0 font-semibold text-[11px] text-foreground/32">
        {item.label}
      </span>
      <span className="flex-1 truncate font-mono text-[11px] text-foreground/20">
        {item.value}
      </span>
      {hasPreview ? (
        <span
          aria-hidden="true"
          className="mr-2 shrink-0 text-foreground/18 transition-colors duration-150 group-hover:text-foreground/36"
          style={{
            display: "inline-flex",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 200ms ease-in-out",
          }}
        >
          <ChevronRight className="size-3" strokeWidth={1.5} />
        </span>
      ) : null}
    </div>
  );

  return (
    <li
      style={{
        opacity: parentOpen ? 1 : 0,
        transition: `opacity 160ms ease ${parentOpen ? index * 25 : 0}ms`,
      }}
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
    </li>
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
  const itemKeys = useMemo(
    () =>
      buildOccurrenceKeys(items, (item) => `${item.label}\u0000${item.value}`),
    [items]
  );

  return (
    <div
      id={id}
      role="region"
      style={{
        maxHeight: open ? "24rem" : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 360ms ease, opacity 360ms ease",
      }}
    >
      <ul aria-label="Files accessed" className="mt-[3px]">
        {items.map((item, index) => (
          <AccordionFileRow
            index={index}
            item={item}
            key={itemKeys[index]}
            parentOpen={open}
          />
        ))}
      </ul>
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
  const panelId = useId();
  const summary = buildRollingToolSummary(items);

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
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="font-semibold text-sm">Explored</span>
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
      ) : (
        <div
          aria-label={`Exploring: ${summary || "starting"}`}
          aria-live="polite"
          className="flex h-7 items-center gap-2"
          role="status"
        >
          <Shimmer as="span" className="font-semibold text-foreground text-sm">
            Exploring
          </Shimmer>
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
      <div
        className="mb-1 flex items-baseline gap-2 text-sm"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
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
      </div>
    );
  }

  if (action.kind === "flashcards") {
    return (
      <div
        className="mb-1 flex items-baseline gap-2 text-sm"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <span className="font-semibold text-foreground/72">Mindset Set</span>
        <span className="font-mono text-[12px] text-foreground/62">
          {action.preview?.title || action.value || "mindset set"}
        </span>
        {action.pending ? (
          <span className="font-mono text-[11px] text-foreground/28">
            creating
            <ThinkingDots />
          </span>
        ) : null}
      </div>
    );
  }

  if (action.kind === "notes") {
    const summary = action.preview
      ? `${action.preview.noteCount} note${action.preview.noteCount === 1 ? "" : "s"} ${action.preview.operation}`
      : null;

    return (
      <div
        className="mb-1 overflow-hidden rounded-xl border border-foreground/[0.08] bg-foreground/[0.03]"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
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
            <div className="shrink-0 border-foreground/[0.08] border-l pl-3">
              <span className="font-mono text-[11px] text-foreground/42">
                writing
                <ThinkingDots />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (action.kind === "quiz") {
    return (
      <div
        className="mb-1 flex items-baseline gap-2 text-sm"
        role="listitem"
        style={{
          opacity: 1,
          transform: "translateY(0)",
        }}
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
      </div>
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
    <div
      className="mb-1 flex items-baseline gap-2 text-sm"
      role="listitem"
      style={{
        opacity: 1,
        transform: "translateY(0)",
      }}
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
    </div>
  );
}

function isGroupDone(
  groups: ActionGroup[],
  groupIndex: number,
  isStreaming: boolean
) {
  const group = groups[groupIndex];
  if (!group || group.type !== "explore") {
    return true;
  }

  if (!group.items.some((item) => item.action.pending)) {
    return true;
  }

  const isLastGroup = groupIndex === groups.length - 1;
  return !(isLastGroup && isStreaming);
}

function RollingToolActivityBody({
  groups,
  isStreaming,
  keyPrefix,
}: {
  groups: ActionGroup[];
  isStreaming: boolean;
  keyPrefix: string;
}) {
  if (groups.length === 0) {
    return null;
  }

  const groupKeys = buildOccurrenceKeys(groups, (group) => {
    if (group.type === "explore") {
      const signature = group.items
        .map((item) => `${item.label}\u0000${item.value}`)
        .join("\u0001");
      return `${keyPrefix}-explore-${signature}`;
    }

    return `${keyPrefix}-mutation-${JSON.stringify(group.action)}`;
  });

  return (
    <div aria-label="Agent activity" className="mb-0.5 font-mono" role="list">
      {groups.map((group, index) => {
        if (group.type === "explore") {
          return (
            <ExploreBlock
              done={isGroupDone(groups, index, isStreaming)}
              items={group.items}
              key={groupKeys[index]}
            />
          );
        }

        return <MutationBlock action={group.action} key={groupKeys[index]} />;
      })}
    </div>
  );
}

export function RollingAgentActivity({
  actions,
  isStreaming,
}: {
  actions: ActivityAction[];
  isStreaming: boolean;
}) {
  const groups = useMemo(() => groupRollingToolActions(actions), [actions]);

  return (
    <RollingToolActivityBody
      groups={groups}
      isStreaming={isStreaming}
      keyPrefix="agent"
    />
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
    () =>
      parts
        .map((part) => toRollingToolAction(part))
        .filter((part) => part !== null),
    [parts]
  );
  const groups = useMemo(() => groupRollingToolActions(actions), [actions]);

  return (
    <RollingToolActivityBody
      groups={groups}
      isStreaming={isStreaming}
      keyPrefix="tool"
    />
  );
}
