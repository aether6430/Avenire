import {
  queryWorkspace,
  type RetrievalMode,
  type WorkspaceRetrievalQuery,
  type WorkspaceRetrievalResponse,
  warmWorkspace,
} from "@avenire/ingestion/workspace-retrieval";

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
