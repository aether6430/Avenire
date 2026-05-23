import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const betterAuthMock = vi.fn(() => ({ api: {} }));
const checkoutMock = vi.fn(() => "checkout-plugin");
const drizzleAdapterMock = vi.fn(() => "drizzle-adapter");
const nextCookiesMock = vi.fn(() => "next-cookies-plugin");
const toNextJsHandlerMock = vi.fn(() => ({ GET: "GET" }));
const lastLoginMethodMock = vi.fn(() => "last-login-plugin");
const organizationMock = vi.fn(() => "organization-plugin");
const usernameMock = vi.fn(() => "username-plugin");
const passkeyMock = vi.fn(() => "passkey-plugin");
const polarPluginMock = vi.fn(() => "polar-plugin");
const polarSdkMock = vi.fn(function Polar(options) {
  return { options };
});
const portalMock = vi.fn(() => "portal-plugin");
const waitlistPluginMock = vi.fn(() => "waitlist-plugin");
const sendMock = vi.fn();
const createWorkspaceForUserMock = vi.fn(async () => ({
  name: "Ada's Workspace",
  rootFolderId: "folder_123",
  workspaceId: "workspace_123",
}));
const createWorkspaceNoteFileMock = vi.fn();
const serverSource = readFileSync(resolve(import.meta.dirname, "./server.ts"), {
  encoding: "utf8",
});

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
vi.mock("@polar-sh/better-auth", () => ({
  checkout: checkoutMock,
  polar: polarPluginMock,
  portal: portalMock,
}));
vi.mock("@polar-sh/sdk", () => ({ Polar: polarSdkMock }));
vi.mock("better-auth", () => ({ betterAuth: betterAuthMock }));
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: drizzleAdapterMock,
}));
vi.mock("better-auth/next-js", () => ({
  nextCookies: nextCookiesMock,
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
      POLAR_ACCESS_TOKEN: "",
      POLAR_PRODUCT_ID_CORE_MONTHLY: "",
      POLAR_PRODUCT_ID_CORE_YEARLY: "",
      POLAR_PRODUCT_ID_SCHOLAR_MONTHLY: "",
      POLAR_PRODUCT_ID_SCHOLAR_YEARLY: "",
      POLAR_SERVER: "sandbox",
    });
  });

  it("fails closed when BETTER_AUTH_URL is missing", async () => {
    process.env.BETTER_AUTH_URL = "";

    await expect(import("./server")).rejects.toThrow(
      "Missing BETTER_AUTH_URL. Set BETTER_AUTH_URL for auth server configuration."
    );
    expect(betterAuthMock).not.toHaveBeenCalled();
  });

  it("builds the Better Auth config and wires email/workspace helpers", async () => {
    const module = await import("./server");
    const config = betterAuthMock.mock.calls[0][0];

    expect(serverSource).toContain('from "./server-mailers"');
    expect(serverSource).toContain('from "./server-workspace-bootstrap"');
    expect(serverSource).not.toContain('from "@avenire/emailer"');
    expect(serverSource).not.toContain("function buildWelcomeWorkspaceNote(");

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
      "next-cookies-plugin",
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
        content: expect.stringContaining(
          "Generate a Mindset Set from that file so you can start reviewing it right away."
        ),
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

  it("wires the Better Auth Polar plugin only when the Polar runtime is configured", async () => {
    process.env.POLAR_ACCESS_TOKEN = "polar-token";
    process.env.POLAR_PRODUCT_ID_CORE_MONTHLY = "product-core-monthly";
    process.env.POLAR_PRODUCT_ID_SCHOLAR_YEARLY = "product-scholar-yearly";
    process.env.POLAR_SERVER = "production";

    await import("./server");
    const config = betterAuthMock.mock.calls[0][0];

    expect(polarSdkMock).toHaveBeenCalledWith({
      accessToken: "polar-token",
      server: "production",
    });
    expect(portalMock).toHaveBeenCalledTimes(1);
    expect(checkoutMock).toHaveBeenCalledWith({
      authenticatedUsersOnly: true,
      products: [
        {
          productId: "product-core-monthly",
          slug: "core-monthly",
        },
        {
          productId: "product-scholar-yearly",
          slug: "scholar-yearly",
        },
      ],
      returnUrl: "/workspace?overlay=settings&settingsTab=billing",
      successUrl:
        "/workspace?overlay=settings&settingsTab=billing&checkout=success",
    });
    expect(polarPluginMock).toHaveBeenCalledWith({
      client: expect.objectContaining({
        options: {
          accessToken: "polar-token",
          server: "production",
        },
      }),
      createCustomerOnSignUp: true,
      use: ["portal-plugin", "checkout-plugin"],
    });
    expect(config.plugins).toEqual([
      "last-login-plugin",
      "waitlist-plugin",
      "polar-plugin",
      "username-plugin",
      "organization-plugin",
      "passkey-plugin",
      "next-cookies-plugin",
    ]);
  });

  it("trusts same local app loopback aliases for production-like local runs", async () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.NODE_ENV = "production";
    const module = await import("./server");
    const config = betterAuthMock.mock.calls[0][0];

    await expect(
      config.trustedOrigins({
        headers: new Headers({ origin: "http://127.0.0.1:3000" }),
      })
    ).resolves.toContain("http://127.0.0.1:3000");
    await expect(
      config.trustedOrigins({
        headers: new Headers({ origin: "http://127.0.0.1:3001" }),
      })
    ).resolves.not.toContain("http://127.0.0.1:3001");
    expect(module.authRouteHandlers).toEqual({ GET: "GET" });
  });
});
