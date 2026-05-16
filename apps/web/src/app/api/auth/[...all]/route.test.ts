import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
