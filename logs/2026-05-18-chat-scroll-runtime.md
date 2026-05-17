# Chat Scroll Runtime

Tags: tests, structure, reliability, chat, ux

## What changed

Extracted the deterministic hook-only behavior out of
`apps/web/src/components/chat/use-chat-scroll.ts` into:

- `apps/web/src/components/chat/use-chat-scroll-runtime.ts`
- `apps/web/src/components/chat/use-chat-scroll-runtime.test.ts`

Covered behavior:

- applying computed scroll metrics to container CSS variables
- follow-if-needed gating for auto-scroll and streaming state
- initial layout state and latest-user reset state
- pinned latest-user message scheduling on stream start
- attaching/removing user-intent listeners
- auto-scroll toggling only on real user-intent scrolls

## Why it mattered

The pure chat-scroll model already had some coverage, but the hook-owned runtime
branches around listener wiring and scroll-state transitions had none. Those
branches directly affect whether the chat feels stable or jumpy during real use.

This pass makes that behavior more explicit and less dependent on the full hook
as a black box.

## Verification

- `node_modules/.bin/biome check apps/web/src/components/chat/use-chat-scroll-runtime.ts apps/web/src/components/chat/use-chat-scroll-runtime.test.ts apps/web/src/components/chat/use-chat-scroll.ts`
- `node_modules/.bin/vitest run src/components/chat/use-chat-scroll-runtime.test.ts src/components/chat/chat-scroll-model.test.ts --maxWorkers 1 --no-fileParallelism --reporter verbose`
- `node_modules/.bin/tsc -p apps/web/tsconfig.check.json --noEmit`
- `git diff --check`

## Remaining concerns

The hook is cleaner now, but it still owns the actual React lifecycle around
ResizeObserver attachment and effect cleanup sequencing. If chat-scroll keeps
causing product roughness, the next follow-up would be a small hook-level test
or another seam around observer lifecycle.
