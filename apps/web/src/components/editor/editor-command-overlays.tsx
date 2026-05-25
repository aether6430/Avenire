"use client";

import { cn } from "@avenire/ui/lib/utils";
import { useEffect, useRef } from "react";
import type { SlashCommand, WikiPage } from "@/components/editor/editor-core";

export function SlashMenu({
  query,
  commands,
  activeIndex,
  onPick,
}: {
  query: string;
  commands: SlashCommand[];
  activeIndex: number;
  onPick: (index: number) => void;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      className="w-80 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-black/8 shadow-lg"
      data-motion-managed="true"
      data-slot="editor-command-menu"
    >
      <div className="border-border border-b px-3 py-2 text-[11px] text-muted-foreground">
        Slash commands {query ? `for “${query}”` : ""}
      </div>
      <div className="max-h-80 overflow-y-auto py-1">
        {commands.length === 0 ? (
          <p className="px-3 py-2 text-muted-foreground text-xs">
            No matching command
          </p>
        ) : (
          commands.map((command, index) => {
            const Icon = command.icon;
            const active = index === activeIndex;

            return (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent"
                )}
                data-active={active}
                key={command.id}
                onClick={() => onPick(index)}
                onMouseDown={(event) => event.preventDefault()}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-xs">
                    {command.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {command.description}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function WikiMenu({
  query,
  pages,
  activeIndex,
  onPick,
}: {
  query: string;
  pages: WikiPage[];
  activeIndex: number;
  onPick: (index: number) => void;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      className="w-80 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-black/8 shadow-lg"
      data-motion-managed="true"
      data-slot="editor-command-menu"
    >
      <div className="border-border border-b px-3 py-2 text-[11px] text-muted-foreground">
        Wiki links {query ? `for “${query}”` : ""}
      </div>
      <div className="max-h-80 overflow-y-auto py-1">
        {pages.length === 0 ? (
          <p className="px-3 py-2 text-muted-foreground text-xs">
            No wiki pages found
          </p>
        ) : (
          pages.map((page, index) => {
            const active = index === activeIndex;

            return (
              <button
                className={cn(
                  "flex w-full flex-col rounded-sm px-2.5 py-2 text-left transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent"
                )}
                key={page.id}
                onClick={() => onPick(index)}
                onMouseDown={(event) => event.preventDefault()}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
              >
                <span className="truncate font-medium text-xs">
                  {page.title}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {page.excerpt}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
