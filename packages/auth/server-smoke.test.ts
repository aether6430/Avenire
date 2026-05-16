import { beforeEach, describe, expect, it, vi } from "vitest";

const betterAuthMock = vi.fn(() => ({ api: {} }));
const drizzleAdapterMock = vi.fn(() => "drizzle-adapter");
const toNextJsHandlerMock = vi.fn(() => ({ GET: "GET" }));
const lastLoginMethodMock = vi.fn(() => "last-login-plugin");
const organizationMock = vi.fn(() => "organization-plugin");
const usernameMock = vi.fn(() => "username-plugin");
const passkeyMock = vi.fn(() => "passkey-plugin");
const waitlistPluginMock = vi.fn(() => "waitlist-plugin");
const sendMock = vi.fn();
const createWorkspaceForUserMock = vi.fn(async () => ({
  name: "Ada's Workspace",
  rootFolderId: "folder_123",
  workspaceId: "workspace_123",
}));
const createWorkspaceNoteFileMock = vi.fn();

vi.mock("@avenire/database", () => ({
  createWorkspaceForUser: createWorkspaceForUserMock,
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
  db: { name: "db" },
}));

vi.mock("@avenire/database/auth-schema", () => ({
  account: "account",
  invitation: "invitation",
  member: "member",
  organization: "organization",
  passkey: "passkey",
  session: "session",
  user: "user",
  verification: "verification",
}));

vi.mock("@avenire/emailer", () => ({
  Emailer: class {
    send = sendMock;
  },
  renderDeleteAccountEmail: vi.fn(async () => "<delete />"),
  renderFileShareNotificationEmail: vi.fn(async () => "<file-share />"),
  renderPasswordResetEmail: vi.fn(async () => "<reset />"),
  renderSecurityVerificationCodeEmail: vi.fn(async () => "<sudo />"),
  renderVerificationEmail: vi.fn(async () => "<verify />"),
  renderWelcomeEmail: vi.fn(async () => "<welcome />"),
  renderWorkspaceShareNotificationEmail: vi.fn(
    async () => "<workspace-share />"
  ),
}));

vi.mock("@better-auth/passkey", () => ({ passkey: passkeyMock }));
vi.mock("better-auth", () => ({ betterAuth: betterAuthMock }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: drizzleAdapterMock,
}));
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: toNextJsHandlerMock,
}));
vi.mock("better-auth/plugins", () => ({
  lastLoginMethod: lastLoginMethodMock,
  organization: organizationMock,
}));
vi.mock("better-auth/plugins/username", () => ({ username: usernameMock }));
vi.mock("./waitlist", () => ({ waitlistPlugin: waitlistPluginMock }));

describe("@avenire/auth server config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    Object.assign(process.env, {
      AUTH_GITHUB_ID: "github-id",
      AUTH_GITHUB_SECRET: "github-secret",
      AUTH_GOOGLE_ID: "google-id",
      AUTH_GOOGLE_SECRET: "google-secret",
      AUTH_NOTION_ID: "notion-id",
      AUTH_NOTION_SECRET: "notion-secret",
      BETTER_AUTH_EXTENSION_ORIGINS:
        "chrome-extension://abc123,moz-extension://def456",
      BETTER_AUTH_TRUSTED_ORIGINS: "https://docs.avenire.test",
      BETTER_AUTH_URL: "https://app.avenire.test",
    });
  });

  it("builds the Better Auth config and wires email/workspace helpers", async () => {
    const module = await import("./server");
    const config = betterAuthMock.mock.calls[0][0];

    expect(drizzleAdapterMock).toHaveBeenCalled();
    expect(lastLoginMethodMock).toHaveBeenCalled();
    expect(waitlistPluginMock).toHaveBeenCalled();
    expect(module.authRouteHandlers).toEqual({ GET: "GET" });
    expect(config.onAPIError.errorURL).toBe("https://app.avenire.test/login");
    expect(config.socialProviders.google.clientId).toBe("google-id");
    expect(config.socialProviders.github.clientId).toBe("github-id");
    expect(config.socialProviders.notion.clientId).toBe("notion-id");
    expect(
      config.socialProviders.google.mapProfileToUser({
        given_name: "Ada",
        name: "Ada Lovelace",
      })
    ).toEqual({ name: "Ada", username: "Ada Lovelace" });
    expect(
      config.socialProviders.github.mapProfileToUser({ name: "Grace Hopper" })
    ).toEqual({ name: "Grace Hopper", username: "Grace Hopper" });
    expect(config.plugins).toEqual([
      "last-login-plugin",
      "waitlist-plugin",
      "username-plugin",
      "organization-plugin",
      "passkey-plugin",
    ]);

    await expect(
      config.trustedOrigins({
        headers: new Headers({ origin: "http://localhost:3001" }),
      })
    ).resolves.not.toContain("http://localhost:3001");
    await expect(
      config.trustedOrigins({
        headers: new Headers({ origin: "chrome-extension://abc123" }),
      })
    ).resolves.toContain("chrome-extension://abc123");

    await config.emailAndPassword.sendResetPassword({
      url: "https://app.avenire.test/reset",
      user: { email: "ada@example.com", name: "Ada" },
    });
    await config.emailVerification.sendVerificationEmail({
      url: "https://app.avenire.test/verify",
      user: { email: "ada@example.com", name: "Ada" },
    });
    await config.user.deleteUser.sendDeleteAccountVerification({
      url: "https://app.avenire.test/delete",
      user: { email: "ada@example.com", name: "Ada" },
    });
    await config.databaseHooks.user.create.after({
      email: "ada@example.com",
      id: "user_123",
      name: "Ada",
    });

    expect(sendMock).toHaveBeenCalled();
    expect(createWorkspaceForUserMock).toHaveBeenCalledWith(
      "user_123",
      "Ada's Workspace"
    );
    expect(createWorkspaceNoteFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Welcome to Avenire.md",
        workspaceId: "workspace_123",
      })
    );

    await module.sendFileShareEmail({
      fileName: "notes.pdf",
      shareUrl: "https://app.avenire.test/share/file",
      sharedByName: "Ada",
      toEmail: "grace@example.com",
    });
    await module.sendWorkspaceShareEmail({
      sharedByName: "Ada",
      toEmail: "grace@example.com",
      workspaceName: "Avenire",
      workspaceUrl: "https://app.avenire.test/workspace",
    });
    await module.sendSudoVerificationCodeEmail({
      code: "123456",
      expiresInMinutes: 10,
      toEmail: "grace@example.com",
    });

    expect(sendMock).toHaveBeenLastCalledWith({
      html: "<sudo />",
      subject: "Your Avenire security verification code",
      to: ["grace@example.com"],
    });
  });
});
