import {
  queryWorkspace,
  warmWorkspace,
  type RetrievalMode,
  type WorkspaceRetrievalQuery,
  type WorkspaceRetrievalResponse,
} from "@avenire/ingestion";

export type { RetrievalMode };

export interface RetrievalRequest extends WorkspaceRetrievalQuery {}

export interface RetrievalResponse extends WorkspaceRetrievalResponse {}

export async function retrieveWorkspaceChunksShared(
  input: RetrievalRequest
): Promise<RetrievalResponse> {
  return queryWorkspace(input);
}

export async function warmRetrievalCacheForWorkspace(input: {
  chunkCount?: number;
  fileId?: string | null;
  jobId?: string | null;
  resourceCount?: number;
  workspaceId: string;
}) {
  return warmWorkspace(input);
}
