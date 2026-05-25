import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, hasSessionCookieMock, headersMock } = vi.hoisted(
  () => ({
    getSessionMock: vi.fn(),
    hasSessionCookieMock: vi.fn(),
    headersMock: vi.fn(async () => new Headers()),
  })
);

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@avenire/auth/middleware", () => ({
  hasSessionCookie: hasSessionCookieMock,
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalNodeEnv = process.env.NODE_ENV;

describe("workspace route session lookup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BETTER_AUTH_URL = "http://127.0.0.1:3000";
    process.env.DATABASE_URL =
      "postgres://postgres:postgres@127.0.0.1:5432/avenire";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns null without hitting the auth server when the request has no session cookie", async () => {
    const requestHeaders = new Headers();
    headersMock.mockResolvedValueOnce(requestHeaders);
    hasSessionCookieMock.mockReturnValueOnce(false);

    const { getRouteSession } = await import("./workspace-route-context");

    await expect(getRouteSession()).resolves.toBeNull();

    expect(headersMock).toHaveBeenCalledTimes(1);
    expect(hasSessionCookieMock).toHaveBeenCalledWith(requestHeaders);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("fails closed before any auth lookup when the server auth runtime is not configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.BETTER_AUTH_URL = "";
    process.env.DATABASE_URL = "";
    process.env.NODE_ENV = "development";

    const { getRouteSession } = await import("./workspace-route-context");

    await expect(getRouteSession()).resolves.toBeNull();

    expect(headersMock).not.toHaveBeenCalled();
    expect(hasSessionCookieMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[auth] skipping server session lookup because BETTER_AUTH_URL or DATABASE_URL is missing"
    );
  });

  it("delegates to Better Auth when the request includes a session cookie", async () => {
    const requestHeaders = new Headers([
      ["cookie", "better-auth.session_token=session-token"],
    ]);
    const session = { user: { id: "user-1" } };
    headersMock.mockResolvedValueOnce(requestHeaders);
    hasSessionCookieMock.mockReturnValueOnce(true);
    getSessionMock.mockResolvedValueOnce(session);

    const { getRouteSession } = await import("./workspace-route-context");

    await expect(getRouteSession()).resolves.toEqual(session);

    expect(hasSessionCookieMock).toHaveBeenCalledWith(requestHeaders);
    expect(getSessionMock).toHaveBeenCalledWith({
      headers: requestHeaders,
    });
  });
});
