import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SectionIconAction } from "./dashboard-sidebar-shared";

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
});
