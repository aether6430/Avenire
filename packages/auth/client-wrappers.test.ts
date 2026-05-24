import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createAuthClientMock = vi.fn();
const passkeyClientMock = vi.fn(() => "passkey-plugin");
const polarClientMock = vi.fn(() => "polar-plugin");
const organizationClientMock = vi.fn(() => "organization-plugin");
const usernameClientMock = vi.fn(() => "username-plugin");
const lastLoginMethodClientMock = vi.fn(() => "last-login-plugin");

vi.mock("better-auth/react", () => ({
  createAuthClient: createAuthClientMock,
}));

vi.mock("@better-auth/passkey/client", () => ({
  passkeyClient: passkeyClientMock,
}));

vi.mock("@polar-sh/better-auth/client", () => ({
  polarClient: polarClientMock,
}));

vi.mock("better-auth/client/plugins", () => ({
  lastLoginMethodClient: lastLoginMethodClientMock,
  organizationClient: organizationClientMock,
  usernameClient: usernameClientMock,
}));

const sharedClient = {
  $ERROR_CODES: { SAMPLE: true },
  changePassword: vi.fn(),
  checkout: vi.fn(),
  customer: {
    portal: vi.fn(),
    state: vi.fn(),
    subscriptions: {
      list: vi.fn(),
    },
  },
  deleteUser: vi.fn(),
  getLastUsedLoginMethod: vi.fn(),
  getSession: vi.fn(),
  linkSocial: vi.fn(),
  listAccounts: vi.fn(),
  listSessions: vi.fn(),
  passkey: {
    addPasskey: vi.fn(),
  },
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeSessions: vi.fn(),
  sendVerificationEmail: vi.fn(),
  signIn: {
    email: vi.fn(),
    passkey: vi.fn(),
    social: vi.fn(),
  },
  signOut: vi.fn(),
  signUp: {
    email: vi.fn(),
  },
  unlinkAccount: vi.fn(),
  updateUser: vi.fn(),
  useSession: vi.fn(),
};

const clientSource = readFileSync(
  resolve(import.meta.dirname, "./client.ts"),
  "utf8"
);

describe("@avenire/auth client wrappers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.avenire.test";
    createAuthClientMock.mockReturnValue(sharedClient);
  });

  it("configures the main client with the expected plugins and exports", async () => {
    const module = await import("./client");

    expect(organizationClientMock).toHaveBeenCalledTimes(1);
    expect(passkeyClientMock).toHaveBeenCalledTimes(1);
    expect(usernameClientMock).toHaveBeenCalledTimes(1);
    expect(lastLoginMethodClientMock).toHaveBeenCalledTimes(1);
    expect(createAuthClientMock).toHaveBeenCalledWith({
      baseURL: "https://app.avenire.test",
      plugins: [
        "organization-plugin",
        "passkey-plugin",
        "username-plugin",
        "last-login-plugin",
        "polar-plugin",
      ],
    });
    expect(module.authClient.checkout).toBe(sharedClient.checkout);
    expect(module.authClient.customer).toBe(sharedClient.customer);
    expect(module.authClient.getLastUsedLoginMethod).toBe(
      sharedClient.getLastUsedLoginMethod
    );
    expect(module.$ERROR_CODES).toBe(sharedClient.$ERROR_CODES);
    expect(module.signIn).toEqual(sharedClient.signIn);
    expect(module.signUp).toEqual(sharedClient.signUp);
    expect(module.signOut).toBe(sharedClient.signOut);
    expect(module.getSession).toBe(sharedClient.getSession);
    expect(module.useSession).toBe(sharedClient.useSession);
    expect(module.linkSocial).toBe(sharedClient.linkSocial);
    expect(module.listAccounts).toBe(sharedClient.listAccounts);
    expect(module.listSessions).toBe(sharedClient.listSessions);
    expect(module.updateUser).toBe(sharedClient.updateUser);
    expect(module.revokeOtherSessions).toBe(sharedClient.revokeOtherSessions);
  });

  it("keeps passkey registration owned by the main client module with the Avenire label", async () => {
    const module = await import("./client");

    await module.addPasskey();

    expect(clientSource).toContain("export async function addPasskey()");
    expect(createAuthClientMock).toHaveBeenCalledWith({
      baseURL: "https://app.avenire.test",
      plugins: [
        "organization-plugin",
        "passkey-plugin",
        "username-plugin",
        "last-login-plugin",
        "polar-plugin",
      ],
    });
    expect(sharedClient.passkey.addPasskey).toHaveBeenCalledWith({
      name: "Avenire Passkey",
    });
    expect(
      existsSync(resolve(import.meta.dirname, "./passkey-client.ts"))
    ).toBe(false);
  });

  it("does not keep a second app-client wrapper once the main client owns the public helpers directly", () => {
    expect(existsSync(resolve(import.meta.dirname, "./app-client.ts"))).toBe(
      false
    );
  });
});
