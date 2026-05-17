"use client";

import { CommandPaletteBrowseGroups } from "./command-palette-browse-groups";
import type { CommandPaletteRuntime } from "./command-palette-groups-types";
import { CommandPaletteSearchGroups } from "./command-palette-search-groups";

export function CommandPaletteGroups({
  runtime,
}: {
  runtime: CommandPaletteRuntime;
}) {
  return runtime.searchQuery ? (
    <CommandPaletteSearchGroups runtime={runtime} />
  ) : (
    <CommandPaletteBrowseGroups runtime={runtime} />
  );
}
