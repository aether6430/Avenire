import { Schema } from "effect-v4";

const NonEmptyString = Schema.Trim.check(Schema.isMinLength(1));
const NonNegativeInteger = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0)
);
const PositiveInteger = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThan(0)
);

export const benchmarkSourceTypeSchema = Schema.Literals([
  "pdf",
  "image",
  "video",
  "audio",
  "document",
  "markdown",
  "link",
]);

export const benchmarkFileFormatSchema = Schema.Literals([
  "pdf-native",
  "pdf-scanned",
  "png",
  "jpeg",
  "svg",
  "mp3",
  "wav",
  "ogg",
  "mp4",
  "webm",
  "srt",
  "vtt",
  "docx",
  "pptx",
  "xlsx",
  "markdown",
  "text",
  "html",
]);

export const queryFamilySchema = Schema.Literals([
  "direct-fact",
  "paraphrase",
  "exact-identifier",
  "table-cell",
  "formula-chart",
  "timestamp",
  "visual-only",
  "cross-file",
  "multi-hop",
  "near-duplicate",
  "conflicting-revision",
  "source-filtered",
  "unanswerable",
]);

export const evidenceModalitySchema = Schema.Literals([
  "text",
  "table",
  "image",
  "audio-transcript",
  "video-transcript",
  "video-keyframe",
  "mixed",
]);

export const evidenceLocatorSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("document"),
  }),
  Schema.Struct({
    kind: Schema.Literal("page"),
    page: PositiveInteger,
  }),
  Schema.Struct({
    kind: Schema.Literal("slide"),
    slide: PositiveInteger,
  }),
  Schema.Struct({
    kind: Schema.Literal("sheet"),
    sheet: NonEmptyString,
    cell: Schema.optional(NonEmptyString),
  }),
  Schema.Struct({
    kind: Schema.Literal("time"),
    startMs: NonNegativeInteger,
    endMs: NonNegativeInteger,
  }),
  Schema.Struct({
    kind: Schema.Literal("text"),
    needle: NonEmptyString,
  }),
]);

export const benchmarkDerivationSchema = Schema.Struct({
  kind: Schema.Literal("media-clip"),
  startMs: NonNegativeInteger,
  endMs: PositiveInteger,
  serialOffset: Schema.optional(NonNegativeInteger),
});

export class BenchmarkArtifact extends Schema.Class<BenchmarkArtifact>(
  "BenchmarkArtifact"
)({
  id: NonEmptyString,
  title: NonEmptyString,
  domain: NonEmptyString,
  sourceType: benchmarkSourceTypeSchema,
  format: benchmarkFileFormatSchema,
  path: NonEmptyString,
  mimeType: NonEmptyString,
  byteSize: PositiveInteger,
  sha256: NonEmptyString,
  license: NonEmptyString,
  licenseUrl: NonEmptyString,
  creator: NonEmptyString,
  canonicalUrl: Schema.optional(NonEmptyString),
  downloadUrl: Schema.optional(NonEmptyString),
  upstreamByteSize: Schema.optional(PositiveInteger),
  upstreamSha256: Schema.optional(NonEmptyString),
  derivation: Schema.optional(benchmarkDerivationSchema),
  attribution: NonEmptyString,
  redistribution: Schema.Literals(["allowed", "manifest-only"]),
}) {}

export class BenchmarkCorpusManifest extends Schema.Class<BenchmarkCorpusManifest>(
  "BenchmarkCorpusManifest"
)({
  schemaVersion: Schema.Literal(1),
  corpusId: NonEmptyString,
  version: NonEmptyString,
  artifacts: Schema.Array(BenchmarkArtifact),
}) {}

export class BenchmarkEvidence extends Schema.Class<BenchmarkEvidence>(
  "BenchmarkEvidence"
)({
  id: NonEmptyString,
  artifactId: NonEmptyString,
  modality: evidenceModalitySchema,
  locator: evidenceLocatorSchema,
  description: NonEmptyString,
}) {}

export class BenchmarkQuery extends Schema.Class<BenchmarkQuery>(
  "BenchmarkQuery"
)({
  id: NonEmptyString,
  text: NonEmptyString,
  family: queryFamilySchema,
  domain: NonEmptyString,
  split: Schema.Literals(["development", "test"]),
  sourceType: Schema.optional(benchmarkSourceTypeSchema),
  requiredEvidenceGroups: Schema.Array(Schema.Array(NonEmptyString)),
}) {}

export class RelevanceJudgment extends Schema.Class<RelevanceJudgment>(
  "RelevanceJudgment"
)({
  queryId: NonEmptyString,
  evidenceId: NonEmptyString,
  grade: Schema.Literals([0, 1, 2, 3]),
  assessor: NonEmptyString,
  rationale: NonEmptyString,
}) {}

export class BenchmarkDataset extends Schema.Class<BenchmarkDataset>(
  "BenchmarkDataset"
)({
  schemaVersion: Schema.Literal(1),
  version: Schema.optional(NonEmptyString),
  evidence: Schema.Array(BenchmarkEvidence),
  queries: Schema.Array(BenchmarkQuery),
  judgments: Schema.Array(RelevanceJudgment),
}) {}

export type BenchmarkSourceType = typeof benchmarkSourceTypeSchema.Type;
export type EvidenceLocator = typeof evidenceLocatorSchema.Type;
export type QueryFamily = typeof queryFamilySchema.Type;
