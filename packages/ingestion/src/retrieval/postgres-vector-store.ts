import {
  db,
  ingestionChunk,
  ingestionEmbedding,
  ingestionResource,
  retrieveAdjacentChunksForResource,
  retrieveWorkspaceChunks,
  retrieveWorkspaceChunksLexical,
  retrieveWorkspaceChunksTrigram,
} from "@avenire/database";
import { eq, sql } from "drizzle-orm";
import type {
  CorpusStats,
  SearchOptions,
  VectorSearchResult,
  VectorStore,
} from "./vector-store";

const TRANSIENT_DATABASE_ERROR =
  /timeout exceeded when trying to connect|connection terminated unexpectedly|connection reset|econnreset|econnrefused|ehostunreach|etimedout/i;
const DATABASE_READ_ATTEMPTS = 2;

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

function isTransientDatabaseError(error: unknown): boolean {
  let current: unknown = error;

  while (current && typeof current === "object") {
    const message =
      current instanceof Error
        ? current.message
        : "message" in current && typeof current.message === "string"
          ? current.message
          : "";
    if (TRANSIENT_DATABASE_ERROR.test(message)) {
      return true;
    }
    current = "cause" in current ? current.cause : null;
  }

  return false;
}

async function withTransientDatabaseRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DATABASE_READ_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (
        attempt >= DATABASE_READ_ATTEMPTS ||
        !isTransientDatabaseError(error)
      ) {
        throw error;
      }
      await wait(150 * attempt);
    }
  }

  throw lastError;
}

function mapSearchResult(
  row: Awaited<ReturnType<typeof retrieveWorkspaceChunks>>[number]
): VectorSearchResult {
  return {
    resourceId: String(row.resourceId),
    fileId: (row.fileId as string | null) ?? null,
    sourceType: row.sourceType as VectorSearchResult["sourceType"],
    source: String(row.source),
    provider: (row.provider as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    chunkId: String(row.chunkId),
    chunkIndex: Number(row.chunkIndex),
    contentHash: (row.contentHash as string | null) ?? null,
    page: row.page === null ? null : Number(row.page),
    startMs: row.startMs === null ? null : Number(row.startMs),
    endMs: row.endMs === null ? null : Number(row.endMs),
    content: String(row.content),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    score: Number(row.score) || 0,
  };
}

export class PostgresVectorStore implements VectorStore {
  private readonly workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  async search(
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<VectorSearchResult[]> {
    const rows = await withTransientDatabaseRetry(() =>
      retrieveWorkspaceChunks({
        workspaceId: this.workspaceId,
        queryEmbedding,
        limit: options.limit,
        sourceType: options.filter?.sourceType,
        provider: options.filter?.provider,
      })
    );

    return rows.map(mapSearchResult);
  }

  async searchLexical(
    query: string,
    options: SearchOptions
  ): Promise<VectorSearchResult[]> {
    const rows = await withTransientDatabaseRetry(() =>
      retrieveWorkspaceChunksLexical({
        workspaceId: this.workspaceId,
        query,
        limit: options.limit,
        sourceType: options.filter?.sourceType,
        provider: options.filter?.provider,
      })
    );

    return rows.map((row) => ({
      resourceId: String(row.resourceId),
      fileId: (row.fileId as string | null) ?? null,
      sourceType: row.sourceType as VectorSearchResult["sourceType"],
      source: String(row.source),
      provider: (row.provider as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      chunkId: String(row.chunkId),
      chunkIndex: Number(row.chunkIndex),
      contentHash: (row.contentHash as string | null) ?? null,
      page: row.page === null ? null : Number(row.page),
      startMs: row.startMs === null ? null : Number(row.startMs),
      endMs: row.endMs === null ? null : Number(row.endMs),
      content: String(row.content),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      score: Number(row.score) || 0,
    }));
  }

  async searchTrigram(
    query: string,
    options: SearchOptions
  ): Promise<VectorSearchResult[]> {
    const rows = await withTransientDatabaseRetry(() =>
      retrieveWorkspaceChunksTrigram({
        workspaceId: this.workspaceId,
        query,
        limit: options.limit,
        sourceType: options.filter?.sourceType,
        provider: options.filter?.provider,
      })
    );

    return rows.map((row) => ({
      resourceId: String(row.resourceId),
      fileId: (row.fileId as string | null) ?? null,
      sourceType: row.sourceType as VectorSearchResult["sourceType"],
      source: String(row.source),
      provider: (row.provider as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      chunkId: String(row.chunkId),
      chunkIndex: Number(row.chunkIndex),
      contentHash: (row.contentHash as string | null) ?? null,
      page: row.page === null ? null : Number(row.page),
      startMs: row.startMs === null ? null : Number(row.startMs),
      endMs: row.endMs === null ? null : Number(row.endMs),
      content: String(row.content),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      score: Number(row.score) || 0,
    }));
  }

  async getAdjacentChunks(input: {
    after?: number;
    before?: number;
    chunkIndex: number;
    resourceId: string;
  }): Promise<VectorSearchResult[]> {
    const rows = await withTransientDatabaseRetry(() =>
      retrieveAdjacentChunksForResource({
        after: input.after,
        before: input.before,
        chunkIndex: input.chunkIndex,
        resourceId: input.resourceId,
        workspaceId: this.workspaceId,
      })
    );

    return rows.map((row) => ({
      resourceId: String(row.resourceId),
      fileId: (row.fileId as string | null) ?? null,
      sourceType: row.sourceType as VectorSearchResult["sourceType"],
      source: String(row.source),
      provider: (row.provider as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      chunkId: String(row.chunkId),
      chunkIndex: Number(row.chunkIndex),
      contentHash: (row.contentHash as string | null) ?? null,
      page: row.page === null ? null : Number(row.page),
      startMs: row.startMs === null ? null : Number(row.startMs),
      endMs: row.endMs === null ? null : Number(row.endMs),
      content: String(row.content),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      score: Number(row.score) || 0,
    }));
  }

  async corpusStats(): Promise<CorpusStats> {
    const [resourceCountRow, chunkCountRow, embeddingCountRow] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(ingestionResource)
          .where(eq(ingestionResource.workspaceId, this.workspaceId))
          .then((rows) => rows[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(ingestionChunk)
          .innerJoin(
            ingestionResource,
            eq(ingestionResource.id, ingestionChunk.resourceId)
          )
          .where(eq(ingestionResource.workspaceId, this.workspaceId))
          .then((rows) => rows[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(ingestionEmbedding)
          .innerJoin(
            ingestionChunk,
            eq(ingestionChunk.id, ingestionEmbedding.chunkId)
          )
          .innerJoin(
            ingestionResource,
            eq(ingestionResource.id, ingestionChunk.resourceId)
          )
          .where(eq(ingestionResource.workspaceId, this.workspaceId))
          .then((rows) => rows[0]?.count ?? 0),
      ]);

    return {
      resources: resourceCountRow,
      chunks: chunkCountRow,
      embeddings: embeddingCountRow,
    };
  }
}
