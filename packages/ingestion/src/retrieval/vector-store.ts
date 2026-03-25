export interface VectorSearchFilter {
  provider?: string;
  sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
}

export interface SearchOptions {
  filter?: VectorSearchFilter;
  limit: number;
}

export interface VectorSearchResult {
  chunkId: string;
  chunkIndex: number;
  content: string;
  contentHash: string | null;
  endMs: number | null;
  fileId: string | null;
  metadata: Record<string, unknown>;
  page: number | null;
  provider: string | null;
  resourceId: string;
  score: number;
  source: string;
  sourceType: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
  startMs: number | null;
  title: string | null;
}

export interface CorpusStats {
  chunks: number;
  embeddings: number;
  resources: number;
}

export interface VectorStore {
  corpusStats(): Promise<CorpusStats>;
  getAdjacentChunks(input: {
    after?: number;
    before?: number;
    chunkIndex: number;
    resourceId: string;
  }): Promise<VectorSearchResult[]>;
  search(
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<VectorSearchResult[]>;
  searchLexical(
    query: string,
    options: SearchOptions
  ): Promise<VectorSearchResult[]>;
  searchTrigram(
    query: string,
    options: SearchOptions
  ): Promise<VectorSearchResult[]>;
}
