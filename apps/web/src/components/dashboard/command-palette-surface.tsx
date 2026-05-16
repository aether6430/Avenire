"use client";

import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from "@avenire/ui/components/command";
import { Kbd, KbdGroup } from "@avenire/ui/components/kbd";
import { Spinner } from "@avenire/ui/components/spinner";
import { CommandPaletteGroups } from "@/components/dashboard/command-palette-groups";
import type { useCommandPalette } from "@/components/dashboard/use-command-palette";

type CommandPaletteRuntime = ReturnType<typeof useCommandPalette>;

export function CommandPaletteSurface({
  runtime,
}: {
  runtime: CommandPaletteRuntime;
}) {
  return (
    <CommandDialog
      className="overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/20 backdrop-blur-xl sm:max-w-5xl"
      description="Search commands, methods, files, tasks, and workspace content."
      largeWidth
      onOpenChange={runtime.handleDialogOpenChange}
      open={runtime.open}
      showCloseButton={false}
      title="Command Palette"
    >
      <Command
        className="h-[min(34rem,calc(100dvh-4rem))] min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
        shouldFilter={false}
      >
        <div className="border-border/70 border-b bg-secondary/65 px-4 py-1.5">
          <CommandInput
            className="border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground/55 focus-visible:outline-none focus-visible:ring-0"
            onValueChange={runtime.setQuery}
            placeholder="Run a command, open a method or file, or search workspace content..."
            value={runtime.query}
          />
        </div>
        {runtime.pendingRoute ? (
          <div className="flex items-center gap-2 border-border/70 border-t bg-secondary/50 px-4 py-3 text-muted-foreground/70 text-xs">
            <Spinner className="size-3.5" />
            Opening selection...
          </div>
        ) : null}
        <div className="grid min-h-0 flex-1 grid-cols-1 border-border/70 border-t bg-background/10">
          <div className="min-h-0">
            <CommandList className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-background max-h-96 min-h-0 overflow-y-auto rounded-lg">
              <CommandPaletteGroups runtime={runtime} />
            </CommandList>
          </div>
        </div>
        <div className="border-border/70 border-t bg-secondary/60 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground/70 text-xs">
            <div className="flex items-center gap-2">
              <KbdGroup>
                <Kbd className="px-2 py-1 text-xs">↑</Kbd>
                <Kbd className="px-2 py-1 text-xs">↓</Kbd>
              </KbdGroup>
              <span className="text-muted-foreground/60">Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <Kbd className="px-2 py-1 text-xs">Enter</Kbd>
              <span className="text-muted-foreground/60">Select</span>
            </div>
            <div className="flex items-center gap-2">
              <Kbd className="px-2 py-1 text-xs">Esc</Kbd>
              <span className="text-muted-foreground/60">Close</span>
            </div>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
