import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createResourceShareLinkMock,
  grantResourceToUserByEmailMock,
  resolveAppBaseUrlMock,
  sendFileShareEmailMock,
} = vi.hoisted(() => ({
  createResourceShareLinkMock: vi.fn(),
  grantResourceToUserByEmailMock: vi.fn(),
  resolveAppBaseUrlMock: vi.fn(),
  sendFileShareEmailMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  sendFileShareEmail: sendFileShareEmailMock,
}));

vi.mock("@/lib/app-base-url", () => ({
  resolveAppBaseUrl: resolveAppBaseUrlMock,
}));

vi.mock("@/lib/file-data", () => ({
  createResourceShareLink: createResourceShareLinkMock,
  grantResourceToUserByEmail: grantResourceToUserByEmailMock,
}));

import { handleWorkspaceFileShareGrantsPost } from "./grants/workspace-file-share-grants-post";
import { handleWorkspaceFileShareLinkPost } from "./link/workspace-file-share-link-post";

function createApiLoggerStub() {
  return {
    error: vi.fn(),
    featureUsed: vi.fn(),
    meter: vi.fn(),
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    apiLogger: createApiLoggerStub(),
    file: {
      name: "Plan.md",
    },
    fileUuid: "file-1",
    user: {
      id: "user-1",
      name: "Owner",
    },
    workspaceUuid: "workspace-1",
    ...overrides,
  } as never;
}

describe("workspace file share route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAppBaseUrlMock.mockReturnValue("https://avenire.app");
    grantResourceToUserByEmailMock.mockResolvedValue({
      email: "friend@example.com",
      permission: "editor",
    });
    createResourceShareLinkMock.mockResolvedValue({
      token: "token-123",
    });
    sendFileShareEmailMock.mockResolvedValue(undefined);
  });

  it("creates public file share links and logs successful creation", async () => {
    const context = createContext();
    const response = await handleWorkspaceFileShareLinkPost({
      ...context,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/files/file-1/share/link",
        { method: "POST" }
      ),
    });

    expect(createResourceShareLinkMock).toHaveBeenCalledWith({
      allowPublic: true,
      createdBy: "user-1",
      expiresInDays: 7,
      resourceId: "file-1",
      resourceType: "file",
      workspaceId: "workspace-1",
    });
    await expect(response.json()).resolves.toEqual({
      link: {
        token: "token-123",
      },
      shareUrl: "https://avenire.app/share/token-123",
    });
    expect(context.apiLogger.requestSucceeded).toHaveBeenCalledWith(200, {
      fileUuid: "file-1",
      workspaceUuid: "workspace-1",
    });
  });

  it("fails closed for missing grant emails and returns viewer/editor grants with email delivery", async () => {
    const missingEmailContext = createContext();
    const missingEmailResponse = await handleWorkspaceFileShareGrantsPost({
      ...missingEmailContext,
      request: {
        json: vi.fn().mockResolvedValue({ email: "   ", permission: "editor" }),
      } as never,
    });

    expect(missingEmailResponse.status).toBe(400);
    await expect(missingEmailResponse.json()).resolves.toEqual({
      error: "Missing email",
    });

    const successContext = createContext();
    const successResponse = await handleWorkspaceFileShareGrantsPost({
      ...successContext,
      request: {
        json: vi.fn().mockResolvedValue({
          email: "  friend@example.com  ",
          permission: "editor",
        }),
      } as never,
    });

    expect(grantResourceToUserByEmailMock).toHaveBeenCalledWith({
      createdBy: "user-1",
      email: "friend@example.com",
      permission: "editor",
      resourceId: "file-1",
      resourceType: "file",
      workspaceId: "workspace-1",
    });
    expect(createResourceShareLinkMock).toHaveBeenCalledWith({
      allowPublic: false,
      createdBy: "user-1",
      expiresInDays: 7,
      resourceId: "file-1",
      resourceType: "file",
      workspaceId: "workspace-1",
    });
    expect(sendFileShareEmailMock).toHaveBeenCalledWith({
      fileName: "Plan.md",
      shareUrl: "https://avenire.app/share/token-123",
      sharedByName: "Owner",
      toEmail: "friend@example.com",
    });
    expect(successResponse.status).toBe(201);
    await expect(successResponse.json()).resolves.toEqual({
      emailSent: true,
      grant: {
        email: "friend@example.com",
        permission: "editor",
      },
      shareUrl: "https://avenire.app/share/token-123",
    });
  });

  it("returns not found for missing users and tolerates email delivery failures", async () => {
    grantResourceToUserByEmailMock.mockResolvedValueOnce(null);
    const missingUserContext = createContext();
    const missingUserResponse = await handleWorkspaceFileShareGrantsPost({
      ...missingUserContext,
      request: {
        json: vi.fn().mockResolvedValue({ email: "friend@example.com" }),
      } as never,
    });

    expect(missingUserResponse.status).toBe(404);
    await expect(missingUserResponse.json()).resolves.toEqual({
      error: "User not found",
    });

    sendFileShareEmailMock.mockRejectedValueOnce(new Error("smtp down"));
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const emailFailureContext = createContext();
    const emailFailureResponse = await handleWorkspaceFileShareGrantsPost({
      ...emailFailureContext,
      request: {
        json: vi.fn().mockResolvedValue({ email: "friend@example.com" }),
      } as never,
    });

    expect(emailFailureContext.apiLogger.error).toHaveBeenCalledWith(
      "error.integration",
      expect.objectContaining({
        action: "sendFileShareEmail",
        integration: "email",
      })
    );
    await expect(emailFailureResponse.json()).resolves.toEqual({
      emailSent: false,
      grant: {
        email: "friend@example.com",
        permission: "editor",
      },
      shareUrl: "https://avenire.app/share/token-123",
    });
    logSpy.mockRestore();
  });
});
