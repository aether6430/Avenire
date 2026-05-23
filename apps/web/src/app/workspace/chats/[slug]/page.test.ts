import { readFileSync } from "node:fs";
import path from "node:path";
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

const workspaceChatSlugPageFile = path.resolve(
  import.meta.dirname,
  "./page.tsx"
);
const chatSlugRouteModelFile = path.resolve(
  import.meta.dirname,
  "../../../api/chats/[slug]/chat-slug-route-model.ts"
);

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

  it("fails closed to Method when session or chat lookup throws during metadata generation", async () => {
    getRouteSessionMock.mockRejectedValueOnce(new Error("chat page offline"));

    let metadata = await generateMetadata({
      params: Promise.resolve({ slug: "method-1" }),
    });

    expect(metadata.title).toBe("Method — Avenire");

    getRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });
    getChatBySlugForUserMock.mockRejectedValueOnce(new Error("chat offline"));

    metadata = await generateMetadata({
      params: Promise.resolve({ slug: "method-1" }),
    });

    expect(metadata.title).toBe("Method — Avenire");
  });

  it("keeps the route-level loading placeholder aligned to the Method entity", () => {
    const source = readFileSync(workspaceChatSlugPageFile, "utf8");
    const routeModelSource = readFileSync(chatSlugRouteModelFile, "utf8");

    expect(source).toContain('label="Loading Method..."');
    expect(source).not.toContain('label="Loading method..."');
    expect(routeModelSource).toContain(
      'CHAT_SLUG_LOAD_ERROR = "Unable to load Method."'
    );
    expect(routeModelSource).toContain(
      'CHAT_SLUG_UPDATE_ERROR = "Unable to update Method."'
    );
    expect(routeModelSource).toContain(
      'CHAT_SLUG_DELETE_ERROR = "Unable to delete Method."'
    );
    expect(routeModelSource).not.toContain(
      'CHAT_SLUG_LOAD_ERROR = "Unable to load method."'
    );
  });
});
