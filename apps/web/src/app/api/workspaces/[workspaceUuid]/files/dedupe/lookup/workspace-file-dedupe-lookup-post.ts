import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api-request";
import { getFileAssetByContentHash } from "@/lib/file-data";
import {
  buildWorkspaceFileDedupeLookupResult,
  normalizeWorkspaceFileDedupeLookupRequest,
  resolveWorkspaceFileDedupeLookupRouteError,
  WORKSPACE_FILE_DEDUPE_LOOKUP_ERROR,
  workspaceFileDedupeLookupRequestSchema,
} from "./workspace-file-dedupe-lookup-model";

export async function handleWorkspaceFileDedupeLookupPost(input: {
  request: Request;
  workspaceUuid: string;
}) {
  try {
    const requestBody = await parseJsonRequest(
      input.request,
      workspaceFileDedupeLookupRequestSchema
    );
    if (!requestBody.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const parsed = normalizeWorkspaceFileDedupeLookupRequest(requestBody.data);

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
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileDedupeLookupRouteError(
          error,
          WORKSPACE_FILE_DEDUPE_LOOKUP_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
