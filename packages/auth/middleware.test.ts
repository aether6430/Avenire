import { describe, expect, it, vi } from "vitest";

const getSessionCookieMock = vi.fn();
const redirectMock = vi.fn((url: URL) => ({ type: "redirect", url }));
const nextMock = vi.fn(() => ({ type: "next" }));

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: getSessionCookieMock,
}));
vi.mock("next/server", () => ({
  NextResponse: { next: nextMock, redirect: redirectMock },
}));

describe("@avenire/auth middleware", () => {
  it("redirects unauthenticated workspace routes and otherwise falls through", async () => {
    vi.resetModules();
    getSessionCookieMock.mockReturnValue(null);
    const { authMiddleware } = await import("./middleware");
    await expect(
      authMiddleware({
        nextUrl: { pathname: "/workspace/files" },
        url: "https://app.avenire.test/workspace/files",
      } as never)
    ).resolves.toEqual({
      type: "redirect",
      url: new URL("/login", "https://app.avenire.test/workspace/files"),
    });

    vi.resetModules();
    vi.clearAllMocks();
    getSessionCookieMock.mockReturnValue("session-token");
    const module = await import("./middleware");
    await expect(
      module.authMiddleware({
        nextUrl: { pathname: "/pricing" },
        url: "https://app.avenire.test/pricing",
      } as never)
    ).resolves.toEqual({ type: "next" });
    expect(module.hasSessionCookie(new Headers())).toBe(true);
  });
});
