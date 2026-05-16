import type { Route } from "next";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/sidebar", () => ({
  SidebarGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SidebarMenuItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  useSidebar: () => ({ isMobile: false }),
}));

import { FlashcardsSidebarPanelSurface } from "@/components/flashcards/flashcards-sidebar-panel-surface";

describe("FlashcardsSidebarPanelSurface", () => {
  it("uses explicit review and mindset set wording instead of generic set titles", () => {
    const html = renderToStaticMarkup(
      <FlashcardsSidebarPanelSurface
        runtime={{
          activeSetId: undefined,
          busy: false,
          createOpen: false,
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
          isSearchOpen: false,
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
          toggleSearch: () => {},
        }}
      />
    );

    expect(html).toContain("Review");
    expect(html).toContain("Mindset Sets");
    expect(html).not.toContain(">Sets<");
    expect(html).toContain("No mindset sets yet");
    expect(html).not.toContain("No sets yet");
  });

  it("renders an explicit failure state instead of pretending there are simply no sets yet", () => {
    const html = renderToStaticMarkup(
      <FlashcardsSidebarPanelSurface
        runtime={{
          activeSetId: undefined,
          busy: false,
          createOpen: false,
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
          isSearchOpen: false,
          openCommandPalette: () => {},
          prefetchSet: () => {},
          reviewTarget: null,
          searchQuery: "",
          setCreateOpen: () => {},
          setDescription: () => {},
          setSearchQuery: () => {},
          setTitle: () => {},
          sets: [],
          setsLoadFailed: true,
          setsLoading: false,
          title: "",
          toggleSearch: () => {},
        }}
      />
    );

    expect(html).toContain("Unable to load mindset sets.");
    expect(html).toContain(
      "Try again in a moment to reload your mindset sets."
    );
    expect(html).not.toContain("No sets yet");
  });

  it("only renders the local mindset-set search field when search is open", () => {
    const closedHtml = renderToStaticMarkup(
      <FlashcardsSidebarPanelSurface
        runtime={{
          activeSetId: undefined,
          busy: false,
          createOpen: false,
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
          isSearchOpen: false,
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
          toggleSearch: () => {},
        }}
      />
    );
    const openHtml = renderToStaticMarkup(
      <FlashcardsSidebarPanelSurface
        runtime={{
          activeSetId: undefined,
          busy: false,
          createOpen: false,
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
          isSearchOpen: true,
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
          toggleSearch: () => {},
        }}
      />
    );

    expect(closedHtml).not.toContain("Search Mindset Sets...");
    expect(openHtml).toContain("Search Mindset Sets...");
    expect(closedHtml).toContain('aria-label="Search Mindset Sets"');
  });
});
