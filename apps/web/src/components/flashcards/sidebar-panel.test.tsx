import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardSidebarMountedViews } from "@/components/dashboard/dashboard-sidebar-mounted-views";

const { useFlashcardsSidebarPanelMock } = vi.hoisted(() => ({
  useFlashcardsSidebarPanelMock: vi.fn(),
}));

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
}));

vi.mock(
  "@/components/flashcards/flashcards-sidebar-panel-create-dialog",
  () => ({
    FlashcardsSidebarPanelCreateDialog: () => (
      <div>FLASHCARDS_CREATE_DIALOG</div>
    ),
  })
);

vi.mock("@/components/flashcards/use-flashcards-sidebar-panel", () => ({
  useFlashcardsSidebarPanel: useFlashcardsSidebarPanelMock,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

const dashboardSidebarMountedViewsSource = readFileSync(
  resolve(
    import.meta.dirname,
    "../dashboard/dashboard-sidebar-mounted-views.tsx"
  ),
  "utf8"
);
const flashcardsSidebarHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-flashcards-sidebar-panel.ts"),
  "utf8"
);
const flashcardsSidebarClientSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-sidebar-panel-client.ts"),
  "utf8"
);
const flashcardsSidebarModelSource = readFileSync(
  resolve(import.meta.dirname, "./flashcards-sidebar-panel-model.ts"),
  "utf8"
);
const removedWrapperFile = resolve(import.meta.dirname, "./sidebar-panel.tsx");

describe("DashboardSidebarMountedViews flashcards branch", () => {
  it("wires the flashcards sidebar runtime hook into the surface without the old wrapper file", () => {
    useFlashcardsSidebarPanelMock.mockReturnValue({
      filteredSets: [],
      getReviewHref: () => "/workspace/flashcards",
      getSetHref: (setId: string) => `/workspace/flashcards/${setId}`,
      handleEntryClick: () => {},
      handleEntryContextMenu: () => {},
      handleEntryDragStart: () => {},
      isSearchOpen: false,
      prefetchSet: () => {},
      reviewTarget: null,
      searchQuery: "",
      setSearchQuery: () => {},
      sets: [],
      setsErrorMessage: null,
      setsLoadFailed: false,
      setsLoading: false,
      toggleSearch: () => {},
    });

    const html = renderToStaticMarkup(
      <DashboardSidebarMountedViews
        runtime={
          {
            activeChatSlug: "",
            activeWorkspace: null,
            chatActionStatus: null,
            chatsLoadFailed: false,
            chatsLoading: false,
            chatSearchQuery: "",
            closeMobileSidebar: () => {},
            currentFileId: null,
            currentFlashcardSetId: "set-1",
            currentFolderId: null,
            deleteChat: () => {},
            editingChatSlug: null,
            editingTitle: "",
            filteredOtherChats: [],
            filteredPinnedChats: [],
            isChatSearchOpen: false,
            mountedViews: new Set(["flashcards"]),
            navigate: () => {},
            navigateToFilesRoot: () => Promise.resolve(),
            pendingChatSlug: null,
            setChatSearchQuery: () => {},
            setEditingChatSlug: () => {},
            setEditingTitle: () => {},
            sidebarView: "flashcards",
            triggerHaptic: () => Promise.resolve(),
            updateChat: () => {},
            workspaceUuid: "workspace-1",
          } as never
        }
      />
    );

    expect(useFlashcardsSidebarPanelMock).toHaveBeenCalledWith({
      active: true,
      activeSetId: "set-1",
      workspaceUuid: "workspace-1",
    });
    expect(html).toContain("Review Due");
    expect(html).toContain("Mindset Sets");
    expect(html).toContain("FLASHCARDS_CREATE_DIALOG");
  });

  it("keeps flashcards sidebar ownership split between mounted-views composition, hook runtime, fetch client, and pure model helpers", () => {
    expect(dashboardSidebarMountedViewsSource).toContain(
      "@/components/flashcards/use-flashcards-sidebar-panel"
    );
    expect(dashboardSidebarMountedViewsSource).not.toContain(
      "function ReadyFlashcardsSidebarPanel"
    );
    expect(dashboardSidebarMountedViewsSource).toContain(
      "export function FlashcardsSidebarPanelSurface"
    );
    expect(dashboardSidebarMountedViewsSource).not.toContain(
      "@/components/flashcards/flashcards-sidebar-panel-surface"
    );
    expect(dashboardSidebarMountedViewsSource).not.toContain("./sidebar-panel");
    expect(existsSync(removedWrapperFile)).toBe(false);

    expect(flashcardsSidebarHookSource).toContain(
      "@/components/flashcards/flashcards-sidebar-panel-client"
    );
    expect(flashcardsSidebarHookSource).toContain(
      "@/components/flashcards/flashcards-sidebar-panel-model"
    );
    expect(flashcardsSidebarHookSource).toContain(
      "@/lib/dashboard-browser-cache"
    );
    expect(flashcardsSidebarHookSource).toContain(
      "@/lib/flashcard-browser-cache"
    );
    expect(flashcardsSidebarHookSource).toContain("@/lib/workspace-panes");
    expect(flashcardsSidebarHookSource).not.toContain("SidebarMenuButton");

    expect(flashcardsSidebarClientSource).toContain("/api/flashcards/sets");
    expect(flashcardsSidebarClientSource).not.toContain(
      "readCachedFlashcardSets("
    );
    expect(flashcardsSidebarModelSource).toContain(
      "export function getFlashcardsSidebarSetsState"
    );
    expect(flashcardsSidebarModelSource).not.toContain("fetch(");
  });
});
