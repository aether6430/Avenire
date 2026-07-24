import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Schema } from "effect-v4";
import { BenchmarkCorpusManifest, BenchmarkDataset } from "../domain";

const root = resolve(import.meta.dirname, "../../data");
const manifestPath = resolve(root, "manifest.json");
const datasetPath = resolve(root, "dataset.json");
const course18065 =
  "https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/";
const course1803 =
  "https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/";

const files = [
  [
    "mit-18065-lecture-1-captions",
    "MIT 18.065 lecture 1: Column space of A",
    "local/lectures/18.065-spring-2018/static_resources/0d25417bbdce4b511a57862dcd44f96a_YiqIkSHSmyc.srt",
    "video",
    "srt",
    "application/x-subrip",
    course18065,
  ],
  [
    "mit-18065-lecture-6-captions",
    "MIT 18.065 lecture 6: Singular value decomposition",
    "local/lectures/18.065-spring-2018/static_resources/e5828c3ec7520050fe4ca533c3efa91c_rYz83XPxiZo.srt",
    "video",
    "srt",
    "application/x-subrip",
    course18065,
  ],
  [
    "mit-18065-lecture-25-captions",
    "MIT 18.065 lecture 25: Stochastic gradient descent",
    "local/lectures/18.065-spring-2018/static_resources/bca9549562cd13b0b19e8603c9dcbbcd_k3AiUhwHQ28.srt",
    "video",
    "srt",
    "application/x-subrip",
    course18065,
  ],
  [
    "mit-1803-session-13-notes",
    "MIT 18.03SC session 13: Exponential response notes",
    "local/lectures/18.03sc-fall-2011/static_resources/7e212064ad281d00e1dac893b1f722a7_MIT18_03SCF11_s13_2text.pdf",
    "pdf",
    "pdf-native",
    "application/pdf",
    course1803,
  ],
  [
    "mit-1803-session-31-applications",
    "MIT 18.03SC session 31: Linear systems applications",
    "local/lectures/18.03sc-fall-2011/static_resources/a302fcccb14ae5b187325f413b736ebf_MIT18_03SCF11_s31_5appl.pdf",
    "pdf",
    "pdf-native",
    "application/pdf",
    course1803,
  ],
  [
    "mit-18065-zoom-notes",
    "MIT 18.065 matrix methods zoom notes",
    "local/lectures/18.065-spring-2018/static_resources/b66b4601b216993e72b862fc0243281d_MIT18_065S18_ZoomNotes.pdf",
    "pdf",
    "pdf-native",
    "application/pdf",
    course18065,
  ],
  [
    "mit-18065-lecture-6-transcript",
    "MIT 18.065 lecture 6 transcript PDF",
    "local/lectures/18.065-spring-2018/static_resources/e6d220ed61ce3b1ebe002c67e04b63dd_rYz83XPxiZo.pdf",
    "pdf",
    "pdf-native",
    "application/pdf",
    course18065,
  ],
] as const;

const timestampCases = [
  [
    "column-space",
    "mit-18065-lecture-1-captions",
    553_400,
    560_460,
    "At roughly 9:15 in lecture 1, what name is given to all vectors Ax?",
    "The columns of A span its column space.",
  ],
  [
    "independent-columns",
    "mit-18065-lecture-1-captions",
    823_030,
    825_550,
    "What property of the two columns is mentioned near 13:44 in lecture 1?",
    "The example has two independent columns.",
  ],
  [
    "column-basis",
    "mit-18065-lecture-1-captions",
    954_290,
    961_080,
    "Near 15:57, what do the two columns form for the column space?",
    "Two independent columns form a basis for the column space.",
  ],
  [
    "svd-start",
    "mit-18065-lecture-6-captions",
    468_550,
    472_330,
    "What topic gets a fresh start at about 7:50 in lecture 6?",
    "The lecture begins a fresh treatment of singular value decomposition.",
  ],
  [
    "svd-orthogonal",
    "mit-18065-lecture-6-captions",
    578_680,
    583_540,
    "Around 9:40 in the SVD lecture, what kind of vectors v is Strang seeking?",
    "The construction seeks orthogonal right singular vectors.",
  ],
  [
    "svd-rank-one",
    "mit-18065-lecture-6-captions",
    840_930,
    843_100,
    "What rank do the component matrices have near 14:02 in the SVD lecture?",
    "SVD terms are rank-one matrices.",
  ],
  [
    "sgd-heart",
    "mit-18065-lecture-25-captions",
    909_500,
    914_240,
    "What stochastic optimization idea is emphasized around 15:12?",
    "Randomly selecting component gradients is central to SGD.",
  ],
  [
    "sgd-minibatch",
    "mit-18065-lecture-25-captions",
    2_667_680,
    2_669_690,
    "Which SGD variant is introduced at about 44:28?",
    "The lecture introduces the mini-batch variant.",
  ],
  [
    "sgd-batch-one",
    "mit-18065-lecture-25-captions",
    2_717_490,
    2_721_000,
    "What does a mini-batch of size one reduce to near 45:19?",
    "A mini-batch of size one is vanilla SGD.",
  ],
  [
    "sgd-large-batch",
    "mit-18065-lecture-25-captions",
    2_814_710,
    2_818_280,
    "What batch-size choice is discussed around 46:56?",
    "The lecture discusses the appeal of very large mini-batches.",
  ],
] as const;

const queryCases = [
  [
    "formula-bayes-denominator",
    "In the normalized Bayesian update, which integral forms the denominator?",
    "formula-chart",
    ["bayes-normalized-equation"],
  ],
  [
    "formula-nernst-charge",
    "Where does ionic charge z appear in the Nernst expression?",
    "formula-chart",
    ["biology-nernst-equation"],
  ],
  [
    "formula-relax-predecessor",
    "Write the relaxation minimum and state when the predecessor changes.",
    "formula-chart",
    ["graphs-relax-equation"],
  ],
  [
    "formula-carnot-ratio",
    "Using the Carnot equation, what efficiency follows from 600 K and 300 K?",
    "formula-chart",
    ["thermo-carnot-equation"],
  ],
  [
    "cross-graphs-climate",
    "Give the graph relaxation identifier and the climate calibration identifier.",
    "cross-file",
    ["graphs-relax", "climate-calibration"],
  ],
  [
    "cross-biology-thermo",
    "Which identifier names direct ATP transport, and which names the reversible heat-engine limit?",
    "cross-file",
    ["biology-active", "thermo-carnot-id"],
  ],
  [
    "cross-equations-one",
    "Compare the Bayesian posterior equation with the climate proxy calibration equation.",
    "cross-file",
    ["bayes-normalized-equation", "climate-calibration-equation"],
  ],
  [
    "cross-equations-two",
    "Retrieve both the Nernst equilibrium formula and shortest-path relaxation update.",
    "cross-file",
    ["biology-nernst-equation", "graphs-relax-equation"],
  ],
  [
    "cross-method-caveats",
    "What caveat applies to prior choice and what caveat applies to repeated wire reports?",
    "cross-file",
    ["bayes-prior-sensitivity", "history-wire-dependence"],
  ],
  [
    "cross-energy-paths",
    "Relate secondary active transport's energy source to the Carnot temperature limit.",
    "cross-file",
    ["biology-secondary-active", "thermo-carnot-equation"],
  ],
  [
    "cross-ordering-evidence",
    "Find the DAG ordering condition and the warning about source proximity.",
    "cross-file",
    ["graphs-dag-negative", "history-criticism"],
  ],
  [
    "cross-office-eval",
    "Use the Word allocation target together with the presentation's distinction between MRR and nDCG.",
    "cross-file",
    ["office-docx-allocation", "office-pptx-metrics"],
  ],
  [
    "cross-colbert-sheet",
    "Combine ColBERT residual compression with the spreadsheet's recorded run score.",
    "cross-file",
    ["external-colbert-compression", "office-xlsx-apollo-score"],
  ],
  [
    "hop-gradient-transport",
    "How do indirectly powered transport and sensitivity to assumptions each depend on upstream state?",
    "multi-hop",
    ["biology-secondary-active", "bayes-prior-sensitivity"],
  ],
  [
    "hop-dag-corroboration",
    "Connect topological ordering in a DAG with independence when corroborating reports.",
    "multi-hop",
    ["graphs-dag-negative", "history-wire-dependence"],
  ],
  [
    "hop-proxy-prior",
    "How do calibration uncertainty and prior sensitivity play analogous roles?",
    "multi-hop",
    ["climate-calibration-equation", "bayes-prior-sensitivity"],
  ],
  [
    "hop-entropy-membrane",
    "Combine the isolated-system entropy direction with membrane transport's energy source.",
    "multi-hop",
    ["thermo-entropy", "biology-secondary-active"],
  ],
  [
    "hop-colbert-graph",
    "Relate ColBERT residual compression to retaining evidence for graph relaxation.",
    "multi-hop",
    ["external-colbert-compression", "graphs-relax-equation"],
  ],
  [
    "hop-office-ranking",
    "Use the spreadsheet score and slide definitions to explain what that run number can show.",
    "multi-hop",
    ["office-xlsx-apollo-score", "office-pptx-metrics"],
  ],
  [
    "hop-climate-history",
    "Why must proxy records and repeated newspaper reports both be checked for dependence?",
    "multi-hop",
    ["climate-tree", "history-wire-dependence"],
  ],
  [
    "hop-screening-source-two",
    "What shared reasoning error affects a medical test and a source close to an event?",
    "multi-hop",
    ["bayes-screening", "history-criticism"],
  ],
  [
    "para-bayes-two",
    "How can an analyst test whether posterior conclusions hinge on the assumed prior?",
    "paraphrase",
    ["bayes-prior-sensitivity"],
  ],
  [
    "para-dag-two",
    "Which acyclic ordering lets shortest paths tolerate edges below zero?",
    "paraphrase",
    ["graphs-dag-negative"],
  ],
  [
    "para-wire-two",
    "Why do many papers carrying the same dispatch not count as independent witnesses?",
    "paraphrase",
    ["history-wire-dependence"],
  ],
] as const;

const negatives = [
  "What value does the corpus give for the Hubble constant?",
  "Which treaty ended the Thirty Years War?",
  "What dosage of amoxicillin is recommended?",
  "Who won the 2032 Olympic marathon?",
  "What is the ISBN of the cited topology textbook?",
  "Which volcano erupted on 14 March 1847?",
  "What password protects the allocation spreadsheet?",
  "What was the closing price of AAPL yesterday?",
  "Which lecture explains the Krebs cycle?",
] as const;

const main = async () => {
  const manifest = Schema.decodeUnknownSync(BenchmarkCorpusManifest)(
    JSON.parse(await readFile(manifestPath, "utf8"))
  );
  const dataset = Schema.decodeUnknownSync(BenchmarkDataset)(
    JSON.parse(await readFile(datasetPath, "utf8"))
  );
  const artifacts = await Promise.all(
    files.map(
      async ([id, title, path, sourceType, format, mimeType, canonicalUrl]) => {
        const bytes = await readFile(resolve(root, path));
        return {
          id,
          title,
          domain: "mathematics",
          sourceType,
          format,
          path,
          mimeType,
          byteSize: bytes.byteLength,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          license: "CC-BY-NC-SA-4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
          creator: "MIT OpenCourseWare",
          canonicalUrl,
          attribution: "MIT OpenCourseWare lecture archive",
          redistribution: "manifest-only",
        };
      }
    )
  );
  const artifactIds = new Set<string>(artifacts.map((item) => item.id));
  const evidence = timestampCases.map(
    ([slug, artifactId, startMs, endMs, , description]) => ({
      id: `mit-${slug}`,
      artifactId,
      modality: "video-transcript",
      locator: { kind: "time", startMs, endMs },
      description,
    })
  );
  const queries: unknown[] = [];
  const judgments: unknown[] = [];
  const add = (
    id: string,
    text: string,
    family: string,
    evidenceIds: readonly string[],
    sourceType?: string
  ) => {
    const queryId = `q-v03-${id}`;
    queries.push({
      id: queryId,
      text,
      family,
      domain: "mathematics",
      split: "test",
      sourceType,
      requiredEvidenceGroups: evidenceIds.map((evidenceId) => [evidenceId]),
    });
    evidenceIds.forEach((evidenceId) =>
      judgments.push({
        queryId,
        evidenceId,
        grade: 3,
        assessor: "benchmark-team-v0.3",
        rationale:
          "Adjudicated evidence for the version 0.3 benchmark expansion.",
      })
    );
  };
  timestampCases.forEach(([slug, , , , text]) =>
    add(`time-${slug}`, text, "timestamp", [`mit-${slug}`], "video")
  );
  queryCases.forEach(([slug, text, family, evidenceIds]) =>
    add(slug, text, family, evidenceIds)
  );
  negatives.forEach((text, index) =>
    add(`unanswerable-${index + 1}`, text, "unanswerable", [])
  );
  const queryIds = new Set(
    queries.flatMap(
      (item) =>
        Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))(item).id
    )
  );
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const nextManifest = Schema.decodeUnknownSync(BenchmarkCorpusManifest)({
    ...manifest,
    version: "0.3.0",
    artifacts: [
      ...manifest.artifacts.filter((item) => !artifactIds.has(item.id)),
      ...artifacts,
    ],
  });
  const nextDataset = Schema.decodeUnknownSync(BenchmarkDataset)({
    ...dataset,
    version: "0.3.0",
    evidence: [
      ...dataset.evidence.filter((item) => !evidenceIds.has(item.id)),
      ...evidence,
    ],
    queries: [
      ...dataset.queries.filter((item) => !queryIds.has(item.id)),
      ...queries,
    ],
    judgments: [
      ...dataset.judgments.filter((item) => !queryIds.has(item.queryId)),
      ...judgments,
    ],
  });
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`),
    writeFile(datasetPath, `${JSON.stringify(nextDataset, null, 2)}\n`),
  ]);
  process.stdout.write(
    `${JSON.stringify({ version: nextManifest.version, artifacts: nextManifest.artifacts.length, queries: nextDataset.queries.length, evidence: nextDataset.evidence.length }, null, 2)}\n`
  );
};

await main();
