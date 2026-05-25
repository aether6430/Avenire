"use client";

import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from "@avenire/ui/components/command";
import { Kbd, KbdGroup } from "@avenire/ui/components/kbd";
import { Spinner } from "@avenire/ui/components/spinner";
import { CommandPaletteBrowseGroups } from "@/components/dashboard/command-palette-browse-groups";
import { CommandPaletteSearchGroups } from "@/components/dashboard/command-palette-search-groups";
import type { useCommandPalette } from "@/components/dashboard/use-command-palette";

type CommandPaletteRuntime = ReturnType<typeof useCommandPalette>;

export function CommandPaletteSurface({
  runtime,
}: {
  runtime: CommandPaletteRuntime;
}) {
  return (
    <CommandDialog
      className="overflow-hidden rounded-xl border-border/70 bg-[#202020] p-0 text-foreground shadow-[0_18px_80px_rgba(0,0,0,0.42)] sm:max-w-[58rem]"
      description="Search commands, methods, files, tasks, and workspace content."
      largeWidth
      onOpenChange={runtime.handleDialogOpenChange}
      open={runtime.open}
      showCloseButton={false}
      title="Command Palette"
    >
      <Command
        className="h-[min(30.75rem,calc(100dvh-4rem))] min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
        shouldFilter={false}
      >
        <div className="border-border/30 border-b px-4 py-3">
          <CommandInput
            className="h-5 border-0 bg-transparent px-0 py-0 text-[13px] placeholder:text-muted-foreground/55 focus-visible:outline-none focus-visible:ring-0"
            onValueChange={runtime.setQuery}
            placeholder="Run a command, open a method or file, or search workspace content..."
            value={runtime.query}
          />
        </div>
        {runtime.pendingRoute ? (
          <div className="flex items-center gap-2 border-border/30 border-t bg-muted/25 px-4 py-2 text-muted-foreground/70 text-xs">
            <Spinner className="size-3.5" />
            Opening selection...
          </div>
        ) : null}
        <div className="grid min-h-0 flex-1 grid-cols-1 bg-transparent">
          <div className="min-h-0">
            <CommandList className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent max-h-none min-h-0 overflow-y-auto px-1 py-1">
              {runtime.searchQuery ? (
                <CommandPaletteSearchGroups runtime={runtime} />
              ) : (
                <CommandPaletteBrowseGroups runtime={runtime} />
              )}
            </CommandList>
          </div>
        </div>
        <div className="border-border/25 border-t bg-[#242424] px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground/65">
            <div className="flex items-center gap-2">
              <KbdGroup>
                <Kbd className="rounded bg-black/20 px-1.5 py-0.5 text-[11px]">
                  ↑
                </Kbd>
                <Kbd className="rounded bg-black/20 px-1.5 py-0.5 text-[11px]">
                  ↓
                </Kbd>
              </KbdGroup>
              <span className="text-muted-foreground/60">Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <Kbd className="rounded bg-black/20 px-1.5 py-0.5 text-[11px]">
                Enter
              </Kbd>
              <span className="text-muted-foreground/60">Select</span>
            </div>
            <div className="flex items-center gap-2">
              <Kbd className="rounded bg-black/20 px-1.5 py-0.5 text-[11px]">
                Esc
              </Kbd>
              <span className="text-muted-foreground/60">Close</span>
            </div>
          </div>
        </div>
      </Command>
    </CommandDialog>
  );
}
