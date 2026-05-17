import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createResourceShareLinkMock,
  grantResourceToUserByEmailMock,
  resolveAppBaseUrlMock,
} = vi.hoisted(() => ({
  createResourceShareLinkMock: vi.fn(),
  grantResourceToUserByEmailMock: vi.fn(),
  resolveAppBaseUrlMock: vi.fn(),
}));

vi.mock("@/lib/app-base-url", () => ({
  resolveAppBaseUrl: resolveAppBaseUrlMock,
}));

vi.mock("@/lib/file-data", () => ({
  createResourceShareLink: createResourceShareLinkMock,
  grantResourceToUserByEmail: grantResourceToUserByEmailMock,
}));

import { handleWorkspaceFolderShareGrantsPost } from "./grants/workspace-folder-share-grants-post";
import { handleWorkspaceFolderShareLinkPost } from "./link/workspace-folder-share-link-post";

function createApiLoggerStub() {
  return {
    featureUsed: vi.fn(),
    meter: vi.fn(),
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

function createContext(overrides: Record<string, unknown> = {}) {
  return {
    apiLogger: createApiLoggerStub(),
    folder: {
      folder: {
        name: "Docs",
      },
    },
    folderUuid: "folder-1",
    user: {
      id: "user-1",
    },
    workspaceUuid: "workspace-1",
    ...overrides,
  } as never;
}

describe("workspace folder share route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAppBaseUrlMock.mockReturnValue("https://avenire.app");
    createResourceShareLinkMock.mockResolvedValue({
      token: "token-123",
    });
    grantResourceToUserByEmailMock.mockResolvedValue({
      email: "friend@example.com",
      permission: "editor",
    });
  });

  it("creates public folder share links and logs successful creation", async () => {
    const context = createContext();
    const response = await handleWorkspaceFolderShareLinkPost({
      ...context,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/folders/folder-1/share/link",
        { method: "POST" }
      ),
    });

    expect(createResourceShareLinkMock).toHaveBeenCalledWith({
      allowPublic: true,
      createdBy: "user-1",
      expiresInDays: 7,
      resourceId: "folder-1",
      resourceType: "folder",
      workspaceId: "workspace-1",
    });
    await expect(response.json()).resolves.toEqual({
      link: {
        token: "token-123",
      },
      shareUrl: "https://avenire.app/share/token-123",
    });
    expect(context.apiLogger.requestSucceeded).toHaveBeenCalledWith(200, {
      folderUuid: "folder-1",
      workspaceUuid: "workspace-1",
    });
  });

  it("fails closed for missing grant emails and returns successful folder grants", async () => {
    const missingEmailContext = createContext();
    const missingEmailResponse = await handleWorkspaceFolderShareGrantsPost({
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
    const successResponse = await handleWorkspaceFolderShareGrantsPost({
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
      resourceId: "folder-1",
      resourceType: "folder",
      workspaceId: "workspace-1",
    });
    expect(createResourceShareLinkMock).toHaveBeenCalledWith({
      allowPublic: false,
      createdBy: "user-1",
      expiresInDays: 7,
      resourceId: "folder-1",
      resourceType: "folder",
      workspaceId: "workspace-1",
    });
    expect(successResponse.status).toBe(201);
    await expect(successResponse.json()).resolves.toEqual({
      emailSent: false,
      grant: {
        email: "friend@example.com",
        permission: "editor",
      },
      shareUrl: "https://avenire.app/share/token-123",
    });
  });

  it("returns not found when the grant target does not exist", async () => {
    grantResourceToUserByEmailMock.mockResolvedValueOnce(null);

    const context = createContext();
    const response = await handleWorkspaceFolderShareGrantsPost({
      ...context,
      request: {
        json: vi.fn().mockResolvedValue({ email: "friend@example.com" }),
      } as never,
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "User not found",
    });
  });
});
