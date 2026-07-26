import { Schema } from "effect-v4";

const NonEmptyString = Schema.Trim.check(Schema.isMinLength(1));
const NonNegativeInteger = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0)
);

export class BenchmarkTraceCandidate extends Schema.Class<BenchmarkTraceCandidate>(
  "BenchmarkTraceCandidate"
)({
  chunkId: NonEmptyString,
  score: Schema.Number,
}) {}

export class BenchmarkTraceSnapshot extends Schema.Class<BenchmarkTraceSnapshot>(
  "BenchmarkTraceSnapshot"
)({
  candidates: Schema.Array(BenchmarkTraceCandidate),
  path: Schema.Literals(["fast", "full"]),
  queryKind: Schema.Literals(["original", "expanded", "decomposed", "hyde"]),
  stage: NonEmptyString,
}) {}

export class BenchmarkQueryTrace extends Schema.Class<BenchmarkQueryTrace>(
  "BenchmarkQueryTrace"
)({
  queryId: NonEmptyString,
  durationMs: NonNegativeInteger,
  snapshots: Schema.Array(BenchmarkTraceSnapshot),
}) {}

export class RunMaterializedEvidence extends Schema.Class<RunMaterializedEvidence>(
  "RunMaterializedEvidence"
)({
  evidenceId: NonEmptyString,
  chunkIds: Schema.Array(NonEmptyString),
}) {}

export class BenchmarkRunFailure extends Schema.Class<BenchmarkRunFailure>(
  "BenchmarkRunFailure"
)({
  phase: Schema.Literals(["ingestion", "retrieval", "rerank"]),
  message: NonEmptyString,
  artifactId: Schema.optional(NonEmptyString),
  queryId: Schema.optional(NonEmptyString),
}) {}

export class BenchmarkRun extends Schema.Class<BenchmarkRun>("BenchmarkRun")({
  schemaVersion: Schema.Literal(1),
  runId: NonEmptyString,
  createdAt: NonEmptyString,
  gitSha: NonEmptyString,
  corpusId: NonEmptyString,
  corpusVersion: NonEmptyString,
  modelId: NonEmptyString,
  embeddingModelId: NonEmptyString,
  rerankerModelId: NonEmptyString,
  configurationId: NonEmptyString,
  materializedEvidence: Schema.Array(RunMaterializedEvidence),
  traces: Schema.Array(BenchmarkQueryTrace),
  failures: Schema.Array(BenchmarkRunFailure),
}) {}
