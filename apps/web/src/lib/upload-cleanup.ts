import { readdir, readFile, rm, stat } from "node:fs/promises";
import { deleteStorageFiles } from "@avenire/storage";
import {
  getProviderObjectMarkerPath,
  getSessionDirectory,
  MULTIPART_ROOT_DIR,
} from "./upload-multipart-paths";

export async function sweepAbandonedUploadArtifacts(input?: {
  nowMs?: number;
  ttlMs?: number;
}) {
  const configuredTtl = Number.parseInt(
    process.env.UPLOAD_SESSION_CLEANUP_TTL_SECONDS ?? "",
    10
  );
  const ttlMs = Math.max(
    60_000,
    input?.ttlMs ??
      (Number.isFinite(configuredTtl) && configuredTtl > 0
        ? configuredTtl * 1000
        : 24 * 60 * 60 * 1000)
  );
  const nowMs = input?.nowMs ?? Date.now();
  const entries = await readdir(MULTIPART_ROOT_DIR, { withFileTypes: true }).catch(
    () => []
  );
  const removedSessionIds: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-zA-Z0-9-_]+$/.test(entry.name)) continue;
    const directory = getSessionDirectory(entry.name);
    const info = await stat(directory).catch(() => null);
    if (!info || nowMs - info.mtimeMs < ttlMs) continue;
    const storageKey = await readFile(
      getProviderObjectMarkerPath(entry.name),
      "utf8"
    ).catch(() => null);
    if (storageKey?.trim() && process.env.UPLOADTHING_TOKEN) {
      await deleteStorageFiles([storageKey.trim()]);
    }
    await rm(directory, { recursive: true, force: true });
    removedSessionIds.push(entry.name);
  }
  return removedSessionIds.sort();
}
