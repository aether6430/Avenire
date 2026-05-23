"use client";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
  it("keeps navigation, leading icon, title, and actions in the calmer flex layout", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader />);

    expect(html).toContain("flex-row");
    expect(html).toContain("self-center divide-x");
    expect(html).toContain("flex w-full min-w-0 items-center gap-1");
    expect(html).toContain("flex size-5 shrink-0");
    expect(html).toContain("Welcome to Avenire");
    expect(html).toContain("Actions");
    expect(html).toContain('aria-label="Open workspace"');
    expect(html).not.toContain('aria-label="Go home"');
    expect(html).not.toContain("grid-cols-[minmax(0,1fr)_auto]");
  });

  it("keeps the compact header centered while letting the title column flex", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader compact />);

    expect(html).toContain("relative flex h-10 items-center gap-1.5 px-3");
    expect(html).toContain("min-w-0 flex-1 overflow-hidden text-center");
    expect(html).toContain("Welcome to Avenire");
    expect(html).toContain('aria-label="Open workspace"');
    expect(html).not.toContain('aria-label="Go home"');
    expect(html).not.toContain("grid-cols-[auto_minmax(0,1fr)_auto]");
  });

  it("keeps shared header title wiring delegated through the portal helpers", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const headerPortalSource = readFileSync(
      join(directory, "header-portal.tsx"),
      "utf8"
    );
    const chatWorkspaceSource = readFileSync(
      join(directory, "chat-workspace-surface.tsx"),
      "utf8"
    );

    expect(headerPortalSource).toContain("export function HeaderTitle");
    expect(headerPortalSource).toContain("setTitle(children);");
    expect(headerPortalSource).toContain("setTitle(null);");
    expect(chatWorkspaceSource).toContain(
      "<HeaderTitle>{runtime.title}</HeaderTitle>"
    );
  });
});
