import { NextResponse } from "next/server";
import { getFileAssetByContentHash } from "@/lib/file-data";
import { parseJsonRequest, unknownJsonRequestSchema } from "@/lib/api-request";
import {
  buildWorkspaceFileDedupeLookupResult,
  resolveWorkspaceFileDedupeLookupRequest,
  resolveWorkspaceFileDedupeLookupRouteError,
  WORKSPACE_FILE_DEDUPE_LOOKUP_ERROR,
} from "./workspace-file-dedupe-lookup-model";

export async function handleWorkspaceFileDedupeLookupPost(input: {
  request: Request;
  workspaceUuid: string;
}) {
  try {
    const requestBody = await parseJsonRequest(input.request, unknownJsonRequestSchema);
    if (!requestBody.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const parsed = resolveWorkspaceFileDedupeLookupRequest(requestBody.data);
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
