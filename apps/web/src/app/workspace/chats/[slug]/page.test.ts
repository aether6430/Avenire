import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

const { getChatBySlugForUserMock, getRouteSessionMock } = vi.hoisted(() => ({
  getChatBySlugForUserMock: vi.fn(),
  getRouteSessionMock: vi.fn(),
}));

vi.mock("@/lib/chat-data", () => ({
  getChatBySlugForUser: getChatBySlugForUserMock,
}));

vi.mock("@/lib/workspace-route-context", () => ({
  getRouteSession: getRouteSessionMock,
}));

vi.mock("@/components/dashboard/workspace-chat-route-page-client", () => ({
  WorkspaceChatRoutePageClient: () => createElement("div"),
}));

import { dynamic, generateMetadata } from "./page";

describe("WorkspaceChatSlugPage metadata", () => {
  it("keeps the route explicitly request-driven", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("uses the actual chat title when the method exists", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });
    getChatBySlugForUserMock.mockResolvedValueOnce({
      slug: "method-1",
      title: "Linear Algebra Review",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "method-1" }),
    });

    expect(metadata.title).toBe("Linear Algebra Review — Avenire");
  });

  it("fails closed to Method when the requested chat cannot be resolved", async () => {
    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });
    getChatBySlugForUserMock.mockResolvedValueOnce(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "missing-method" }),
    });

    expect(metadata.title).toBe("Method — Avenire");
  });
});
