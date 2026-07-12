import { Schema } from "effect-v4";
import { describe, expect, it } from "vitest";
import {
  parseJsonRequest,
  serializeJsonRequestError,
  InvalidJsonRequest,
  InvalidRequestPayload,
  RequestAborted,
} from "./api-request";

const requestSchema = Schema.Struct({
  count: Schema.Number,
  name: Schema.String,
});

function jsonRequest(body: string, signal?: AbortSignal) {
  return new Request("https://avenire.test/api/example", {
    body,
    method: "POST",
    signal,
  });
}

describe("parseJsonRequest", () => {
  it("decodes a valid JSON body through its schema", async () => {
    await expect(
      parseJsonRequest(
        jsonRequest(JSON.stringify({ count: 2, name: "notes" })),
        requestSchema,
        { requestId: "request-1", route: "/api/example" }
      )
    ).resolves.toEqual({
      data: { count: 2, name: "notes" },
      success: true,
    });
  });

  it("returns the stable invalid-json failure for malformed JSON", async () => {
    await expect(parseJsonRequest(jsonRequest("{"), requestSchema)).resolves.toEqual(
      {
        reason: "invalid-json",
        success: false,
      }
    );
  });

  it("returns the stable invalid-payload failure for schema errors", async () => {
    await expect(
      parseJsonRequest(
        jsonRequest(JSON.stringify({ count: "two", name: "notes" })),
        requestSchema
      )
    ).resolves.toEqual({
      reason: "invalid-payload",
      success: false,
    });
  });

  it("preserves request cancellation as an aborted request failure", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      parseJsonRequest(
        jsonRequest(JSON.stringify({ count: 2, name: "notes" }), controller.signal),
        requestSchema
      )
    ).resolves.toEqual({
      reason: "request-aborted",
      success: false,
    });
  });
});

describe("serializeJsonRequestError", () => {
  it.each([
    [InvalidJsonRequest.make({}), "invalid-json"],
    [InvalidRequestPayload.make({}), "invalid-payload"],
    [RequestAborted.make({}), "request-aborted"],
  ])("redacts %s to its stable public reason", (error, reason) => {
    expect(serializeJsonRequestError(error)).toEqual({
      reason,
      success: false,
    });
  });
});
