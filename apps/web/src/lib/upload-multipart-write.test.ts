import { randomUUID } from "node:crypto";
import { utimes } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearMultipartParts,
  sweepAbandonedMultipartParts,
} from "./upload-multipart-assembly";
import { getSessionDirectory } from "./upload-multipart-paths";
import {
  MultipartUploadLimitError,
  validateMultipartUsage,
  writeMultipartPart,
} from "./upload-multipart-write";

const sessions: string[] = [];

function stream(bytes: number[]) {
  return new Blob([Uint8Array.from(bytes)]).stream();
}

afterEach(async () => {
  await Promise.all(sessions.splice(0).map(clearMultipartParts));
});

describe("multipart upload accounting", () => {
  it("rejects aggregate exhaustion before assembly", async () => {
    const sessionId = randomUUID();
    sessions.push(sessionId);
    await writeMultipartPart({
      sessionId,
      partNumber: 1,
      maxBytes: 4,
      maxPartCount: 2,
      maxTotalBytes: 6,
      stream: stream([1, 2, 3, 4]),
    });
    await expect(
      writeMultipartPart({
        sessionId,
        partNumber: 2,
        maxBytes: 4,
        maxPartCount: 2,
        maxTotalBytes: 6,
        stream: stream([5, 6, 7]),
      })
    ).rejects.toMatchObject({ code: "UPLOAD_TOTAL_TOO_LARGE" });
  });

  it("rejects a part-count overrun before writing the extra part", async () => {
    const sessionId = randomUUID();
    sessions.push(sessionId);
    await writeMultipartPart({
      sessionId,
      partNumber: 1,
      maxBytes: 4,
      maxPartCount: 1,
      maxTotalBytes: 8,
      stream: stream([1]),
    });
    await expect(
      writeMultipartPart({
        sessionId,
        partNumber: 2,
        maxBytes: 4,
        maxPartCount: 1,
        maxTotalBytes: 8,
        stream: stream([2]),
      })
    ).rejects.toBeInstanceOf(MultipartUploadLimitError);
  });

  it("sweeps abandoned session parts after the configured TTL", async () => {
    const sessionId = randomUUID();
    sessions.push(sessionId);
    await writeMultipartPart({
      sessionId,
      partNumber: 1,
      maxBytes: 4,
      maxPartCount: 1,
      maxTotalBytes: 4,
      stream: stream([1]),
    });
    const old = new Date(Date.now() - 120_000);
    await utimes(getSessionDirectory(sessionId), old, old);
    await expect(
      sweepAbandonedMultipartParts({ ttlMs: 60_000 })
    ).resolves.toContain(sessionId);
  });

  it("keeps per-part accounting validation below the audit budget", () => {
    const iterations = 100_000;
    const startedAt = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      validateMultipartUsage({
        bytesWithoutCurrentPart: index,
        maxPartBytes: 16 * 1024 * 1024,
        maxPartCount: 10_000,
        maxTotalBytes: 2 * 1024 * 1024 * 1024,
        partCountWithoutCurrentPart: 4,
        proposedPartBytes: 1024,
      });
    }
    const averageMs = (performance.now() - startedAt) / iterations;
    expect(averageMs).toBeLessThan(5);
  });
});
