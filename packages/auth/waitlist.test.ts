import { beforeEach, describe, expect, it, vi } from "vitest";

const getWaitlistAccessStateByEmailMock = vi.fn();
const getWaitlistAccessStateByUserIdMock = vi.fn();
const hasWaitlistAccessMock = vi.fn();
const markWaitlistRegisteredMock = vi.fn();
const normalizeEmailMock = vi.fn((email: string) => email.trim().toLowerCase());
const createAuthMiddlewareMock = vi.fn((handler) => handler);

class MockAPIError extends Error {
  status: string;

  constructor(status: string, options: { message: string }) {
    super(options.message);
    this.name = "APIError";
    this.status = status;
  }
}

vi.mock("@avenire/database", () => ({
  getWaitlistAccessStateByEmail: getWaitlistAccessStateByEmailMock,
  getWaitlistAccessStateByUserId: getWaitlistAccessStateByUserIdMock,
  hasWaitlistAccess: hasWaitlistAccessMock,
  markWaitlistRegistered: markWaitlistRegisteredMock,
  normalizeEmail: normalizeEmailMock,
}));

vi.mock("better-auth", () => ({
  APIError: MockAPIError,
}));

vi.mock("better-auth/api", () => ({
  createAuthMiddleware: createAuthMiddlewareMock,
}));

describe("@avenire/auth waitlist plugin", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("enforces waitlist access in database hooks", async () => {
    const { waitlistPlugin } = await import("./waitlist");
    const plugin = waitlistPlugin();
    const hooks = plugin.init().options.databaseHooks;
    const pendingError = { message: "waitlist_pending", status: "FORBIDDEN" };

    getWaitlistAccessStateByEmailMock.mockResolvedValueOnce("pending");
    hasWaitlistAccessMock.mockReturnValueOnce(false);
    await expect(
      hooks.user.create.before({ email: "User@Example.com" })
    ).rejects.toMatchObject(pendingError);

    getWaitlistAccessStateByUserIdMock.mockResolvedValueOnce("approved");
    hasWaitlistAccessMock.mockReturnValueOnce(true);
    await expect(
      hooks.session.create.before({ userId: "user_123" })
    ).resolves.toBeUndefined();
  });

  it("guards sign-up requests before account creation", async () => {
    const { waitlistPlugin } = await import("./waitlist");
    const beforeHook = waitlistPlugin().hooks.before[0];
    const pendingError = { message: "waitlist_pending", status: "FORBIDDEN" };

    expect(beforeHook.matcher({ path: "/sign-up/email" })).toBe(true);
    expect(beforeHook.matcher({ path: "/sign-in/email" })).toBe(false);

    await expect(
      beforeHook.handler({
        body: {},
      })
    ).rejects.toMatchObject({
      message: "Email is required.",
      status: "BAD_REQUEST",
    });

    getWaitlistAccessStateByEmailMock.mockResolvedValueOnce("pending");
    hasWaitlistAccessMock.mockReturnValueOnce(false);
    await expect(
      beforeHook.handler({
        body: { email: " User@Example.com " },
      })
    ).rejects.toMatchObject(pendingError);
    expect(normalizeEmailMock).toHaveBeenCalledWith(" User@Example.com ");
  });

  it("validates and marks sessions after sign-up or callback flows", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { waitlistPlugin } = await import("./waitlist");
    const afterHook = waitlistPlugin().hooks.after[0];
    const pendingError = { message: "waitlist_pending", status: "FORBIDDEN" };
    const newSession = {
      user: {
        email: "user@example.com",
        id: "user_123",
      },
    };

    expect(afterHook.matcher({ path: "/callback/google" })).toBe(true);
    expect(afterHook.matcher({ path: "/sign-in/email" })).toBe(true);
    expect(afterHook.matcher({ path: "/pricing" })).toBe(false);

    await expect(
      afterHook.handler({
        context: {},
      })
    ).resolves.toBeUndefined();

    const setNewSession = vi.fn();
    getWaitlistAccessStateByUserIdMock.mockResolvedValueOnce("pending");
    hasWaitlistAccessMock.mockReturnValueOnce(false);
    await expect(
      afterHook.handler({
        context: {
          newSession,
          setNewSession,
        },
      })
    ).rejects.toMatchObject(pendingError);
    expect(setNewSession).toHaveBeenCalledWith(null);

    getWaitlistAccessStateByUserIdMock.mockResolvedValueOnce("approved");
    hasWaitlistAccessMock.mockReturnValueOnce(true);
    markWaitlistRegisteredMock.mockRejectedValueOnce(new Error("db offline"));
    await expect(
      afterHook.handler({
        context: {
          newSession,
          setNewSession: vi.fn(),
        },
      })
    ).resolves.toBeUndefined();
    expect(markWaitlistRegisteredMock).toHaveBeenCalledWith("user@example.com");
    expect(errorSpy).toHaveBeenCalledWith(
      "[waitlist] failed to mark registered",
      expect.objectContaining({
        email: "user@example.com",
      })
    );
  });
});
