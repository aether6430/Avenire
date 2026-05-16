import { describe, expect, it } from "vitest";
import {
  buildRetrievalSummaryPrompt,
  FALLBACK_SUMMARY,
  resolveRequestedFileIds,
  resolveRetrievalSummaryLimits,
} from "./retrieval-summary-model";

describe("retrieval summary model", () => {
  it("deduplicates requested file ids while preserving priority order", () => {
    expect(
      resolveRequestedFileIds({
        fileIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
        matches: [
          {
            fileId: "22222222-2222-4222-8222-222222222222",
          },
          {
            fileId: "33333333-3333-4333-8333-333333333333",
          },
        ],
        query: "What matters?",
        workspaceUuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      })
    ).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("builds a retrieval prompt that falls back cleanly when no textual evidence exists", () => {
    expect(
      buildRetrievalSummaryPrompt({
        query: "Explain this file",
        textualEvidence: [],
      })
    ).toContain("Retrieved document chunks: none");
  });

  it("clamps retrieval limits from the environment", () => {
    expect(
      resolveRetrievalSummaryLimits({
        RETRIEVAL_SUMMARY_ATTACHMENT_LIMIT: "99",
        RETRIEVAL_SUMMARY_ATTACHMENT_MAX_BYTES: "12",
        RETRIEVAL_SUMMARY_FETCH_TIMEOUT_MS: "1",
      })
    ).toEqual({
      attachmentLimit: 6,
      attachmentMaxBytes: 256_000,
      fetchTimeoutMs: 2000,
    });
    expect(FALLBACK_SUMMARY.length).toBeGreaterThan(20);
  });
});
