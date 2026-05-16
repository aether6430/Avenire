import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommandPaletteSurface } from "./command-palette-surface";

vi.mock("@avenire/ui/components/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandDialog: ({
    children,
    description,
    title,
  }: {
    children: ReactNode;
    description: string;
    title: string;
  }) => (
    <section data-description={description} data-title={title}>
      {children}
    </section>
  ),
  CommandInput: ({ placeholder }: { placeholder: string }) => (
    <input placeholder={placeholder} />
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avenire/ui/components/kbd", () => ({
  Kbd: ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>,
  KbdGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: () => <div data-spinner="1" />,
}));

vi.mock("@/components/dashboard/command-palette-groups", () => ({
  CommandPaletteGroups: () => <div data-groups="1" />,
}));

describe("CommandPaletteSurface", () => {
  it("describes the palette with current product surfaces instead of generic threads/projects wording", () => {
    const html = renderToStaticMarkup(
      <CommandPaletteSurface
        runtime={
          {
            handleDialogOpenChange: () => {},
            open: false,
            pendingRoute: false,
            query: "",
            setQuery: () => {},
          } as never
        }
      />
    );

    expect(html).toContain(
      "Search commands, methods, files, tasks, and workspace content."
    );
    expect(html).toContain(
      "Run a command, open a method or file, or search workspace content..."
    );
    expect(html).not.toContain("projects");
    expect(html).not.toContain("threads");
  });
});
