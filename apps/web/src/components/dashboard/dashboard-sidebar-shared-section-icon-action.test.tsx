import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SectionIconAction } from "./dashboard-sidebar-shared";

const tooltipSource = readFileSync(
  resolve(
    import.meta.dirname,
    "../../../../../packages/ui/src/components/tooltip.tsx"
  ),
  "utf8"
);

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    "aria-label": ariaLabel,
    children,
  }: {
    "aria-label"?: string;
    children?: ReactNode;
  }) => <button aria-label={ariaLabel}>{children}</button>,
}));

vi.mock("@avenire/ui/components/empty", () => ({
  Empty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  EmptyContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  EmptyDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  EmptyHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  EmptyMedia: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avenire/ui/components/sidebar", () => ({
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuButton: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@avenire/ui/components/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({
    children,
    render,
  }: {
    children: ReactNode;
    render: ReactNode;
  }) => (
    <div>
      {render}
      {children}
    </div>
  ),
}));

describe("SectionIconAction", () => {
  it("passes the visible label through to the icon button as an aria label", () => {
    const html = renderToStaticMarkup(
      <SectionIconAction
        icon={({ className }: { className?: string }) => (
          <svg className={className} />
        )}
        label="Search Methods"
        onClick={() => {}}
      />
    );

    expect(html).toContain('aria-label="Search Methods"');
  });

  it("keeps the shared tooltip chrome aligned to the popover-based upstream contract", () => {
    expect(tooltipSource).toContain("border border-border bg-popover");
    expect(tooltipSource).toContain("text-popover-foreground");
    expect(tooltipSource).toContain("shadow-sm");
    expect(tooltipSource).toContain("bg-popover fill-popover");
    expect(tooltipSource).not.toContain(
      "bg-foreground px-3 py-1.5 text-background"
    );
  });
});
