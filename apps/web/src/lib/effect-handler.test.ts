import { Effect, Schema } from "effect-v4";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logger = vi.hoisted(() => ({
  requestFailed: vi.fn(),
  requestStarted: vi.fn(),
  requestSucceeded: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: () => logger,
}));

import {
  ApiInternalError,
  ApiUnauthorized,
  runApiHandler,
  serializeApiHandlerError,
} from "./effect-handler";

const Result = Schema.Struct({ count: Schema.Number });
const request = () => new Request("https://avenire.test/api/example");

describe("runApiHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a schema-validated success and records completion", async () => {
    const response = await runApiHandler(
      request(),
      Effect.succeed({ count: 2 }),
      { feature: "test", route: "/api/example", successSchema: Result }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 2 });
    expect(logger.requestSucceeded).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ durationMs: expect.any(Number) })
    );
  });

  it("serializes typed failures without exposing their tag", async () => {
    const response = await runApiHandler(
      request(),
      Effect.fail(ApiUnauthorized.make({ message: "Unauthorized" })),
      { feature: "test", route: "/api/example", successSchema: Result }
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchInlineSnapshot(`
      {
        "error": "Unauthorized",
      }
    `);
  });

  it("redacts defects and invalid success values", async () => {
    const defectResponse = await runApiHandler(
      request(),
      Effect.die("private database credentials"),
      { feature: "test", route: "/api/example", successSchema: Result }
    );
    const invalidResponse = await runApiHandler(
      request(),
      Effect.succeed({ count: "not-a-number" }),
      { feature: "test", route: "/api/example", successSchema: Result }
    );

    await expect(defectResponse.json()).resolves.toEqual({
      error: "Internal server error",
    });
    await expect(invalidResponse.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });

  it("preserves host cancellation as a distinct public status", async () => {
    const controller = new AbortController();
    controller.abort();
    const cancelledRequest = new Request(
      "https://avenire.test/api/example",
      { signal: controller.signal }
    );

    const response = await runApiHandler(
      cancelledRequest,
      Effect.never,
      { feature: "test", route: "/api/example", successSchema: Result }
    );

    expect(response.status).toBe(499);
    await expect(response.json()).resolves.toEqual({ error: "Request cancelled" });
  });
});

describe("serializeApiHandlerError", () => {
  it("keeps the public error contract stable", () => {
    expect(
      serializeApiHandlerError(
        ApiInternalError.make({ message: "Internal server error" })
      )
    ).toMatchInlineSnapshot(`
      {
        "body": ApiErrorResponse {
          "error": "Internal server error",
        },
        "status": 500,
      }
    `);
  });
});
