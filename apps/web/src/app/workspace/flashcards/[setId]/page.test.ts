import { describe, expect, it, vi } from "vitest";

const { getFlashcardSetForUserMock, getWorkspaceRouteContextMock } = vi.hoisted(
  () => ({
    getFlashcardSetForUserMock: vi.fn(),
    getWorkspaceRouteContextMock: vi.fn(),
  })
);

vi.mock("@/lib/flashcards", () => ({
  getFlashcardSetForUser: getFlashcardSetForUserMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getWorkspaceRouteContext: getWorkspaceRouteContextMock,
}));

import { dynamic, generateMetadata } from "./page";

describe("WorkspaceFlashcardSetPage metadata", () => {
  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses Mindset Set as the fallback title without a workspace context", async () => {
    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: null,
      workspace: null,
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ setId: "set-1" }),
    });

    expect(metadata.title).toBe("Mindset Set — Avenire");
  });

  it("uses the actual mindset set title when the set exists", async () => {
    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: { user: { id: "user-1" } },
      workspace: { workspaceId: "workspace-1" },
    });
    getFlashcardSetForUserMock.mockResolvedValueOnce({
      id: "set-1",
      title: "Intro to Computers",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ setId: "set-1" }),
    });

    expect(metadata.title).toBe("Intro to Computers — Avenire");
  });

  it("publishes Mindset Set not found when the set cannot be resolved", async () => {
    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: { user: { id: "user-1" } },
      workspace: { workspaceId: "workspace-1" },
    });
    getFlashcardSetForUserMock.mockResolvedValueOnce(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ setId: "missing-set" }),
    });

    expect(metadata.title).toBe("Mindset Set not found. — Avenire");
  });

  it("fails closed to Mindset Set when workspace context or set lookup throws", async () => {
    getWorkspaceRouteContextMock.mockRejectedValueOnce(
      new Error("flashcards page offline")
    );

    let metadata = await generateMetadata({
      params: Promise.resolve({ setId: "set-1" }),
    });

    expect(metadata.title).toBe("Mindset Set — Avenire");

    getWorkspaceRouteContextMock.mockResolvedValueOnce({
      session: { user: { id: "user-1" } },
      workspace: { workspaceId: "workspace-1" },
    });
    getFlashcardSetForUserMock.mockRejectedValueOnce(
      new Error("flashcards lookup offline")
    );

    metadata = await generateMetadata({
      params: Promise.resolve({ setId: "set-1" }),
    });

    expect(metadata.title).toBe("Mindset Set — Avenire");
  });
});
