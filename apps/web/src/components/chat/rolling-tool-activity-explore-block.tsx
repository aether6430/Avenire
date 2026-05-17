"use client";

import { CaretRight as ChevronRight } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useState } from "react";
import { buildRollingToolSummary } from "@/components/chat/rolling-tool-activity-model";
import type {
  ExploreItem,
  ReadPreview,
  SearchPreview,
} from "@/components/chat/rolling-tool-activity-types";
import { Shimmer } from "@/components/chat/shimmer";
import { cn } from "@/lib/utils";
import { ThinkingDots } from "./rolling-reasoning";
import {
  buildOccurrenceKeys,
  ROW_HEIGHT,
  VISIBLE_ROWS,
  WINDOW_HEIGHT,
} from "./rolling-tool-activity-shared";

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

export function ExploreBlock({
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
