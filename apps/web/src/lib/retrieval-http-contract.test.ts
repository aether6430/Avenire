import { Schema } from "effect-v4";
import { describe, expect, it } from "vitest";
import {
  retrievalQueryRequestSchema,
  retrievalQueryResponseSchema,
} from "./retrieval-http-contract";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";

describe("retrieval HTTP contracts", () => {
  it("normalizes bounded query inputs", () => {
    expect(
      Schema.decodeUnknownSync(retrievalQueryRequestSchema)({
        provider: "  notes  ",
        query: "  photosynthesis  ",
        workspaceUuid: WORKSPACE_ID,
      })
    ).toMatchObject({
      provider: "notes",
      query: "photosynthesis",
    });
  });

  it("accepts the retrieval result fields used by browser consumers", () => {
    const parsed = retrievalQueryResponseSchema.safeParse({
      cache: "miss",
      results: [
        {
          chunkId: "chunk-1",
          content: "Cell division",
          fileId: "file-1",
          page: 2,
          score: 0.91,
          sourceType: "pdf",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects malformed success payloads", () => {
    expect(
      retrievalQueryResponseSchema.safeParse({ results: [{ score: "high" }] })
        .success
    ).toBe(false);
  });
});
