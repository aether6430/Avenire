export type IngestSourceType =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "markdown"
  | "link";

export type ChunkKind =
  | "concept"
  | "intuition"
  | "derivation"
  | "proof"
  | "example"
  | "mistake"
  | "visualization"
  | "generic";

export interface CanonicalChunk {
  chunkIndex: number;
  content: string;
  embeddingInput?:
    | { type: "text"; text: string }
    | {
        type: "multimodal";
        content: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: string }
          | { type: "image_base64"; image_base64: string; mimeType?: string }
        >;
      };
  kind: ChunkKind;
  metadata: {
    page?: number;
    startMs?: number;
    endMs?: number;
    sourceType: IngestSourceType;
    source: string;
    provider?: string;
    topic?: string;
    difficulty?: "beginner" | "intermediate" | "advanced";
    prerequisites?: string[];
    modality?: "text" | "image" | "video" | "mixed";
    extra?: Record<string, unknown>;
  };
}

export interface CanonicalResource {
  chunks: CanonicalChunk[];
  metadata?: Record<string, unknown>;
  provider?: string;
  source: string;
  sourceType: IngestSourceType;
  title?: string;
}

export interface IngestPdfInput {
  includeImageBase64?: boolean;
  type: "pdf";
  urls: string[];
}

export interface IngestImageInput {
  base64?: string;
  contextText?: string;
  title?: string;
  type: "image";
  url?: string;
}

export interface IngestVideoInput {
  keyframes?: Array<{
    timestampMs: number;
    imageBase64?: string;
    imageMimeType?: string;
    labels?: string[];
    ocrText?: string;
    caption?: string;
  }>;
  title?: string;
  transcript?: string;
  type: "video";
  url?: string;
}

export interface IngestMarkdownInput {
  markdown: string;
  source?: string;
  title?: string;
  type: "markdown";
}

export interface IngestLinkInput {
  type: "link";
  url: string;
}

export type IngestInput =
  | IngestPdfInput
  | IngestImageInput
  | IngestVideoInput
  | IngestMarkdownInput
  | IngestLinkInput;

export interface IngestResponse {
  resources: Array<{
    resourceId: string;
    sourceType: IngestSourceType;
    source: string;
    provider?: string;
    chunks: number;
  }>;
}
