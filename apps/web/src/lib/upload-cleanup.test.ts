import { randomUUID } from "node:crypto";
import { mkdir, utimes, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const { deleteStorageFilesMock } = vi.hoisted(() => ({
  deleteStorageFilesMock: vi.fn(),
}));

vi.mock("@avenire/storage", () => ({
  deleteStorageFiles: deleteStorageFilesMock,
}));

import { sweepAbandonedUploadArtifacts } from "./upload-cleanup";
import { clearMultipartParts } from "./upload-multipart-assembly";
import {
  getProviderObjectMarkerPath,
  getSessionDirectory,
} from "./upload-multipart-paths";

const sessions: string[] = [];

afterEach(async () => {
  deleteStorageFilesMock.mockReset();
  await Promise.all(sessions.splice(0).map(clearMultipartParts));
});

describe("abandoned upload cleanup", () => {
  it("deletes provider objects and local parts after TTL expiry", async () => {
    process.env.UPLOADTHING_TOKEN = "test-token";
    const sessionId = randomUUID();
    sessions.push(sessionId);
    await mkdir(getSessionDirectory(sessionId), { recursive: true });
    await writeFile(getProviderObjectMarkerPath(sessionId), "provider-key-1");
    const old = new Date(Date.now() - 120_000);
    await utimes(getSessionDirectory(sessionId), old, old);

    await expect(
      sweepAbandonedUploadArtifacts({ ttlMs: 60_000 })
    ).resolves.toContain(sessionId);
    expect(deleteStorageFilesMock).toHaveBeenCalledWith(["provider-key-1"]);
  });
});
