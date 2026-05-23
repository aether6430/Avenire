import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getHandler = vi.fn(() => new Response("auth get ok"));
const postHandler = vi.fn(() => new Response("auth post ok"));

vi.mock("@avenire/auth/server", () => ({
  authRouteHandlers: {
    GET: getHandler,
    POST: postHandler,
  },
}));

describe("/api/auth/[...all] route", () => {
  beforeEach(() => {
    getHandler.mockClear();
    postHandler.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("re-exports the shared auth handlers as a force-dynamic route", async () => {
    const route = await import("./route");

    expect(route.dynamic).toBe("force-dynamic");

    const getResponse = await route.GET(
      new Request("http://localhost:3003/api/auth/session")
    );
    expect(await getResponse.text()).toBe("auth get ok");

    const postResponse = await route.POST(
      new Request("http://localhost:3003/api/auth/sign-in", {
        method: "POST",
      })
    );
    expect(await postResponse.text()).toBe("auth post ok");
  });

  it("logs billing-provider auth requests and responses for customer and checkout paths", async () => {
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const route = await import("./route");

    const getResponse = await route.GET(
      new Request("http://localhost:3003/api/auth/customer/session")
    );
    expect(await getResponse.text()).toBe("auth get ok");

    const postResponse = await route.POST(
      new Request("http://localhost:3003/api/auth/checkout", {
        method: "POST",
      })
    );
    expect(await postResponse.text()).toBe("auth post ok");

    expect(infoSpy).toHaveBeenCalledWith(
      "[api/auth] billing provider request",
      {
        method: "GET",
        pathname: "/api/auth/customer/session",
        search: "",
      }
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[api/auth] billing provider response",
      {
        elapsedMs: expect.any(Number),
        method: "GET",
        pathname: "/api/auth/customer/session",
        status: 200,
      }
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[api/auth] billing provider request",
      {
        method: "POST",
        pathname: "/api/auth/checkout",
        search: "",
      }
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[api/auth] billing provider response",
      {
        elapsedMs: expect.any(Number),
        method: "POST",
        pathname: "/api/auth/checkout",
        status: 200,
      }
    );
  });

  it("logs response bodies for provider routes that return 500s", async () => {
    const infoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    postHandler.mockImplementationOnce(
      () => new Response("provider failure", { status: 500 })
    );
    const route = await import("./route");

    const response = await route.POST(
      new Request("http://localhost:3003/api/auth/checkout", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    expect(infoSpy).toHaveBeenCalledWith(
      "[api/auth] billing provider response",
      {
        elapsedMs: expect.any(Number),
        method: "POST",
        pathname: "/api/auth/checkout",
        status: 500,
      }
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[api/auth] provider route returned 500",
      {
        body: "provider failure",
        method: "POST",
        pathname: "/api/auth/checkout",
        status: 500,
      }
    );
  });
});
