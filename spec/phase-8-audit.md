# Phase 8 Audit

## Prompt memory boundary audit

The chat route still merges trusted and untrusted text into one prompt string:

- `apps/web/src/app/api/chat/route.ts` builds `mergedContext` from `body.context`, detected subject context, and recent session summary context.
- That merged string is then passed directly into `APOLLO_PROMPT`.
- `body.context` is therefore still accepted as raw prompt augmentation.

## Session summary boundary audit

The session-summary context is soft, but it is still untyped free-form text:

- `apps/web/src/lib/session-summaries.ts` returns a natural-language session summary block.
- The helper explicitly says `Use this as soft continuity context only.`
- There is no typed memory envelope, so the model cannot tell which parts are server-authored learner state versus descriptive prose.

## Misconception injection audit

Historical learner memory is still scoped too broadly:

- `apps/web/src/lib/chat-tools/index.ts` injects active misconceptions when the subject matches.
- The filter is subject-only, not `subject + topic`.
- The injected rows are the same `misconception` records used by chat tools and flashcard automation.
- Freshness and confidence gating are still minimal; active rows are injected as soon as the subject matches.

## Request trust audit

The dependency audit for `body.context` is still small, but the trust boundary is not hardened:

- I found no other `body.context` call sites in `apps/` or `packages/`.
- Because the route concatenates user text and server memory into one field, the model cannot distinguish user-supplied prompt augmentation from trusted memory.
- Topic-level leakage is still possible because historical misconceptions are not constrained to `subject + topic` before prompt injection.

Downstream assumption:

- Phase 8 should replace the raw string merge with typed server-generated memory blocks and scope historical misconceptions by `subject + topic` before they can enter hidden prompt memory.
