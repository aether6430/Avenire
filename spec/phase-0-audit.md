# Phase 0 Audit

## Retrieval logging

Retrieval decision logging is now emitted from:

- `packages/ingestion/src/retrieval/retrieve.ts`
- `apps/web/src/app/api/ai/retrieval/query/route.ts`

The logs capture:

- query shape,
- confidence score,
- ambiguity flags,
- cache hit/miss,
- expansion usage,
- rerank usage,
- latency,
- top result source-type mix,
- context truncation.

## Misconception lifecycle logging

Lifecycle logging is now emitted from:

- `apps/web/src/lib/session-summaries.ts`
- `apps/web/src/lib/chat-tools/index.ts`
- `packages/database/src/learning-data.ts`

The logs capture:

- candidate created,
- candidate rejected,
- candidate promoted,
- candidate decayed,
- confirmed misconception injected,
- confirmed misconception resolved.

## `body.context` audit

Grepped with:

```bash
rg -n "body\\.context|context\\s*:\\s*body\\.context|\\.context\\b" apps packages -g '!**/node_modules/**'
```

Findings:

- Direct caller: `apps/web/src/app/api/chat/route.ts`
- `body.context` is trimmed and merged into the prompt context alongside detected subject context and recent session summary context.
- No other direct `body.context` call sites were found in `apps/` or `packages/`.

Downstream assumption:

- `body.context` is treated as optional plain text prompt augmentation, not as trusted structured memory.

