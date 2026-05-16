import { UTApi } from "@avenire/storage";
import { NextResponse } from "next/server";
import {
  permanentlyDeleteFileAsset,
  permanentlyDeleteFolder,
  restoreFileAsset,
  restoreFolder,
} from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  filterWorkspaceTrashStorageKeys,
  isValidWorkspaceTrashDeletePayload,
  isValidWorkspaceTrashRestorePayload,
  type WorkspaceTrashMutationBody,
} from "./workspace-trash-route-model";

export type { WorkspaceTrashMutationBody };

export async function deleteWorkspaceTrashStorageObjects(
  storageKeys: string[]
) {
  const deletableKeys = filterWorkspaceTrashStorageKeys(storageKeys);

  if (deletableKeys.length === 0 || !process.env.UPLOADTHING_TOKEN) {
    return;
  }

  try {
    const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
    await utapi.deleteFiles(deletableKeys);
  } catch {
    // Best effort cleanup.
  }
}

export async function handleWorkspaceTrashRouteRestore(input: {
  body: WorkspaceTrashMutationBody;
  workspaceUuid: string;
}) {
  if (!isValidWorkspaceTrashRestorePayload(input.body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results: Array<{ id: string; kind: "file" | "folder"; ok: boolean }> =
    [];

  for (const item of input.body.items) {
    if (item.kind === "file") {
      const ok = await restoreFileAsset(input.workspaceUuid, item.id);
      results.push({ id: item.id, kind: item.kind, ok });
      continue;
    }

    const ok = await restoreFolder(input.workspaceUuid, item.id);
    results.push({ id: item.id, kind: item.kind, ok });
  }

  if (results.some((entry) => entry.ok)) {
    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    });
  }

  return NextResponse.json({ ok: true, results });
}

export async function handleWorkspaceTrashRouteDelete(input: {
  body: WorkspaceTrashMutationBody;
  workspaceUuid: string;
}) {
  if (!isValidWorkspaceTrashDeletePayload(input.body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results: Array<{ id: string; kind: "file" | "folder"; ok: boolean }> =
    [];
  const storageKeys: string[] = [];

  for (const item of input.body.items) {
    if (item.kind === "file") {
      const deleted = await permanentlyDeleteFileAsset(
        input.workspaceUuid,
        item.id
      );
      if (deleted?.storageKeys?.length) {
        storageKeys.push(...deleted.storageKeys);
      }
      results.push({ id: item.id, kind: item.kind, ok: Boolean(deleted) });
      continue;
    }

    const keys = await permanentlyDeleteFolder(input.workspaceUuid, item.id);
    storageKeys.push(...keys);
    results.push({ id: item.id, kind: item.kind, ok: true });
  }

  await deleteWorkspaceTrashStorageObjects(Array.from(new Set(storageKeys)));

  if (results.some((entry) => entry.ok)) {
    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    });
  }

  return NextResponse.json({ ok: true, results });
}
