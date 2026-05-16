import type { Route } from "next";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({
    children,
    render,
  }: {
    children: ReactNode;
    render?: ReactNode;
  }) => (
    <div>
      {render}
      {children}
    </div>
  ),
}));

vi.mock("@avenire/ui/components/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@avenire/ui/components/label", () => ({
  Label: ({ children, ...props }: { children: ReactNode }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@avenire/ui/components/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

import { FlashcardsSidebarPanelCreateDialog } from "@/components/flashcards/flashcards-sidebar-panel-create-dialog";

describe("FlashcardsSidebarPanelCreateDialog copy", () => {
  it("uses explicit Mindset wording in the sidebar create dialog", () => {
    const html = renderToStaticMarkup(
      <FlashcardsSidebarPanelCreateDialog
        runtime={{
          activeSetId: undefined,
          busy: false,
          createOpen: true,
          createSet: async () => {},
          createStatus: null,
          description: "",
          filteredSets: [],
          getReviewHref: () => "/workspace/flashcards" as Route,
          getSetHref: (setId: string) =>
            `/workspace/flashcards/${setId}` as Route,
          handleEntryClick: () => {},
          handleEntryContextMenu: () => {},
          handleEntryDragStart: () => {},
          openCommandPalette: () => {},
          prefetchSet: () => {},
          reviewTarget: null,
          searchQuery: "",
          setCreateOpen: () => {},
          setDescription: () => {},
          setSearchQuery: () => {},
          setTitle: () => {},
          sets: [],
          setsLoadFailed: false,
          setsLoading: false,
          title: "",
        }}
      />
    );

    expect(html).toContain("Create mindset set");
    expect(html).toContain("Create a workspace-level mindset set.");
    expect(html).not.toContain("Create Set");
  });
});
