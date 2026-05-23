import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createRouteHandlerMock, uploadRouter } = vi.hoisted(() => ({
  createRouteHandlerMock: vi.fn(),
  uploadRouter: { media: { maxFileCount: 8 } },
}));

const getHandler = vi.fn(() => new Response("get ok"));
const postHandler = vi.fn(() => new Response("post ok"));

vi.mock("@avenire/storage", () => ({
  createRouteHandler: createRouteHandlerMock,
}));

vi.mock("@/lib/upload", () => ({
  router: uploadRouter,
}));

const uploadRouteSource = readFileSync(
  resolve(import.meta.dirname, "route.ts"),
  "utf8"
);
const uploadLibSource = readFileSync(
  resolve(import.meta.dirname, "../../../lib/upload.ts"),
  "utf8"
);
const uploadErrorMessageSource = readFileSync(
  resolve(import.meta.dirname, "../../../lib/upload-error-message.ts"),
  "utf8"
);

describe("/api/uploadthing route", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalCallbackUrl = process.env.UPLOADTHING_CALLBACK_URL;

  beforeEach(() => {
    vi.resetModules();
    createRouteHandlerMock.mockReset();
    getHandler.mockClear();
    postHandler.mockClear();
    process.env.NEXT_PUBLIC_APP_URL = "https://avenire.space";
    process.env.UPLOADTHING_CALLBACK_URL = "";
    createRouteHandlerMock.mockReturnValue({
      GET: getHandler,
      POST: postHandler,
    });
  });

  it("wires the shared upload router into the storage route handler and re-exports the resulting GET and POST handlers", async () => {
    const route = await import("./route");

    expect(createRouteHandlerMock).toHaveBeenCalledWith({
      config: {
        callbackUrl: "https://avenire.space/api/uploadthing",
      },
      router: uploadRouter,
    });
    expect(route.runtime).toBe("nodejs");

    const getResponse = await route.GET(
      new Request("http://localhost:3003/api/uploadthing") as NextRequest
    );
    expect(await getResponse.text()).toBe("get ok");

    const postResponse = await route.POST(
      new Request("http://localhost:3003/api/uploadthing", {
        method: "POST",
      }) as NextRequest
    );
    expect(await postResponse.text()).toBe("post ok");
  });

  it("prefers an explicit uploadthing callback url when provided", async () => {
    process.env.UPLOADTHING_CALLBACK_URL =
      "https://tunnel.example.com/api/uploadthing/";

    await import("./route");

    expect(createRouteHandlerMock).toHaveBeenCalledWith({
      config: {
        callbackUrl: "https://tunnel.example.com/api/uploadthing",
      },
      router: uploadRouter,
    });
  });

  it("fails closed when the delegated uploadthing handlers throw", async () => {
    getHandler.mockImplementationOnce(() => {
      throw new Error("uploadthing get offline");
    });
    postHandler.mockImplementationOnce(() => {
      throw new Error("uploadthing post offline");
    });

    const route = await import("./route");

    const getResponse = await route.GET(
      new Request("http://localhost:3003/api/uploadthing") as NextRequest
    );
    expect(getResponse.status).toBe(500);
    await expect(getResponse.json()).resolves.toEqual({
      error: "uploadthing get offline",
    });

    const postResponse = await route.POST(
      new Request("http://localhost:3003/api/uploadthing", {
        method: "POST",
      }) as NextRequest
    );
    expect(postResponse.status).toBe(500);
    await expect(postResponse.json()).resolves.toEqual({
      error: "uploadthing post offline",
    });
  });

  it("keeps uploadthing routing on the shared upload router and the extracted upload error helper", () => {
    expect(uploadRouteSource).toContain('from "@/lib/upload"');
    expect(uploadRouteSource).toContain("const handlers = createRouteHandler");
    expect(uploadRouteSource).toContain("return await handlers.GET(request)");
    expect(uploadRouteSource).toContain("return await handlers.POST(request)");

    expect(uploadLibSource).toContain(
      'export { getUploadErrorMessage } from "@/lib/upload-error-message";'
    );
    expect(uploadLibSource).toContain("export const router: FileRouter = {");
    expect(uploadLibSource).not.toContain("interface UploadThingError");
    expect(uploadLibSource).not.toContain("UPLOADTHING_ERROR_CODES");

    expect(uploadErrorMessageSource).toContain("interface UploadThingError");
    expect(uploadErrorMessageSource).toContain("UPLOADTHING_ERROR_CODES");
    expect(uploadErrorMessageSource).toContain("getUploadErrorMessage");
  });

  afterEach(() => {
    if (originalAppUrl === undefined) {
      Reflect.deleteProperty(process.env, "NEXT_PUBLIC_APP_URL");
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }

    if (originalCallbackUrl === undefined) {
      Reflect.deleteProperty(process.env, "UPLOADTHING_CALLBACK_URL");
      return;
    }

    process.env.UPLOADTHING_CALLBACK_URL = originalCallbackUrl;
  });
});
