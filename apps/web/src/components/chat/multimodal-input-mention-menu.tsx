"use client";

import {
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@avenire/ui/components/command";
import { cn } from "@avenire/ui/lib/utils";
import { FileTextIcon } from "@phosphor-icons/react";
import { Command } from "@phosphor-icons/react/Command";
import { AnimatePresence, motion } from "motion/react";
import type { MultimodalInputRuntime } from "@/components/chat/use-multimodal-input";

export function MultimodalInputMentionMenu({
  runtime,
}: {
  runtime: Pick<
    MultimodalInputRuntime,
    | "highlightedMentionIndex"
    | "isMentionMenuOpen"
    | "mentionItemRefs"
    | "mentionSuggestions"
    | "selectMention"
    | "workspaceFilesLoaded"
  >;
}) {
  const {
    highlightedMentionIndex,
    isMentionMenuOpen,
    mentionItemRefs,
    mentionSuggestions,
    selectMention,
    workspaceFilesLoaded,
  } = runtime;

  return (
    <AnimatePresence initial={false}>
      {isMentionMenuOpen ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute inset-x-1 bottom-full z-20 mb-3"
          exit={{ opacity: 0, y: 6 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <Command>
            <div
              className="scroll-fade-frame scroll-fade-top scroll-fade-bottom relative"
              style={
                {
                  "--scroll-fade-color": "var(--popover)",
                } as React.CSSProperties
              }
            >
              <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#f8f8f8] dark:border-[#2a2a2a] dark:bg-[#212121]">
                <CommandList className="max-h-64">
                  {mentionSuggestions.map((file, index) => (
                    <CommandItem
                      aria-label={`Attach ${file.workspacePath}`}
                      className={cn(
                        "cursor-pointer select-none gap-2 rounded-none px-4 py-3",
                        index === highlightedMentionIndex &&
                          "bg-accent text-accent-foreground"
                      )}
                      key={file.id}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onSelect={() => {
                        selectMention(file);
                      }}
                      ref={(node) => {
                        mentionItemRefs.current[index] = node;
                      }}
                      value={file.workspacePath}
                    >
                      <FileTextIcon className="size-4 text-muted-foreground/80" />
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <span className="truncate">{file.name}</span>
                      </span>
                      <span className="truncate text-muted-foreground/70 text-xs">
                        {file.parentPath || "Workspace root"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandList>
              </div>
            </div>

            {workspaceFilesLoaded && mentionSuggestions.length === 0 ? (
              <CommandEmpty className="px-3 py-2 text-muted-foreground/70 text-xs">
                No matching workspace files.
              </CommandEmpty>
            ) : null}
          </Command>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
