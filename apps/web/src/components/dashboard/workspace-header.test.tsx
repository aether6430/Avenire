"use client";

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/workspace-panes", () => ({
  usePanePathname: () => "/workspace/files",
  usePaneRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/stores/header-store", () => ({
  usePaneHeaderStore: (
    selector: (state: {
      actions: ReactNode;
      breadcrumbs: ReactNode;
      leadingIcon: ReactNode;
      title: string;
    }) => unknown
  ) =>
    selector({
      actions: <button type="button">Actions</button>,
      breadcrumbs: <span>Welcome to Avenire</span>,
      leadingIcon: <span className="inline-flex size-6">Icon</span>,
      title: "Welcome to Avenire",
    }),
}));

vi.mock("@/stores/workspaceHistoryStore", () => ({
  usePaneWorkspaceHistoryStore: (
    selector: (state: { entries: string[]; index: number }) => unknown
  ) => selector({ entries: ["/workspace", "/workspace/files"], index: 1 }),
}));

vi.mock("@avenire/ui/components/sidebar", () => ({
  SidebarTrigger: ({ className }: { className?: string }) => (
    <button aria-label="Toggle sidebar" className={className} type="button" />
  ),
}));

import { WorkspaceHeader } from "@/components/dashboard/workspace-header";

describe("WorkspaceHeader", () => {
  it("keeps navigation, leading icon, title, and actions in explicit columns", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader />);

    expect(html).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(html).toContain("self-center shrink-0");
    expect(html).toContain("flex size-6 shrink-0");
    expect(html).toContain("Welcome to Avenire");
    expect(html).toContain("Actions");
  });

  it("keeps the compact header left controls out of the title column", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader compact />);

    expect(html).toContain("grid-cols-[auto_minmax(0,1fr)_auto]");
    expect(html).toContain("self-center shrink-0");
    expect(html).toContain("Welcome to Avenire");
  });
});
