import { createResilientPostHogFetch } from "@avenire/observability";
import { describe, expect, it, vi } from "vitest";

describe("createResilientPostHogFetch", () => {
  it("passes successful analytics requests through", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const transport = createResilientPostHogFetch({ fetchImpl });

    const response = await transport("https://example.test/batch", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("absorbs network failures and opens a bounded circuit", async () => {
    let time = 1000;
    const onUnavailable = vi.fn();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValue(new Response(null, { status: 200 }));
    const transport = createResilientPostHogFetch({
      cooldownMs: 5000,
      fetchImpl,
      now: () => time,
      onUnavailable,
    });

    await expect(
      transport("https://example.test/batch")
    ).resolves.toMatchObject({ status: 202 });
    await expect(
      transport("https://example.test/batch")
    ).resolves.toMatchObject({ status: 202 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(onUnavailable).toHaveBeenCalledOnce();

    time += 5000;
    await expect(
      transport("https://example.test/batch")
    ).resolves.toMatchObject({ status: 200 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("absorbs non-success responses without SDK error logging", async () => {
    const onUnavailable = vi.fn();
    const transport = createResilientPostHogFetch({
      fetchImpl: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 503 })),
      onUnavailable,
    });

    const response = await transport("https://example.test/batch");

    expect(response.status).toBe(202);
    expect(onUnavailable).toHaveBeenCalledOnce();
  });
});
