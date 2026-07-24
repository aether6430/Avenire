import { ingestStoredFile } from "./ingestion/pipeline";
import { PostgresVectorStore } from "./retrieval/postgres-vector-store";
import {
  retrieveRelevantChunks,
  type RetrievalTraceCollector,
} from "./retrieval/retrieve";

export { assertRequiredSecrets } from "./config";

export { ingestStoredFile };
export type { LinkPreview } from "./ingestion/link";
export { extractLinkPreview, ingestLink } from "./ingestion/link";
export { PostgresVectorStore } from "./retrieval/postgres-vector-store";
export type {
  RetrievalQualityCandidate,
  RetrievalQualitySignal,
  RetrievalQualitySignalInput,
} from "./retrieval/quality";
export {
  computeRetrievalQualitySignal,
  logRetrievalQualitySignal,
} from "./retrieval/quality";
export type {
  RetrievalDecisionTelemetry,
  RetrievalTraceCandidate,
  RetrievalTraceCollector,
  RetrievalTraceSnapshot,
  RetrievalTraceStage,
} from "./retrieval/retrieve";
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
  sourceType?:
    | "pdf"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "markdown"
    | "link";
  provider?: string;
  trace?: RetrievalTraceCollector;
}) {
  const vectorStore = new PostgresVectorStore(input.workspaceId);
  return retrieveRelevantChunks(vectorStore, input.query, {
    limit: input.limit,
    // The shared retrieval service can pass a precomputed corpus snapshot.
    userId: input.userId,
    workspaceId: input.workspaceId,
    sourceType: input.sourceType,
    provider: input.provider,
    trace: input.trace,
  });
}

export * from "./ingestion/types";
