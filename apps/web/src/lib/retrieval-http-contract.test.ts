import { Schema } from "effect-v4";
import { describe, expect, it } from "vitest";
import {
  retrievalQueryRequestSchema,
  retrievalQueryResponseSchema,
  retrievalSummaryRequestSchema,
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

  it("validates summary matches and file IDs", () => {
    expect(
      Schema.decodeUnknownSync(retrievalSummaryRequestSchema)({
        fileIds: [WORKSPACE_ID],
        matches: [{ fileId: WORKSPACE_ID, snippet: "Cell division" }],
        query: "mitosis",
        workspaceUuid: WORKSPACE_ID,
      })
    ).toMatchObject({ query: "mitosis" });
  });

  it("rejects query request boundaries", () => {
    const decode = Schema.decodeUnknownSync(retrievalQueryRequestSchema);
    for (const input of [
      { query: "", workspaceUuid: WORKSPACE_ID },
      { query: "a".repeat(2001), workspaceUuid: WORKSPACE_ID },
      { limit: 0, query: "test", workspaceUuid: WORKSPACE_ID },
      { limit: 51, query: "test", workspaceUuid: WORKSPACE_ID },
      { query: "test", workspaceUuid: "not-a-uuid" },
    ]) {
      expect(() => decode(input)).toThrow();
    }
  });

  it("rejects summary collection boundaries", () => {
    const decode = Schema.decodeUnknownSync(retrievalSummaryRequestSchema);
    expect(() =>
      decode({
        matches: Array.from({ length: 25 }, () => ({
          fileId: WORKSPACE_ID,
        })),
        query: "test",
        workspaceUuid: WORKSPACE_ID,
      })
    ).toThrow();
    expect(() =>
      decode({
        fileIds: Array.from({ length: 11 }, () => WORKSPACE_ID),
        query: "test",
        workspaceUuid: WORKSPACE_ID,
      })
    ).toThrow();
  });
});
