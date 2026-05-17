"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { CommandPaletteBrowseGroupsMock, CommandPaletteSearchGroupsMock } =
  vi.hoisted(() => ({
    CommandPaletteBrowseGroupsMock: vi.fn(() => (
      <div>COMMAND_PALETTE_BROWSE_GROUPS</div>
    )),
    CommandPaletteSearchGroupsMock: vi.fn(() => (
      <div>COMMAND_PALETTE_SEARCH_GROUPS</div>
    )),
  }));

vi.mock("@/components/dashboard/command-palette-browse-groups", () => ({
  CommandPaletteBrowseGroups: CommandPaletteBrowseGroupsMock,
}));

vi.mock("@/components/dashboard/command-palette-search-groups", () => ({
  CommandPaletteSearchGroups: CommandPaletteSearchGroupsMock,
}));

import { CommandPaletteGroups } from "@/components/dashboard/command-palette-groups";

describe("CommandPaletteGroups", () => {
  it("routes search and browse modes into the local group owners", () => {
    const baseRuntime = {
      searchQuery: "",
    } as never;

    const browseHtml = renderToStaticMarkup(
      <CommandPaletteGroups runtime={baseRuntime} />
    );
    const searchHtml = renderToStaticMarkup(
      <CommandPaletteGroups runtime={{ ...baseRuntime, searchQuery: "flux" }} />
    );

    expect(CommandPaletteBrowseGroupsMock).toHaveBeenCalledTimes(1);
    expect(CommandPaletteSearchGroupsMock).toHaveBeenCalledTimes(1);
    expect(browseHtml).toContain("COMMAND_PALETTE_BROWSE_GROUPS");
    expect(searchHtml).toContain("COMMAND_PALETTE_SEARCH_GROUPS");
  });
});
