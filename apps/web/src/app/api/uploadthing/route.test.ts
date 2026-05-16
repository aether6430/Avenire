import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("/api/uploadthing route", () => {
  beforeEach(() => {
    createRouteHandlerMock.mockReset();
    getHandler.mockClear();
    postHandler.mockClear();
    createRouteHandlerMock.mockReturnValue({
      GET: getHandler,
      POST: postHandler,
    });
  });

  it("wires the shared upload router into the storage route handler and re-exports the resulting GET and POST handlers", async () => {
    const route = await import("./route");

    expect(createRouteHandlerMock).toHaveBeenCalledWith({
      router: uploadRouter,
    });

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
});
