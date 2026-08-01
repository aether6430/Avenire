# Avenire retrieval benchmark

This private workspace package defines the reproducible offline evaluation contract for Avenire's retrieval engine. It keeps judged relevance independent of generated answers and scores the production retrieval stages separately.

## Current pilot

Version `0.1.0` contains:

- six 400–530 word, self-authored Markdown lessons across physics, biology, statistics, computer science, climate science, and history;
- a CC BY arXiv retrieval paper;
- a CC0 scientific diagram;
- two evidence-bearing excerpts from a CC BY-SA lecture video;
- a one-minute excerpt from a public-domain historical speech;
- deterministic Word, PowerPoint, and Excel fixtures;
- stable evidence locators, graded qrels, multi-evidence queries, an unanswerable query, and judged LaTeX equations.

The pilot currently has 14 artifacts, 38 evidence targets, and 41 judged queries. That clears the 40-query gate only for an overall comparison; narrower strength claims remain unsupported until their slices grow.

Large external files are checksum-pinned in `data/manifest.json`, fetched into ignored `data/.cache/`, and never silently accepted when bytes or licensing metadata drift. Media excerpts are derived with deterministic, bit-exact `ffmpeg` stream copies. The materialized cache is about 19 MB instead of retaining the 46 MB full video and audio sources.

## Commands

```bash
pnpm --filter @avenire/retrieval-benchmark corpus:fetch
pnpm --filter @avenire/retrieval-benchmark corpus:expand-arxiv
pnpm --filter @avenire/retrieval-benchmark corpus:generate
pnpm --filter @avenire/retrieval-benchmark corpus:ingest-controlled -- --user-email you@example.com
pnpm --filter @avenire/retrieval-benchmark validate:data
pnpm --filter @avenire/retrieval-benchmark test
pnpm --filter @avenire/retrieval-benchmark check-types
pnpm --filter @avenire/retrieval-benchmark lint
pnpm --filter @avenire/retrieval-benchmark report:run ./run.json ./report.json
pnpm --filter @avenire/retrieval-benchmark run:controlled
```

`corpus:expand-arxiv` queries the official arXiv Atom API across information
retrieval, machine learning, mathematical optimization, and quantum physics. It
pins 44 versioned PDFs by URL, byte size, and SHA-256, bringing the controlled
manifest to 58 files and the controlled-plus-database catalog to 70 files. These
papers are initially distractor documents; they do not receive synthetic qrels.

## Evaluation contract

1. `data/manifest.json` fixes corpus identity, item-level license, source URL, byte size, and SHA-256.
2. `data/dataset.json` defines queries, stable source evidence, graded relevance, and required evidence groups.
3. Ingestion produces run-specific chunks.
4. `materializeEvidence` maps stable page, slide, sheet, time, text, or document locators to those chunks. Missing evidence remains unmatched and is reported as an ingestion failure.
5. The production retriever emits optional trace snapshots for dense, lexical, trigram, modality, fusion, reranking, and final stages.
6. `executeBenchmarkRun` records all selected queries through an injected production retriever service without aborting the run when one query fails.
7. `evaluateQueryTrace` converts evidence judgments into chunk qrels and computes stage-level Recall@k, Precision@k, MRR@10, nDCG@k, average precision, and all-evidence success.
8. `buildBenchmarkReport` produces stage-level slices for domain, query family, source type, file format, and evidence modality.
9. `classifyStrength` labels sufficiently sized slices as dominant, strong, competitive, weak, or unsupported using versioned quality and uncertainty thresholds.

The current pilot is a foundation, not the final v1 corpus. The v1 target remains 240 artifacts and at least 720 double-judged queries, with no published strength claim below 40 queries per slice.

## Local database supplement

`corpus:import-db` creates a private, git-ignored supplement from PDFs and videos that already have retrievable resources in the configured Avenire database. It pins source bytes by size and SHA-256, reuses valid downloads, and reports stale storage objects instead of adding broken artifacts. Files without ingested chunks are excluded because they cannot support stable qrels.

The current database snapshot adds 11 long scientific and technical PDFs plus one MIT lecture video. Its 20 manually reviewed queries cover LaTeX equations, table extraction, page retrieval, timestamp retrieval, paraphrases, multi-hop questions, cross-file questions, and an unanswerable control. Run it read-only against production retrieval with:

```bash
pnpm --filter @avenire/retrieval-benchmark corpus:import-db
pnpm --filter @avenire/retrieval-benchmark run:database
```

`run:database` materializes page and timestamp evidence against existing database chunks, invokes the full production query-expansion, HyDE, hybrid-search, and reranking path sequentially, and writes ignored run and report JSON under `data/local/runs/`.
