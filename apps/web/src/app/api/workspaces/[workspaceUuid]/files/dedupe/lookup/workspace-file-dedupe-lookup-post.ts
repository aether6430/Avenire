import { NextResponse } from "next/server";
import { getFileAssetByContentHash } from "@/lib/file-data";
import {
  buildWorkspaceFileDedupeLookupResult,
  resolveWorkspaceFileDedupeLookupRequest,
} from "./workspace-file-dedupe-lookup-model";

export async function handleWorkspaceFileDedupeLookupPost(input: {
  request: Request;
  workspaceUuid: string;
}) {
  const parsed = resolveWorkspaceFileDedupeLookupRequest(
    await input.request.json().catch(() => ({}))
  );
  if (!parsed) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const results = await Promise.all(
    parsed.files.map(async (item) => {
      const existing = await getFileAssetByContentHash(
        input.workspaceUuid,
        item.hashSha256
      );

      return buildWorkspaceFileDedupeLookupResult({
        clientUploadId: item.clientUploadId,
        existing,
      });
    })
  );

  return NextResponse.json({ ok: true, results });
}
