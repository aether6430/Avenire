"use client";

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
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

vi.mock("@avenire/ui/components/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandDialog: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  CommandInput: () => <input />,
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avenire/ui/components/kbd", () => ({
  Kbd: ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>,
  KbdGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: () => <div data-spinner="1" />,
}));

import { CommandPaletteSurface } from "@/components/dashboard/command-palette-surface";

const removedGroupsWrapperFile = resolve(
  import.meta.dirname,
  "./command-palette-groups.tsx"
);
const removedGroupsTypesFile = resolve(
  import.meta.dirname,
  "./command-palette-groups-types.ts"
);

describe("CommandPaletteSurface group routing", () => {
  it("routes search and browse modes into the local group owners without the old groups wrappers", () => {
    const baseRuntime = {
      handleDialogOpenChange: () => {},
      open: false,
      pendingRoute: false,
      query: "",
      searchQuery: "",
      setQuery: () => {},
    } as never;

    const browseHtml = renderToStaticMarkup(
      <CommandPaletteSurface runtime={baseRuntime} />
    );
    const searchHtml = renderToStaticMarkup(
      <CommandPaletteSurface
        runtime={{ ...baseRuntime, query: "flux", searchQuery: "flux" }}
      />
    );

    expect(CommandPaletteBrowseGroupsMock).toHaveBeenCalledTimes(1);
    expect(CommandPaletteSearchGroupsMock).toHaveBeenCalledTimes(1);
    expect(existsSync(removedGroupsWrapperFile)).toBe(false);
    expect(existsSync(removedGroupsTypesFile)).toBe(false);
    expect(browseHtml).toContain("COMMAND_PALETTE_BROWSE_GROUPS");
    expect(searchHtml).toContain("COMMAND_PALETTE_SEARCH_GROUPS");
  });
});
