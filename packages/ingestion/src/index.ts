import { ingestStoredFile } from "./ingestion/pipeline";
import { PostgresVectorStore } from "./retrieval/postgres-vector-store";
import { retrieveRelevantChunks } from "./retrieval/retrieve";

export { assertRequiredSecrets } from "./config";

export { ingestStoredFile };
export { extractLinkPreview, ingestLink } from "./ingestion/link";
export { PostgresVectorStore } from "./retrieval/postgres-vector-store";
export type { RetrievalDecisionTelemetry } from "./retrieval/retrieve";
export {
  normalizeRetrievalQuery,
  retrieveRelevantChunks,
  retrieveRelevantChunksAdaptive,
} from "./retrieval/retrieve";
export type {
  RetrievalMode,
  RetrievalSourceType,
  WorkspaceRetrievalQuery,
  WorkspaceRetrievalResponse,
  WorkspaceRetrievalWarmupInput,
} from "./workspace-retrieval";
export {
  queryWorkspace,
  warmWorkspace,
} from "./workspace-retrieval";

export async function retrieveWorkspaceChunks(input: {
  workspaceId: string;
  userId?: string;
  query: string;
  limit?: number;
  sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
  provider?: string;
}) {
  const vectorStore = new PostgresVectorStore(input.workspaceId);
  return retrieveRelevantChunks(vectorStore, input.query, {
    limit: input.limit,
    // The shared retrieval service can pass a precomputed corpus snapshot.
    userId: input.userId,
    workspaceId: input.workspaceId,
    sourceType: input.sourceType,
    provider: input.provider,
  });
}

export * from "./ingestion/types";
